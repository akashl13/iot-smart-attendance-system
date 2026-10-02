export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parse(res: Response) {
  return res.json().catch(() => ({ success: false, message: "Unexpected server response." }));
}

/** Shared fetch + JSON parse so api() and apiRaw() stay in sync on headers and parsing. */
async function request(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await parse(res);
  return { res, data };
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const { res, data } = await request(path, init);
  if (res.status === 401 && typeof window !== "undefined" && !path.includes("/api/auth/login") && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
    window.location.href = "/login";
  }
  if (!res.ok || data.success === false) {
    throw new ApiError(data.message || "Request failed.", res.status);
  }
  return data as T;
}

export async function apiRaw(path: string, init?: RequestInit) {
  const { res, data } = await request(path, init);
  return { ok: res.ok, status: res.status, data };
}
