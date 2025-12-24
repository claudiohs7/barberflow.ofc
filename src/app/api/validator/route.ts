import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.invertexto.com/v1/validator";
const TOKEN = process.env.INVERTEXTO_TOKEN;

export async function GET(request: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "Token da API de validação não configurado." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawValue = searchParams.get("value") || "";
  const digits = rawValue.replace(/\D/g, "");
  const typeParam = searchParams.get("type");
  const type =
    typeParam ||
    (digits.length === 11 ? "cpf" : digits.length === 14 ? "cnpj" : null);

  if (!digits) {
    return NextResponse.json(
      { error: "Parâmetro 'value' é obrigatório." },
      { status: 400 }
    );
  }

  if (!type) {
    return NextResponse.json(
      { error: "Não foi possível determinar o tipo do documento." },
      { status: 400 }
    );
  }

  try {
    const url = `${API_BASE}?token=${encodeURIComponent(
      TOKEN
    )}&value=${encodeURIComponent(digits)}&type=${encodeURIComponent(type)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || "Falha ao validar documento." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao validar documento:", error);
    return NextResponse.json(
      { error: "Erro interno ao validar documento." },
      { status: 500 }
    );
  }
}
