
'use server';

import { NextRequest, NextResponse } from 'next/server';

// A inicialização do 'firebase-admin' foi removida para corrigir falhas de build.
// A atualização de e-mail agora deve ser tratada por uma Cloud Function segura
// ou diretamente no console do Firebase para garantir a segurança.

export async function POST(req: NextRequest) {
  try {
    // A lógica de verificação de token e atualização foi desativada temporariamente.
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, message: 'Token de autorização ausente ou mal formatado.' }, { status: 401 });
    }

    console.log("Tentativa de atualização de email (LOGIC DISABLED)");

    return NextResponse.json({ 
        success: false, 
        message: 'Funcionalidade de atualização de e-mail temporariamente desativada. Use a página de Configurações ou o Firebase Console.' 
    }, { status: 503 }); // 503 Service Unavailable

  } catch (error: any) {
    console.error("Error in updateUserAuthEmail API route:", error);
    return NextResponse.json({ success: false, message: 'Erro interno no servidor.', code: error.code }, { status: 500 });
  }
}
