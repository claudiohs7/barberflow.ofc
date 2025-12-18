
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cnpj: string } }
) {
  const { cnpj } = params;

  if (!cnpj || !/^\d{14}$/.test(cnpj)) {
    return NextResponse.json({ error: 'CNPJ inválido. Deve conter 14 dígitos.' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);

    if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json({ error: errorData.message || 'Falha ao buscar CNPJ no serviço BrasilAPI.' }, { status: response.status });
    }

    const data = await response.json();

    if (data.type === 'service_error') {
         return NextResponse.json({ error: data.message || 'CNPJ não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Erro no proxy da API de CNPJ:", error);
    return NextResponse.json({ error: 'Erro interno no servidor ao processar a solicitação de CNPJ.' }, { status: 500 });
  }
}
