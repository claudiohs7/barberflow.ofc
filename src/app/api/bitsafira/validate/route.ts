// src/app/api/bitsafira/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBitSafiraApiClient } from '@/lib/bitsafira/api';
import { CreateInstancePayload, GetInstanceInfoResponse } from '@/lib/bitsafira/types';
import { getBarbershopById, updateBarbershop } from '@/server/db/repositories/barbershops';
import { mapBitSafiraStatus, extractBitSafiraStatus, extractQrCode } from '@/lib/bitsafira/status';

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
      const desiredDescription = barbershop.email
        ? `${barbershop.name || 'BarberFlow'}-${barbershop.email}`
        : `${barbershop.name || 'BarberFlow'}-${barbershop.id}`;
      const currentDescription = (result.dados as any).descricao;

      if (typeof currentDescription !== 'string' || currentDescription !== desiredDescription) {
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            request.nextUrl.origin;
          const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/bitsafira`;

          const updatePayload: CreateInstancePayload = {
            id: bitsafiraInstanceId,
            descricao: desiredDescription,
            urlWebhook: webhookUrl,
            token: bitSafiraToken,
          };
          const updateResponse = await bitSafira.createInstance(updatePayload);
          console.log('Descricao da instancia atualizada:', updateResponse);
        } catch (error: any) {
          console.warn('Nao foi possivel atualizar descricao da instancia:', error?.message);
        }
      }

      const statusFromApi = extractBitSafiraStatus(result.dados);
      const normalizedStatus = mapBitSafiraStatus(statusFromApi);
      const qrCodeValue = extractQrCode(result.dados);
      const hasStatusChanged = barbershop.whatsappStatus !== normalizedStatus;
      const hasQrChanged = (qrCodeValue ?? null) !== (barbershop.qrCodeBase64 ?? null);
      const missingInstanceInDb = !barbershop.bitsafiraInstanceId && result.dados.id;

      if (hasStatusChanged || hasQrChanged || missingInstanceInDb) {
        await updateBarbershop(barbershopId, {
          whatsappStatus: normalizedStatus,
          qrCodeBase64: qrCodeValue ?? null,
          bitsafiraInstanceId: result.dados.id ?? barbershop.bitsafiraInstanceId,
          bitsafiraInstanceData: result.dados as any,
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
