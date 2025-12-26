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

const pendingRequests = new Map<string, Promise<any>>();
const recentCache = new Map<string, { ts: number; data: any }>();
const DEDUPE_WINDOW_MS = 3000;

const makeCacheKey = (input: RequestInfo | URL, init: RequestInit): string | null => {
  if (typeof input !== "string") return null;
  const method = (init.method || "GET").toUpperCase();
  if (method !== "GET") return null;
  return `${method}:${input}`;
};

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
  // Avoid prepending the base path when running on localhost (dev server has no base path)
  const isLocalBase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base);
  const shouldApplyBasePath = basePath && !isLocalBase;
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedBasePath = shouldApplyBasePath ? `/${basePath}` : "";
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

  const cacheKey = makeCacheKey(input, init);
  const now = Date.now();

  if (cacheKey) {
    const cached = recentCache.get(cacheKey);
    if (cached && now - cached.ts < DEDUPE_WINDOW_MS) {
      return structuredClone(cached.data) as T;
    }
    const inflight = pendingRequests.get(cacheKey);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const requestPromise = fetch(resolveUrl(input), {
      ...init,
      headers,
      credentials: init.credentials ?? "omit",
    })
    .then(async (res) => {
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
    })
    .then((data) => {
      if (cacheKey) {
        recentCache.set(cacheKey, { ts: Date.now(), data });
      }
      return data;
    })
    .finally(() => {
      if (cacheKey) {
        pendingRequests.delete(cacheKey);
      }
    });

  if (cacheKey) {
    pendingRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
}
