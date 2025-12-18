export const ACCESS_TOKEN_KEY = "barberflow_access_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as any;
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();
  return null;
}

export async function fetchJson<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "omit",
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        const data = await res.json();
        const message = extractErrorMessage(data);
        throw new Error(message || res.statusText || "Falha na requisição.");
      } catch (e: any) {
        if (e instanceof Error && e.message) throw e;
      }
    }

    const text = await res.text();
    throw new Error(text.trim() || res.statusText || "Falha na requisição.");
  }

  return res.json() as Promise<T>;
}

