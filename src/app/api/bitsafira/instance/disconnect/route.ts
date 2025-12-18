// src/app/api/bitsafira/instance/disconnect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBitSafiraApiClient } from '@/lib/bitsafira/api';
import { DisconnectInstancePayload } from '@/lib/bitsafira/types';
import { getBarbershopById, updateBarbershop } from '@/server/db/repositories/barbershops';

export async function POST(request: NextRequest) {
  try {
    const { barbershopId } = await request.json();
    if (!barbershopId) {
      return NextResponse.json({ success: false, message: 'ID da barbearia é obrigatório.' }, { status: 400 });
    }

    const barbershop = await getBarbershopById(barbershopId);
    if (!barbershop) {
      return NextResponse.json({ success: false, message: `Barbearia com ID ${barbershopId} não encontrada.` }, { status: 404 });
    }

    const bitSafiraToken = barbershop.bitSafiraToken || process.env.BITSAFIRA_TOKEN;
    const bitsafiraInstanceId = barbershop.bitsafiraInstanceId;

    if (!bitSafiraToken || !bitsafiraInstanceId) {
      return NextResponse.json(
        { success: false, message: 'Token ou ID da instância BitSafira não configurados.' },
        { status: 400 }
      );
    }

    const apiClient = getBitSafiraApiClient(bitSafiraToken);
    const payload: DisconnectInstancePayload = { id: bitsafiraInstanceId };

    const response = await apiClient.disconnectInstance(payload);
    if (response.status === 200) {
      await updateBarbershop(barbershopId, {
        whatsappStatus: 'DISCONNECTED',
        qrCodeBase64: null,
      });
      return NextResponse.json({ success: true, message: response.mensagem || 'WhatsApp desconectado.' });
    }

    return NextResponse.json(
      { success: false, message: response.mensagem || response.message || 'Falha ao desconectar instância.' },
      { status: response.status || 500 }
    );
  } catch (error: any) {
    console.error('Erro na rota /api/bitsafira/instance/disconnect:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor.', error: error.message || 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}
