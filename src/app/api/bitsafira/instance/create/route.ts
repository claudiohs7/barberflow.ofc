// src/app/api/bitsafira/instance/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import type { CreateInstancePayload, CreateInstanceResponse } from "@/lib/bitsafira/types";
import { getBarbershopById, updateBarbershop } from "@/server/db/repositories/barbershops";
import { getUserById } from "@/server/db/repositories/users";

export async function POST(request: NextRequest) {
  try {
    const { barbershopId } = await request.json();

    if (!barbershopId) {
      return NextResponse.json(
        { success: false, message: "ID da barbearia e obrigatorio." },
        { status: 400 },
      );
    }

    const barbershop = await getBarbershopById(barbershopId);
    if (!barbershop) {
      return NextResponse.json(
        { success: false, message: `Barbearia com ID ${barbershopId} nao encontrada.` },
        { status: 404 },
      );
    }

    const ownerEmail = barbershop.ownerId ? (await getUserById(barbershop.ownerId))?.email : null;
    const loginEmail = barbershop.email || ownerEmail;

    const instanceDescription = loginEmail
      ? `${barbershop.name || "BarberFlow"}-${loginEmail}`
      : `${barbershop.name || "BarberFlow"}-${barbershop.id}`;

    const bitSafiraToken = barbershop.bitSafiraToken || process.env.BITSAFIRA_TOKEN;
    if (!bitSafiraToken) {
      return NextResponse.json({ success: false, message: "Token da BitSafira nao configurado." }, { status: 400 });
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.nextUrl.origin;
    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/bitsafira`;

    // 1ª tentativa: id vazio (comportamento usado em /api/bitsafira/connect)
    let createPayload: CreateInstancePayload = {
      id: "",
      descricao: instanceDescription,
      urlWebhook: webhookUrl,
      token: bitSafiraToken,
    };
    console.log("Payload para criar instancia:", createPayload);

    let createResult: CreateInstanceResponse = await bitSafira.createInstance(createPayload);
    console.log("Resultado da criacao da instancia:", createResult);

    // Fallback: algumas respostas da API retornam 400/406 mesmo com todos campos.
    // Tentamos sem o campo id para deixar a BitSafira gerar.
    if (createResult.status >= 400) {
      const fallbackPayload: CreateInstancePayload = {
        descricao: instanceDescription,
        urlWebhook: webhookUrl,
        token: bitSafiraToken,
      };
      console.log("Retry criando instancia sem ID fixo:", fallbackPayload);
      const retryResult = await bitSafira.createInstance(fallbackPayload);
      console.log("Resultado retry criacao instancia:", retryResult);
      if (retryResult.status < 400) {
        createResult = retryResult;
      }
    }

    if ((createResult.status === 200 || createResult.status === 201) && createResult.dados) {
      await updateBarbershop(barbershopId, {
        bitsafiraInstanceId: createResult.dados.id,
        whatsappStatus: "DISCONNECTED",
        qrCodeBase64: null,
      });

      return NextResponse.json(
        { success: true, message: "Instancia criada com sucesso.", data: createResult.dados },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: createResult.mensagem || createResult.message || "Falha ao criar instancia BitSafira.",
      },
      { status: createResult.status || 500 },
    );
  } catch (error: any) {
    console.error("Erro na API /api/bitsafira/instance/create:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno no servidor.",
        error: error.message || "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
