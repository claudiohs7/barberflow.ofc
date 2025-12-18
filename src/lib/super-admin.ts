export const SUPER_ADMIN_EMAILS = ["claudiohs@hotmail.com"];

export function isSuperAdminEmail(email?: string | null) {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return false;
  return SUPER_ADMIN_EMAILS.includes(normalized);
}

