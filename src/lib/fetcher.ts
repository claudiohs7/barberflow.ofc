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

function resolveUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string") return input;
  // Absolute URL already provided
  if (/^https?:\/\//i.test(input)) return input;

  const isBrowser = typeof window !== "undefined";
  const browserOrigin = isBrowser ? window.location.origin : "";
  const port = process.env.PORT ?? "3000";
  const fallbackHost = `http://localhost:${port}`;
  const base = browserOrigin || process.env.NEXT_PUBLIC_SITE_URL || fallbackHost;
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/^\/|\/$/g, "");
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedBasePath = basePath ? `/${basePath}` : "";
  const baseAlreadyHasPath = normalizedBasePath && normalizedBase.endsWith(normalizedBasePath);
  const normalizedPath = input.startsWith("/") ? input : `/${input}`;

  const finalBase = baseAlreadyHasPath ? normalizedBase : `${normalizedBase}${normalizedBasePath}`;
  return `${finalBase}${normalizedPath}`;
}

export async function fetchJson<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(resolveUrl(input), {
    ...init,
    headers,
    credentials: init.credentials ?? "omit",
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    if (contentType.includes("text/html")) {
      throw new Error(res.statusText || `Erro ${res.status}`);
    }

    if (contentType.includes("application/json")) {
      try {
        const data = await res.json();
        const message = extractErrorMessage(data);
        throw new Error(message || res.statusText || "Falha na requisicao.");
      } catch (e: any) {
        if (e instanceof Error && e.message) throw e;
      }
    }

    const textBody = await res.text();
    const stripped = textBody.replace(/<[^>]+>/g, "").trim();
    throw new Error(stripped || res.statusText || `Erro ${res.status}`);
  }

  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  return res.text() as unknown as T;
}
