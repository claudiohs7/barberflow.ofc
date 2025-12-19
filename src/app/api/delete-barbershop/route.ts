import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { deleteBarbershopFully } from "@/server/services/barbershop-deletion";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token de autorização ausente ou mal formatado." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();
    const payload = verifyAccessToken(token);
    if (!payload || typeof payload === "string") {
      return NextResponse.json({ success: false, message: "Token inválido ou expirado." }, { status: 401 });
    }

    if (payload.role !== "SUPERADMIN") {
      return NextResponse.json({ success: false, message: "Apenas Superadmins podem realizar esta ação." }, { status: 403 });
    }

    const { barbershopId, forceBitSafiraFailure } = await req.json();
    if (!barbershopId) {
      return NextResponse.json({ success: false, message: "O ID da barbearia é obrigatório." }, { status: 400 });
    }

    await deleteBarbershopFully(String(barbershopId), { forceBitSafiraFailure: Boolean(forceBitSafiraFailure) });
    console.log(`Barbearia com ID ${barbershopId} removida pelo Superadmin ${payload.userId}.`);

    return NextResponse.json({
      success: true,
      message: "Barbearia excluída com sucesso (dados + instância BitSafira, quando existir).",
    });
  } catch (error: any) {
    console.error("Erro na API de exclusão de barbearia:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno do servidor.", error: error.message },
      { status: 500 }
    );
  }
}
