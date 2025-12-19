// src/app/api/bitsafira/message/send-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBitSafiraApiClient } from '@/lib/bitsafira/api';
import { SendMessagePayload, SendMessageResponse } from '@/lib/bitsafira/types';
import { getBarbershopById } from '@/server/db/repositories/barbershops';
import { createWhatsappMessageLogs } from '@/server/db/repositories/whatsapp-logs';

export async function POST(request: NextRequest) {
  try {
    const { barbershopId, number, message, clientName, messageType, appointmentId } = await request.json();
    console.log('--- Requisição POST recebida em /api/bitsafira/message/send-message ---');
    console.log(`Barbershop ID: ${barbershopId}, Número: ${number}, Mensagem: ${message.substring(0, 50)}...`);

    if (!barbershopId || !number || !message) {
      return NextResponse.json(
        { success: false, message: 'ID da barbearia, número e mensagem são obrigatórios.' },
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
    const cleanedNumber = number.replace(/\D/g, '');
    const normalizedNumber = cleanedNumber.startsWith('55')
      ? cleanedNumber
      : `55${cleanedNumber}`;

    const sendMessagePayload: SendMessagePayload = {
      idInstancia: bitsafiraInstanceId,
      whatsapp: normalizedNumber,
      texto: message,
      envioImediato: 1,
    };
    console.log('Payload para enviar mensagem:', JSON.stringify(sendMessagePayload, null, 2));

    const result: SendMessageResponse = await bitSafira.sendMessage(sendMessagePayload);
    console.log('Resultado do envio da mensagem (bitsafira.sendMessage):', result);

    const sentAt = new Date();

    if ([200, 201].includes(result.status) && result.dados) {
      try {
        await createWhatsappMessageLogs([
          {
            barbershopId,
            appointmentId: appointmentId ?? null,
            clientName: clientName || null,
            clientPhone: normalizedNumber,
            templateType: messageType || "Mensagem manual",
            status: "success",
            message,
            sentAt,
          },
        ]);
      } catch (logError) {
        console.warn("Falha ao registrar log do WhatsApp:", logError);
      }
      return NextResponse.json(
        { success: true, message: result.dados.mensagem, data: result.dados },
        { status: 200 }
      );
    } else {
      try {
        await createWhatsappMessageLogs([
          {
            barbershopId,
            appointmentId: appointmentId ?? null,
            clientName: clientName || null,
            clientPhone: normalizedNumber,
            templateType: messageType || "Mensagem manual",
            status: "error",
            message: result.mensagem || 'Falha ao enviar mensagem.',
            sentAt,
          },
        ]);
      } catch (logError) {
        console.warn("Falha ao registrar log do WhatsApp:", logError);
      }
      return NextResponse.json(
        { success: false, message: result.mensagem || 'Falha ao enviar mensagem.' },
        { status: result.status || 500 }
      );
    }

  } catch (error: any) {
    console.error('Erro na API /api/bitsafira/message/send-message:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor.', error: error.message || 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}
