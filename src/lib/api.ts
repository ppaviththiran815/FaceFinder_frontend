export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "ff_token";
export const auth = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const headers = new Headers(init.headers);
  const token = auth.get();
  if (withAuth && token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }

  if (!res.ok) {
    let msg = res.statusText || "Something went wrong";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") msg = body.detail;
      else if (Array.isArray(body.detail)) msg = body.detail.map((d: { msg: string }) => d.msg).join(", ");
    } catch {}
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, withAuth = false) => request<T>(path, {}, withAuth),
  post: <T>(path: string, body?: unknown, withAuth = false) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, withAuth),
  upload: <T>(path: string, form: FormData, withAuth = false) =>
    request<T>(path, { method: "POST", body: form }, withAuth),
  del: <T>(path: string, withAuth = false) => request<T>(path, { method: "DELETE" }, withAuth),
};

// ---------- Types ----------
export type EventSummary = {
  id: string;
  name: string;
  event_date: string | null;
  access_code: string;
  allow_download: boolean;
  expires_at: string | null;
  photo_count?: number;
};

export type Stats = {
  pending: number;
  processing: number;
  done: number;
  failed: number;
  total: number;
  faces: number;
  searches: number;
};

export type OwnerPhoto = {
  id: string;
  name: string | null;
  status: "pending" | "processing" | "done" | "failed";
  face_count: number;
  thumb_url: string | null;
};

export type RemovalRequest = {
  id: string;
  photo_id: string | null;
  reason: string | null;
  thumb_url: string | null;
};

export type PublicEvent = {
  name: string;
  event_date: string | null;
  allow_download: boolean;
  photo_count: number;
};

export type FoundPhoto = { id: string; thumb_url: string; preview_url: string; distance: number };

export type SearchResult = {
  session_id: string;
  matches: FoundPhoto[];
  close: FoundPhoto[];
  allow_download: boolean;
};
