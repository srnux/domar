import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api-client";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { hello: "world" }));

    await expect(api("/api/thing")).resolves.toEqual({ hello: "world" });
  });

  it("throws ApiError with status and message on failure", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, { message: "Insufficient role" }),
    );

    const err = await api("/api/thing").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Insufficient role");
  });

  it("on 401: refreshes once, then retries the original request", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401)) // original
      .mockResolvedValueOnce(jsonResponse(200, { ok: true })) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { data: 42 })); // retry

    await expect(api("/api/thing")).resolves.toEqual({ data: 42 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/refresh");
  });

  it("shares one refresh across concurrent 401s (single-flight)", async () => {
    let resolveRefresh!: (r: Response) => void;
    const refreshGate = new Promise<Response>((r) => (resolveRefresh = r));

    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/auth/refresh") return refreshGate;
      if (fetchMock.mock.calls.filter(([u]) => u !== "/api/auth/refresh").length <= 2) {
        return Promise.resolve(jsonResponse(401));
      }
      return Promise.resolve(jsonResponse(200, { ok: true }));
    });

    const [a, b] = [api("/api/a"), api("/api/b")];
    await new Promise((r) => setTimeout(r, 10));
    resolveRefresh(jsonResponse(200, { ok: true }));
    await Promise.all([a, b]);

    const refreshCalls = fetchMock.mock.calls.filter(
      ([u]) => u === "/api/auth/refresh",
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("sends FormData without forcing a JSON content type", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: "p1" }));
    const form = new FormData();
    form.append("kind", "BEFORE");

    await api("/api/jobs/1/photos", { method: "POST", body: form });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(
      (init.headers as Record<string, string>)["Content-Type"],
    ).toBeUndefined();
    expect(init.body).toBe(form);
  });

  it("does not try to refresh after a failed login", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: "Invalid credentials" }),
    );

    const err = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
    }).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws the original 401 when refresh also fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401)) // original
      .mockResolvedValueOnce(jsonResponse(401)); // refresh fails

    const err = await api("/api/thing").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
