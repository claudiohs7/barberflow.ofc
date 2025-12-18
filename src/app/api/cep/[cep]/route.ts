
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cep: string } }
) {
  const { cep } = params;

  if (!cep || !/^\d{8}$/.test(cep)) {
    return NextResponse.json({ error: 'CEP inválido.' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);

    if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json({ error: errorData.message || 'Falha ao buscar CEP no serviço BrasilAPI.' }, { status: response.status });
    }

    const data = await response.json();

    // BrasilAPI retorna um erro no corpo da resposta com status 404, então checamos a existência de `type`.
    if (data.type === 'service_error') {
         return NextResponse.json({ error: data.message || 'CEP não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Erro no proxy da API de CEP:", error);
    return NextResponse.json({ error: 'Erro interno no servidor ao processar a solicitação de CEP.' }, { status: 500 });
  }
}
