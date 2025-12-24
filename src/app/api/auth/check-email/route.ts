import { NextResponse } from "next/server";
import { findBarbershopByEmail } from "@/server/db/repositories/barbershops";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Parâmetro 'email' é obrigatório." }, { status: 400 });
  }

  try {
    const shop = await findBarbershopByEmail(email);
    return NextResponse.json({ exists: !!shop });
  } catch (error) {
    console.error("GET /api/auth/check-email error:", error);
    return NextResponse.json({ error: "Não foi possível verificar o e-mail." }, { status: 500 });
  }
}
