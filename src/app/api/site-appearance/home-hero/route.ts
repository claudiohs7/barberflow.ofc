import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/jwt";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { buildHeroFileName, ensureDir, getExtFromMime, getSiteAssetsDir, safeFileName } from "@/lib/site-assets";
import { getSiteAppearance, upsertSiteAppearance } from "@/server/db/repositories/site-appearance";

export const dynamic = "force-dynamic";

function getAuthPayload(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const payload = verifyAccessToken(token);
  if (!payload || typeof payload === "string") return null;
  return payload as any;
}

function requireSuperAdmin(req: Request) {
  const payload = getAuthPayload(req);
  const email = (payload?.email as string | undefined)?.toLowerCase() ?? null;
  const ok = payload?.role === "SUPERADMIN" || (email ? isSuperAdminEmail(email) : false);
  return { ok, payload };
}

function normalizeVariant(value: unknown): "desktop" | "mobile" | null {
  const v = String(value || "").toLowerCase();
  if (v === "desktop") return "desktop";
  if (v === "mobile") return "mobile";
  return null;
}

async function saveUpload(file: File, variant: "desktop" | "mobile") {
  const ext = getExtFromMime(file.type);
  if (!ext) {
    throw new Error("Formato inválido. Envie PNG, JPG ou WEBP.");
  }

  const size = (file as any)?.size ?? 0;
  const maxBytes = 15 * 1024 * 1024;
  if (size > maxBytes) {
    throw new Error("Imagem muito grande. Máximo: 15MB.");
  }

  const siteDir = getSiteAssetsDir();
  await ensureDir(siteDir);

  const baseName = buildHeroFileName(variant, ext);
  const fileName = safeFileName(baseName);
  const absPath = path.join(siteDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absPath, buffer);

  // Store as relative path so we can resolve in any environment
  const relativePath = path.posix.join("uploads", "site", fileName);
  return relativePath;
}

async function tryDeleteOld(relativePath?: string | null) {
  if (!relativePath) return;
  const abs = path.join(process.cwd(), relativePath.replace(/\//g, path.sep));
  try {
    await fs.unlink(abs);
  } catch {
    // ignore
  }
}

export async function GET(req: NextRequest) {
  const { ok } = requireSuperAdmin(req);
  if (!ok) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const current = await getSiteAppearance();
  return NextResponse.json({
    data: {
      homeHeroDesktopPath: current?.homeHeroDesktopPath ?? null,
      homeHeroMobilePath: current?.homeHeroMobilePath ?? null,
      updatedAt: current?.updatedAt?.toISOString?.() ?? null,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { ok } = requireSuperAdmin(req);
    if (!ok) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const form = await req.formData();

    // Accept either both files, or a single one with a "variant"
    const desktopFile = form.get("desktop");
    const mobileFile = form.get("mobile");
    const singleFile = form.get("file");
    const variant = normalizeVariant(form.get("variant"));

    const current = await getSiteAppearance();
    let nextDesktopPath = current?.homeHeroDesktopPath ?? null;
    let nextMobilePath = current?.homeHeroMobilePath ?? null;

    if (desktopFile && desktopFile instanceof File) {
      const saved = await saveUpload(desktopFile, "desktop");
      await tryDeleteOld(current?.homeHeroDesktopPath);
      nextDesktopPath = saved;
    }

    if (mobileFile && mobileFile instanceof File) {
      const saved = await saveUpload(mobileFile, "mobile");
      await tryDeleteOld(current?.homeHeroMobilePath);
      nextMobilePath = saved;
    }

    if (singleFile && singleFile instanceof File) {
      if (!variant) {
        return NextResponse.json({ error: "Informe o variant: desktop ou mobile." }, { status: 400 });
      }
      const saved = await saveUpload(singleFile, variant);
      if (variant === "desktop") {
        await tryDeleteOld(current?.homeHeroDesktopPath);
        nextDesktopPath = saved;
      } else {
        await tryDeleteOld(current?.homeHeroMobilePath);
        nextMobilePath = saved;
      }
    }

    if (
      !(desktopFile instanceof File) &&
      !(mobileFile instanceof File) &&
      !(singleFile instanceof File)
    ) {
      return NextResponse.json(
        { error: "Envie pelo menos uma imagem (desktop e/ou mobile)." },
        { status: 400 },
      );
    }

    const updated = await upsertSiteAppearance({
      homeHeroDesktopPath: nextDesktopPath,
      homeHeroMobilePath: nextMobilePath,
    });

    return NextResponse.json({
      data: {
        homeHeroDesktopPath: updated.homeHeroDesktopPath ?? null,
        homeHeroMobilePath: updated.homeHeroMobilePath ?? null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("POST /api/site-appearance/home-hero error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao salvar imagem" }, { status: 500 });
  }
}
