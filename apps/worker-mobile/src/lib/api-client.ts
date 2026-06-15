import { type AuthTokens, tokenStore } from "./token-store";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// The mobile app talks to the NestJS API cross-origin (no Next.js proxy), so
// the base URL is absolute and configured at build time. Auth uses Bearer
// tokens (the WebView has no shared cookie jar) instead of httpOnly cookies.
export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

const LOGIN_PATH = "/api/auth/login";
const REFRESH_PATH = "/api/auth/refresh";
const LOGOUT_PATH = "/api/auth/logout";
const AUTH_PATHS = [LOGIN_PATH, REFRESH_PATH];

function hasTokens(body: unknown): body is AuthTokens {
  return (
    !!body &&
    typeof (body as AuthTokens).accessToken === "string" &&
    typeof (body as AuthTokens).refreshToken === "string"
  );
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * All concurrent 401s share one refresh. Because the server rotates the refresh
 * token, the freshly-issued pair must be persisted atomically here — otherwise a
 * second in-flight refresh presents a consumed token and logs the user out.
 */
function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) return false;
    const res = await fetch(`${API_BASE}${REFRESH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client": "mobile" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data: unknown = await res.json().catch(() => null);
    if (!hasTokens(data)) return false;
    await tokenStore.set(data);
    return true;
  })()
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function toApiError(res: Response): Promise<ApiError> {
  let message = res.statusText || `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (typeof body?.message === "string") message = body.message;
    else if (Array.isArray(body?.message)) message = body.message.join(", ");
  } catch {
    // non-JSON error body — keep the fallback message
  }
  return new ApiError(res.status, message);
}

/**
 * Bearer-authenticated fetch against the API with single-flight token refresh
 * on 401. Returns the raw Response — used directly for binary (photos) and
 * wrapped by `api()` for JSON. Throws ApiError on a non-OK final response.
 */
export async function authedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  // Logout has no cookie to rely on, so the refresh token rides in the body.
  const body =
    path === LOGOUT_PATH
      ? JSON.stringify({ refreshToken: tokenStore.getRefresh() })
      : init?.body;

  const doFetch = () => {
    const access = tokenStore.getAccess();
    return fetch(`${API_BASE}${path}`, {
      credentials: "omit",
      ...init,
      body,
      headers: {
        "X-Client": "mobile",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !AUTH_PATHS.includes(path)) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await doFetch();
    } else {
      await tokenStore.clear();
      throw await toApiError(res);
    }
  }

  if (!res.ok) {
    throw await toApiError(res);
  }
  return res;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authedFetch(path, init);
  const data: unknown = await res.json();

  // Capture the token pair the API returns to mobile clients on login.
  if (path === LOGIN_PATH && hasTokens(data)) {
    await tokenStore.set(data);
  }
  if (path === LOGOUT_PATH) {
    await tokenStore.clear();
  }

  return data as T;
}
