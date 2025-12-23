import { WhatsAppStatus } from "@/lib/definitions";

const CONNECTED_STATUSES = new Set(["CONNECTED", "WORKING"]);
const SCAN_STATUSES = new Set(["AWAITING_SCAN", "SCAN_QR_CODE", "LOADING_QR", "SCAN_QRCODE"]);

/**
 * Normaliza o status retornado pela API do BitSafira para os estados usados no front-end.
 */
export function mapBitSafiraStatus(status?: string): WhatsAppStatus {
  if (!status) {
    return "DISCONNECTED";
  }

  const normalized = status.toUpperCase();

  if (CONNECTED_STATUSES.has(normalized)) {
    return "CONNECTED";
  }

  if (SCAN_STATUSES.has(normalized)) {
    return "AWAITING_SCAN";
  }

  if (normalized === "TIMEOUT") {
    return "TIMEOUT";
  }

  if (normalized === "ERROR") {
    return "ERROR";
  }

  if (normalized === "DISCONNECTED") {
    return "DISCONNECTED";
  }

  return "DISCONNECTED";
}

/**
 * Extrai o status reportado pelo BitSafira tentando cobrir os diferentes formatos de resposta.
 */
type MaybeStatusPayload = {
  status?: string;
  conexao?: { status?: string; instance?: { status?: string } };
  instance?: { status?: string };
};

export function extractBitSafiraStatus(payload?: MaybeStatusPayload) {
  if (!payload) return undefined;
  return payload.status ?? payload.conexao?.status ?? payload.conexao?.instance?.status ?? payload.instance?.status;
}

export function normalizeQrCodeBase64(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(",");
  if (commaIndex >= 0) {
    return trimmed.slice(commaIndex + 1);
  }

  return trimmed;
}

export function extractQrCode(payload: any): string | null | undefined {
  if (!payload) return null;
  const candidates = [
    payload.qrCode,
    payload.qrCodeBase64,
    payload.qr,
    payload.qrcode,
    payload.qr_code,
    payload.qrcodeBase64,
    payload.qr_base64,
    payload.conexao?.qrCode,
    payload.conexao?.qrCodeBase64,
    payload.conexao?.qr,
    payload.conexao?.qrcode,
    payload.conexao?.qr_code,
    payload.conexao?.qrcodeBase64,
    payload.conexao?.qr_base64,
    payload.conexao?.instance?.qrCode,
    payload.conexao?.instance?.qrCodeBase64,
    payload.conexao?.instance?.qr,
    payload.conexao?.instance?.qrcode,
    payload.conexao?.instance?.qr_code,
    payload.conexao?.instance?.qrcodeBase64,
    payload.conexao?.instance?.qr_base64,
    payload.instance?.qrCode,
    payload.instance?.qrCodeBase64,
    payload.instance?.qr,
    payload.instance?.qrcode,
    payload.instance?.qr_code,
    payload.instance?.qrcodeBase64,
    payload.instance?.qr_base64,
  ];

  const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  return normalizeQrCodeBase64(found);
}
