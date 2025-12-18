// src/app/api/bitsafira/instance/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import type { CreateInstancePayload, CreateInstanceResponse } from "@/lib/bitsafira/types";
import { getBarbershopById, updateBarbershop } from "@/server/db/repositories/barbershops";

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

    const instanceDescription = barbershop.email
      ? `${barbershop.name || "BarberFlow"}-${barbershop.email}`
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

    const createPayload: CreateInstancePayload = {
      descricao: instanceDescription,
      urlWebhook: webhookUrl,
    };
    console.log("Payload para criar instancia:", createPayload);

    const createResult: CreateInstanceResponse = await bitSafira.createInstance(createPayload);
    console.log("Resultado da criacao da instancia:", createResult);

    if (createResult.status === 200 && createResult.dados) {
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
      { success: false, message: createResult.mensagem || "Falha ao criar instancia BitSafira." },
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
