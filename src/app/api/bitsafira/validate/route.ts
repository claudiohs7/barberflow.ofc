// src/app/api/bitsafira/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBitSafiraApiClient } from '@/lib/bitsafira/api';
import { GetInstanceInfoResponse } from '@/lib/bitsafira/types';
import { getBarbershopById, updateBarbershop } from '@/server/db/repositories/barbershops';
import {
  mapBitSafiraStatus,
  extractBitSafiraStatus,
  normalizeQrCodeBase64,
} from '@/lib/bitsafira/status';

export async function POST(request: NextRequest) {
  try {
    const { barbershopId } = await request.json();

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
    const bitsafiraInstanceId = barbershop.bitsafiraInstanceId || process.env.BITSAFIRA_INSTANCE_ID;

    if (!bitSafiraToken || !bitsafiraInstanceId) {
      return NextResponse.json(
        { success: false, message: 'Token ou ID da instância BitSafira não configurados.' },
        { status: 400 }
      );
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);
    console.log(`Validando instância ${bitsafiraInstanceId} na BitSafira.`);

    const result: GetInstanceInfoResponse = await bitSafira.getInstanceInfo(bitsafiraInstanceId);
    console.log('Resultado da validação de instância:', result);

    if (result.status === 200 && result.dados) {
      const statusFromApi = extractBitSafiraStatus(result.dados);
      const normalizedStatus = mapBitSafiraStatus(statusFromApi);
      const qrCodeValue = normalizeQrCodeBase64(result.dados.qrCode || result.dados.qr);
      const hasStatusChanged = barbershop.whatsappStatus !== normalizedStatus;
      const hasQrChanged = (qrCodeValue ?? null) !== (barbershop.qrCodeBase64 ?? null);

      if (hasStatusChanged || hasQrChanged) {
        await updateBarbershop(barbershopId, {
          whatsappStatus: normalizedStatus,
          qrCodeBase64: qrCodeValue ?? null,
        });
      }

      const isConnected = normalizedStatus === 'CONNECTED';

      return NextResponse.json(
        {
          success: true,
          message: `Instância está ${isConnected ? 'conectada' : 'desconectada'}.`,
          status: normalizedStatus,
          rawStatus: statusFromApi,
          isValid: isConnected,
          data: {
            ...result.dados,
            status: normalizedStatus,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: result.mensagem || 'Falha ao validar instância.' },
      { status: result.status || 500 }
    );

  } catch (error: any) {
    console.error('Erro na API /api/bitsafira/validate:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor.', error: error.message || 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}
