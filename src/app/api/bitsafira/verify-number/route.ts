// src/app/api/bitsafira/verify-number/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBitSafiraApiClient } from '@/lib/bitsafira/api';
import { VerifyNumberPayload, VerifyNumberResponse } from '@/lib/bitsafira/types';
import { getBarbershopById } from '@/server/db/repositories/barbershops';

export async function POST(request: NextRequest) {
  try {
    const { barbershopId, number } = await request.json();
    console.log(`--- Requisição POST recebida em /api/bitsafira/verify-number ---`);
    console.log(`Barbershop ID: ${barbershopId}, Número: ${number}`);

    if (!barbershopId || !number) {
      return NextResponse.json(
        { success: false, message: 'ID da barbearia e número são obrigatórios.' },
        { status: 400 }
      );
    }

    const barbershop = await getBarbershopById(barbershopId);
    if (!barbershop) {
      console.error(`Barbearia com ID ${barbershopId} não encontrada.`);
      return NextResponse.json(
        { success: false, message: `Barbearia com ID ${barbershopId} não encontrada.` },
        { status: 404 }
      );
    }
    const bitSafiraToken = barbershop.bitSafiraToken || process.env.BITSAFIRA_TOKEN;
    const bitsafiraInstanceId = barbershop.bitsafiraInstanceId || process.env.BITSAFIRA_INSTANCE_ID;

    if (!bitSafiraToken || !bitsafiraInstanceId) {
      console.error('Token BitSafira ou ID da instância não configurados para a barbearia.');
      return NextResponse.json(
        { success: false, message: 'Token BitSafira ou ID da instância não configurados.' },
        { status: 400 }
      );
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);
    console.log('Cliente BitSafira inicializado para verificar número.');

    const cleanedNumber = number.replace(/\D/g, ''); // Remove caracteres não numéricos

    const verifyNumberPayload: VerifyNumberPayload = {
      numero: cleanedNumber,
      idInstancia: bitsafiraInstanceId,
    };
    console.log('Payload para verificar número:', JSON.stringify(verifyNumberPayload, null, 2));

    const result: VerifyNumberResponse = await bitSafira.verifyNumber(verifyNumberPayload);
    console.log('Resultado verifyNumber:', result);

    if (result.status === 200 && result.dados) {
      return NextResponse.json(
        { success: true, data: result.dados },
        { status: 200 }
      );
    } else {
      console.error('Falha na verificação de número:', result.mensagem || result.message);
      return NextResponse.json(
        { success: false, message: result.mensagem || 'Falha na verificação de número.' },
        { status: result.status || 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro na API /api/bitsafira/verify-number:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor.', error: error.message || 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}
