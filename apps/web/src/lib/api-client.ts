export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const AUTH_PATHS = ["/api/auth/login", "/api/auth/refresh"];

let refreshInFlight: Promise<boolean> | null = null;

/** All concurrent 401s wait on the same refresh request. */
function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
  })
    .then((res) => res.ok)
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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = () =>
    fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        ...(init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...init?.headers,
      },
    });

  let res = await doFetch();

  if (res.status === 401 && !AUTH_PATHS.includes(path)) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await doFetch();
    } else {
      throw await toApiError(res);
    }
  }

  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<T>;
}
