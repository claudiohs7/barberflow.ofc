import fs from "fs/promises";
import path from "path";

export type AssetVariant = "desktop" | "mobile";

export function getUploadsDir() {
  return process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(process.cwd(), "uploads");
}

export function getSiteAssetsDir() {
  return path.join(getUploadsDir(), "site");
}

export function getExtFromMime(mime: string) {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  return null;
}

export function getMimeFromExt(ext: string) {
  const e = (ext || "").toLowerCase();
  if (e === "png") return "image/png";
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "webp") return "image/webp";
  if (e === "svg") return "image/svg+xml";
  return "application/octet-stream";
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function buildHeroFileName(variant: AssetVariant, ext: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `home-hero-${variant}-${stamp}.${ext}`;
}

export function safeFileName(name: string) {
  return (name || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

