// src/app/api/bitsafira/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBitSafiraApiClient } from '@/lib/bitsafira/api';
import { AuthPayload, AuthResponse } from '@/lib/bitsafira/types';

export async function POST(request: NextRequest) {
  try {
    // Se a BitSafira exige um payload de autenticação (ex: email/senha ou apiKey)
    // const { email, password } = await request.json() as AuthPayload;
    // const payload: AuthPayload = { email, password };

    // Para este exemplo, assumimos que o token já está no .env ou Firestore
    const bitSafiraToken = process.env.BITSAFIRA_TOKEN; // Ou buscar do Firestore
    if (!bitSafiraToken) {
      return NextResponse.json(
        { success: false, message: 'Token da BitSafira não configurado.' },
        { status: 400 }
      );
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);

    // Se houver um endpoint de validação de token, você o chamaria aqui.
    // Por exemplo, chamar listInstances para verificar se o token é válido.
    const validationResult = await bitSafira.listInstances();
    if (validationResult.status === 200) {
      return NextResponse.json(
        { success: true, message: 'Token BitSafira válido.', data: validationResult.dados },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: validationResult.mensagem || 'Token BitSafira inválido ou expirado.' },
        { status: validationResult.status || 401 }
      );
    }

  } catch (error: any) {
    console.error('Erro na API /api/bitsafira/auth:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor.', error: error.message || 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}
