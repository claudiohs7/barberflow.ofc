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
export function extractBitSafiraStatus(payload?: { status?: string; conexao?: { status?: string } }) {
  if (!payload) return undefined;
  return payload.status ?? payload.conexao?.status;
}

export function normalizeQrCodeBase64(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(",");
  if (commaIndex >= 0) {
    return trimmed.slice(commaIndex + 1);
  }

  return trimmed;
}
