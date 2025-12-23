import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { updateAnnouncement, deleteAnnouncement } from "@/server/db/repositories/announcements";

type Params = {
  params: Promise<{
    id?: string;
  }>;
};

function requireSuperAdmin(req: Request) {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Token de autorizacao ausente." }, { status: 401 });
  }

  const token = authorization.slice(7).trim();
  const payload = verifyAccessToken(token);
  if (!payload || typeof payload === "string") {
    return NextResponse.json({ error: "Token invalido ou expirado." }, { status: 401 });
  }

  if ((payload as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Apenas Super Admin pode gerenciar avisos." }, { status: 403 });
  }

  return payload as any;
}

export async function PATCH(req: Request, { params }: Params) {
  const authResult = requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do aviso nao informado." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const content = (body?.content || "").trim();
    if (!content) {
      return NextResponse.json({ error: "Conteudo e obrigatorio." }, { status: 400 });
    }

    const updated = await updateAnnouncement(id, content);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/announcements/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar aviso." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const authResult = requireSuperAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do aviso nao informado." }, { status: 400 });
  }

  try {
    await deleteAnnouncement(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/announcements/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao excluir aviso." }, { status: 500 });
  }
}
