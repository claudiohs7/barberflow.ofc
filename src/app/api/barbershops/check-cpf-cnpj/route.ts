import { NextResponse } from "next/server";
import { existsBarbershopByCpfCnpj } from "@/server/db/repositories/barbershops";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const value = (searchParams.get("value") || "").trim();

  if (!value) {
    return NextResponse.json({ error: "Parâmetro 'value' é obrigatório." }, { status: 400 });
  }

  try {
    const exists = await existsBarbershopByCpfCnpj(value);
    return NextResponse.json({ exists });
  } catch (error) {
    console.error("GET /api/barbershops/check-cpf-cnpj error:", error);
    return NextResponse.json({ error: "Não foi possível verificar o CPF/CNPJ." }, { status: 500 });
  }
}
