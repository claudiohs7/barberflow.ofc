// src/app/api/bitsafira/connect/route.ts
import { NextResponse } from 'next/server';
import { getBitSafiraApiClient } from '@/lib/bitsafira/api';
import { CreateInstancePayload, ConnectInstancePayload } from '@/lib/bitsafira/types';
import { mapBitSafiraStatus, extractBitSafiraStatus, normalizeQrCodeBase64 } from '@/lib/bitsafira/status';
import {
  getBarbershopById,
  updateBarbershop,
  listBarbershopsByOwner,
} from '@/server/db/repositories/barbershops';
import { getUserById } from '@/server/db/repositories/users';

export async function POST(request: Request) {
  try {
    const { barbershopId } = await request.json();

    if (!barbershopId) {
      return NextResponse.json({ message: 'ID da barbearia e obrigatorio.' }, { status: 400 });
    }

    let barbershop = await getBarbershopById(barbershopId);
    if (!barbershop) {
      const owned = await listBarbershopsByOwner(barbershopId);
      barbershop = owned?.[0] ?? null;
    }

    if (!barbershop) {
      console.error(`Barbearia com ID ${barbershopId} nao encontrada.`);
      return NextResponse.json({ message: `Barbearia com ID ${barbershopId} nao encontrada.` }, { status: 404 });
    }

    const bitSafiraToken = barbershop.bitSafiraToken || process.env.BITSAFIRA_TOKEN;
    if (!bitSafiraToken) {
      console.error('BITSAFIRA_TOKEN nao configurado para a barbearia ou no ambiente.');
      return NextResponse.json({ message: 'Token da BitSafira nao configurado.' }, { status: 500 });
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);
    const appUrl = (process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(request.url).origin).replace(/\/$/, "");
    const webhookUrl = `${appUrl}/api/webhooks/bitsafira`;
    const ownerEmail = barbershop.ownerId ? (await getUserById(barbershop.ownerId))?.email : null;
    const loginEmail = barbershop.email || ownerEmail;
    const instanceDescription = loginEmail
      ? `${barbershop.name || "BarberFlow"}-${loginEmail}`
      : `${barbershop.name || "BarberFlow"}-${barbershop.id}`;

    let instanceId = barbershop.bitsafiraInstanceId;
    let currentInstanceStatus = mapBitSafiraStatus(barbershop.whatsappStatus);
    let qrCodeBase64 = barbershop.qrCodeBase64 || null;
    let instanceMetadata: Record<string, any> | null = null;

    console.log(`[${barbershopId}] Iniciando conexao BitSafira. Instancia: ${instanceId || 'N/A'}, status: ${currentInstanceStatus}`);

    if (!instanceId) {
      const createPayload: CreateInstancePayload = {
        id: "",
        urlWebhook: webhookUrl,
        descricao: instanceDescription,
        token: bitSafiraToken,
      };
      console.log(`[${barbershopId}] Nenhuma instancia registrada. Criando nova instância. Payload:`, createPayload);
      const createResponse = await bitSafira.createInstance(createPayload);
      console.log(`[${barbershopId}] Resposta da criacao da instancia:`, createResponse);

      if ([200, 201].includes(createResponse.status) && createResponse.dados && createResponse.dados.id) {
        instanceId = createResponse.dados.id;
        instanceMetadata = createResponse.dados;
        console.log(`[${barbershopId}] Instancia criada com sucesso. ID: ${instanceId}`);
      } else {
        console.error(`[${barbershopId}] Falha ao criar instância BitSafira:`, createResponse.mensagem || createResponse.message);
        await updateBarbershop(barbershop.id, { whatsappStatus: 'ERROR' });
        return NextResponse.json({ message: 'Falha ao criar instancia BitSafira.' }, { status: 500 });
      }
    } else {
      try {
        const instanceInfoResponse = await bitSafira.getInstanceInfo(instanceId);
        if (instanceInfoResponse.status === 200 && instanceInfoResponse.dados) {
        const instanceInfo = instanceInfoResponse.dados;

        const currentDescription = (instanceInfo as any).descricao;
        if (typeof currentDescription !== "string" || currentDescription !== instanceDescription) {
          try {
            const updatePayload: CreateInstancePayload = {
              id: instanceId,
              urlWebhook: webhookUrl,
              descricao: instanceDescription,
              token: bitSafiraToken,
            };
            const updateResponse = await bitSafira.createInstance(updatePayload);
            console.log(`[${barbershopId}] Descricao da instancia atualizada:`, updateResponse);
          } catch (error: any) {
            console.warn(`[${barbershopId}] Nao foi possivel atualizar descricao da instancia:`, error?.message);
          }
        }

        const statusFromInfo = extractBitSafiraStatus(instanceInfo);
        const normalizedInfoStatus = mapBitSafiraStatus(statusFromInfo);
        console.log(`[${barbershopId}] Instancia ${instanceId} encontrada. Status: ${statusFromInfo} (normalizado: ${normalizedInfoStatus})`);
        currentInstanceStatus = normalizedInfoStatus;
        if (normalizedInfoStatus === 'CONNECTED') {
          qrCodeBase64 = null;
        }
        } else {
          console.warn(`[${barbershopId}] Instancia ${instanceId} nao encontrada (status ${instanceInfoResponse.status}). Tentaremos reconectar.`);
        }
      } catch (error: any) {
        console.error(`[${barbershopId}] Erro ao consultar instancia ${instanceId}:`, error.message);
      }
    }

    if (instanceId) {
      const connectPayload: ConnectInstancePayload = { id: instanceId };
      console.log(`[${barbershopId}] Conectando instancia BitSafira com ID ${instanceId} para obter QR.`);
      const connectResponse = await bitSafira.connectInstance(connectPayload);
      console.log(`[${barbershopId}] Resposta da conexao:`, connectResponse);

      if (connectResponse.status === 200 && connectResponse.dados) {
        const dados = connectResponse.dados;
        const statusFromConnect = extractBitSafiraStatus(dados) ?? currentInstanceStatus;
        const normalizedConnectStatus = mapBitSafiraStatus(statusFromConnect);
        console.log(`[${barbershopId}] Status retornado pela conexao: ${statusFromConnect} (normalizado: ${normalizedConnectStatus})`);
        currentInstanceStatus = normalizedConnectStatus;
        qrCodeBase64 = normalizeQrCodeBase64(dados.qrCode || dados.qr) ?? qrCodeBase64;
        if (normalizedConnectStatus === 'CONNECTED') {
          qrCodeBase64 = null;
        }
        instanceMetadata = { ...(instanceMetadata || {}), ...dados };
      } else {
        console.error(`[${barbershopId}] Falha ao conectar instancia ou obter QR Code:`, connectResponse.mensagem || connectResponse.message);
        currentInstanceStatus = 'ERROR';
        qrCodeBase64 = null;
      }

      await updateBarbershop(barbershop.id, {
        bitsafiraInstanceId: instanceId,
        whatsappStatus: currentInstanceStatus,
        qrCodeBase64: qrCodeBase64,
        bitsafiraInstanceData: instanceMetadata ?? undefined,
      });

      return NextResponse.json({
        message: 'Processo de conexao BitSafira concluido.',
        instanceId,
        whatsappStatus: currentInstanceStatus,
        qrCodeBase64,
      }, { status: 200 });
    }

    return NextResponse.json({ message: 'Nao foi possivel obter ou criar uma instancia BitSafira.' }, { status: 500 });
  } catch (error: any) {
    console.error('Erro na rota /api/bitsafira/connect:', error);
    return NextResponse.json({ message: 'Erro interno do servidor.', error: error.message }, { status: 500 });
  }
}
