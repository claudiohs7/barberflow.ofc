import { NextRequest, NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/jwt";
import { deleteBitSafiraInstanceForBarbershop } from "@/server/services/barbershop-deletion";

export const dynamic = "force-dynamic";

function requireSuperAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return { ok: false as const, error: "Token ausente." };

  const payload = verifyAccessToken(token);
  if (!payload || typeof payload === "string") return { ok: false as const, error: "Token inválido ou expirado." };
  if ((payload as any).role !== "SUPERADMIN") return { ok: false as const, error: "Acesso negado." };

  return { ok: true as const };
}

type Params = { params: Promise<{ id?: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = requireSuperAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID da barbearia é obrigatório." }, { status: 400 });

    const result = await deleteBitSafiraInstanceForBarbershop(id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("DELETE /api/super-admin/barbershops/[id]/bitsafira-instance error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao excluir instância." }, { status: 500 });
  }
}
