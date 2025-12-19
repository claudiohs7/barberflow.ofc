
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ cep?: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { cep: cepParam } = await params;
  const cep = (cepParam || "").replace(/\D/g, "");

  if (!cep || cep.length !== 8) {
    return NextResponse.json({ error: "CEP invalido." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || "Falha ao buscar CEP no servico BrasilAPI." },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.type === "service_error") {
      return NextResponse.json({ error: data.message || "CEP nao encontrado." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro no proxy da API de CEP:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar a solicitacao de CEP." },
      { status: 500 }
    );
  }
}
