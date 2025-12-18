import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { isSuperAdminEmail } from "@/lib/super-admin";
import {
  createTutorialVideo,
  extractYoutubeId,
  listAllTutorialVideos,
  listTutorialVideosForEmail,
} from "@/server/db/repositories/tutorials";

export const dynamic = "force-dynamic";

function getTokenFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  return authHeader.replace("Bearer ", "").trim();
}

function getAuthPayload(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyAccessToken(token);
  if (!payload || typeof payload === "string") return null;
  return payload as any;
}

export async function GET(req: NextRequest) {
  try {
    const payload = getAuthPayload(req);
    const email = (payload?.email as string | undefined)?.toLowerCase() ?? null;
    const isSuperAdmin = payload?.role === "SUPERADMIN" || (email ? isSuperAdminEmail(email) : false);

    const data = isSuperAdmin ? await listAllTutorialVideos() : await listTutorialVideosForEmail(email);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/tutorials error:", error);
    return NextResponse.json({ error: "Erro ao listar tutoriais" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getAuthPayload(req);
    const email = (payload?.email as string | undefined)?.toLowerCase() ?? null;
    const isSuperAdmin = payload?.role === "SUPERADMIN" || (email ? isSuperAdminEmail(email) : false);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const description = body?.description != null ? String(body.description) : null;
    const youtubeUrl = String(body?.youtubeUrl || "").trim();
    const targetEmail = body?.targetEmail != null ? String(body.targetEmail).trim().toLowerCase() : null;
    const enabled = body?.enabled === undefined ? true : Boolean(body.enabled);

    if (!title) return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
    if (!youtubeUrl) return NextResponse.json({ error: "Link do YouTube é obrigatório." }, { status: 400 });

    const youtubeId = extractYoutubeId(youtubeUrl);
    const created = await createTutorialVideo({
      title,
      description,
      youtubeUrl,
      youtubeId,
      targetEmail,
      enabled,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tutorials error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao criar tutorial" }, { status: 500 });
  }
}

