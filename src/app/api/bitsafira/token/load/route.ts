// src/app/api/bitsafira/token/load/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBarbershopById } from '@/server/db/repositories/barbershops';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const barbershopId = request.nextUrl.searchParams.get('barbershopId');

    if (!barbershopId) {
      return NextResponse.json(
        { success: false, message: 'ID da barbearia é obrigatório.' },
        { status: 400 }
      );
    }

    const barbershop = await getBarbershopById(barbershopId);
    if (!barbershop) {
      return NextResponse.json(
        { success: false, message: `Barbearia com ID ${barbershopId} não encontrada.` },
        { status: 404 }
      );
    }

    const bitSafiraToken = barbershop.bitSafiraToken || process.env.BITSAFIRA_TOKEN;

    if (!bitSafiraToken) {
      return NextResponse.json(
        { success: false, message: 'Token da BitSafira não configurado.' },
        { status: 400 }
      );
    }

    // Não retorne o token diretamente para o frontend por segurança!
    // Apenas confirme que ele existe ou retorne um status.
    return NextResponse.json(
      { success: true, message: 'Token BitSafira carregado com sucesso.' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Erro na API /api/bitsafira/token/load:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor.', error: error.message || 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}
