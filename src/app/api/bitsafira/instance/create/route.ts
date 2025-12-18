// src/app/api/bitsafira/instance/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import type { CreateInstancePayload, CreateInstanceResponse } from "@/lib/bitsafira/types";
import { getBarbershopById, updateBarbershop } from "@/server/db/repositories/barbershops";

export async function POST(request: NextRequest) {
  try {
    const { barbershopId, description } = await request.json();

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

    const baseDescription = String(description ?? "").trim() || `Instancia BarberFlow - ${barbershop.name || barbershop.id}`;
    const emailTag = barbershop.email ? ` - ${barbershop.email}` : "";
    const finalDescription = `${baseDescription}${emailTag}`;

    const bitSafiraToken = barbershop.bitSafiraToken || process.env.BITSAFIRA_TOKEN;
    if (!bitSafiraToken) {
      return NextResponse.json({ success: false, message: "Token da BitSafira nao configurado." }, { status: 400 });
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/bitsafira/webhook`;

    const createPayload: CreateInstancePayload = {
      descricao: finalDescription,
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
