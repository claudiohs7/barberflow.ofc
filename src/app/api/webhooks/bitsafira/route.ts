'use server';

import { NextRequest, NextResponse } from 'next/server';
import {
  findBarbershopByBitsafiraInstanceId,
  updateBarbershop,
} from '@/server/db/repositories/barbershops';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const instanceId = body?.instancia;
    const eventData = body?.dados;
    const eventType = body?.evento;

    console.log(
      `INFO: Webhook da BitSafira recebido para a instancia ${instanceId}. Evento: ${eventType}`
    );

    if (!instanceId || !eventType) {
      console.warn(
        'AVISO: Webhook recebido com payload invalido (faltando instancia ou evento).'
      );
      return NextResponse.json({ success: false, message: 'Payload invalido.' }, { status: 400 });
    }

    const barbershop = await findBarbershopByBitsafiraInstanceId(instanceId);
    if (!barbershop) {
      console.error(
        `ERRO: Nenhuma barbearia encontrada com o ID da instancia da BitSafira: ${instanceId}`
      );
      return NextResponse.json(
        { success: true, message: 'Instancia nao associada a nenhuma barbearia.' },
        { status: 200 }
      );
    }

    const updateData: Record<string, unknown> = {};

    switch (eventType) {
      case 'qrcode.updated': {
        console.log(`INFO: Evento 'qrcode.updated' para instancia ${instanceId}.`);
        const qrCodeBase64 = eventData?.qrCode || eventData?.qr;
        if (qrCodeBase64) {
          const cleanBase64 = qrCodeBase64.startsWith('data:image')
            ? qrCodeBase64.split(',')[1]
            : qrCodeBase64;
          updateData.qrCodeBase64 = cleanBase64;
          updateData.whatsappStatus = 'LOADING_QR';
        } else {
          console.warn(
            `AVISO: Evento 'qrcode.updated' recebido, mas nenhum QR Code encontrado no payload para a instancia ${instanceId}.`
          );
        }
        break;
      }
      case 'connection.updated': {
        console.log(
          `INFO: Evento 'connection.updated' para instancia ${instanceId}. Novo status: ${eventData?.state}`
        );
        if (eventData?.state === 'open') {
          updateData.whatsappStatus = 'CONNECTED';
          updateData.qrCodeBase64 = null;
        } else {
          updateData.whatsappStatus = 'DISCONNECTED';
        }
        break;
      }
      default:
        console.log(`INFO: Evento nao tratado recebido: ${eventType}`);
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await updateBarbershop(barbershop.id, updateData);
      console.log(
        `INFO: Barbearia ${barbershop.id} atualizada com:`,
        Object.keys(updateData)
      );
    }

    return NextResponse.json({ success: true, message: 'Webhook processado com sucesso.' });
  } catch (error: any) {
    console.error('ERRO ao processar webhook da BitSafira:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor.', error: error.message },
      { status: 500 }
    );
  }
}
