
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt';
import { deleteBarbershop } from '@/server/db/repositories/barbershops';

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Token de autorização ausente ou mal formatado.' },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();
    const payload = verifyAccessToken(token);
    if (!payload || typeof payload === 'string') {
      return NextResponse.json(
        { success: false, message: 'Token inválido ou expirado.' },
        { status: 401 }
      );
    }

    if (payload.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, message: 'Apenas Superadmins podem realizar esta ação.' },
        { status: 403 }
      );
    }

    const { barbershopId } = await req.json();
    if (!barbershopId) {
      return NextResponse.json(
        { success: false, message: 'O ID da barbearia é obrigatório.' },
        { status: 400 }
      );
    }

    await deleteBarbershop(barbershopId);
    console.log(`Barbearia com ID ${barbershopId} removida pelo Superadmin ${payload.userId}.`);
    return NextResponse.json({ success: true, message: 'Barbearia excluída do banco de dados com sucesso.' });
  } catch (error: any) {
    console.error('Erro na API de exclusão de barbearia:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor.', error: error.message },
      { status: 500 }
    );
  }
}
