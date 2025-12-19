import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { extractYoutubeId, updateTutorialVideo, deleteTutorialVideo } from "@/server/db/repositories/tutorials";

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { ok } = requireSuperAdmin(req);
    if (!ok) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    const body = await req.json();
    const title = body?.title != null ? String(body.title).trim() : undefined;
    const description = body?.description != null ? String(body.description) : undefined;
    const youtubeUrl = body?.youtubeUrl != null ? String(body.youtubeUrl).trim() : undefined;
    const targetEmail = body?.targetEmail != null ? String(body.targetEmail).trim().toLowerCase() : undefined;
    const enabled = body?.enabled === undefined ? undefined : Boolean(body.enabled);

    const youtubeId = youtubeUrl ? extractYoutubeId(youtubeUrl) : undefined;
    const updated = await updateTutorialVideo(params.id, {
      title,
      description,
      youtubeUrl,
      youtubeId,
      targetEmail,
      enabled,
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/tutorials/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar tutorial" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { ok } = requireSuperAdmin(req);
    if (!ok) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

    await deleteTutorialVideo(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/tutorials/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao excluir tutorial" }, { status: 500 });
  }
}

