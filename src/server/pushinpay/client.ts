const DEFAULT_BASE_URL = process.env.PUSHIN_PAY_BASE_URL || "https://api-sandbox.pushinpay.com.br/api";

type PushinPixResponse = {
  id: string;
  qr_code: string;
  status: "created" | "paid" | "canceled" | string;
  value: number;
  webhook_url?: string | null;
  qr_code_base64?: string | null;
  webhook?: unknown;
  split_rules?: unknown[];
  end_to_end_id?: unknown;
  payer_name?: unknown;
  payer_national_registration?: unknown;
};

function buildBaseUrl() {
  return DEFAULT_BASE_URL.replace(/\/+$/, "");
}

function getAuthToken() {
  const token = process.env.PUSHIN_PAY_TOKEN;
  if (!token) {
    throw new Error("PUSHIN_PAY_TOKEN nao configurado. Defina no .env.");
  }
  return token.trim();
}

async function pushinFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = getAuthToken();
  const url = `${buildBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";
  const parseBody = contentType.includes("application/json") ? res.json() : res.text();
  const data = (await parseBody) as any;

  if (!res.ok) {
    const message =
      (typeof data === "object" && data?.message) ||
      (typeof data === "string" && data) ||
      res.statusText ||
      "Falha na requisiÃ§Ã£o Pushin Pay";
    throw new Error(message);
  }

  return data as T;
}

export async function createPixCharge(input: {
  valueInCents: number;
  webhookUrl?: string;
  splitRules?: unknown[];
}): Promise<PushinPixResponse> {
  const body = {
    value: input.valueInCents,
    webhook_url: input.webhookUrl,
    split_rules: input.splitRules || [],
  };

  return pushinFetch<PushinPixResponse>("/pix/cashIn", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getTransactionStatus(id: string): Promise<PushinPixResponse> {
  if (!id) {
    throw new Error("transactionId ausente.");
  }
  const encodedId = encodeURIComponent(id);
  const paths = [
    `/transaction/${encodedId}`,
    `/transactions/${encodedId}`, // alguns ambientes usam plural
    `/pix/transaction/${encodedId}`,
    `/pix/transactions/${encodedId}`,
  ];

  let lastError: any;
  for (const path of paths) {
    try {
      return await pushinFetch<PushinPixResponse>(path, { method: "GET" });
    } catch (error: any) {
      lastError = error;
      const msg = (error?.message || "").toLowerCase();
      if (!msg.includes("not found") && !msg.includes("could not be found") && !msg.includes("404")) {
        throw error;
      }
      // se 404, tenta o próximo path da lista
    }
  }

  throw lastError || new Error("Não foi possível consultar a transação PIX.");
}

export type { PushinPixResponse };
