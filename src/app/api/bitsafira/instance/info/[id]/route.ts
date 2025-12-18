// src/app/api/bitsafira/instance/info/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import type { GetInstanceInfoResponse } from "@/lib/bitsafira/types";
import { getBarbershopById, updateBarbershop } from "@/server/db/repositories/barbershops";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const instanceId = params.id;
    const barbershopId = request.nextUrl.searchParams.get("barbershopId");

    if (!instanceId || !barbershopId) {
      return NextResponse.json(
        { success: false, message: "ID da instancia e ID da barbearia sao obrigatorios." },
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

    const bitSafiraToken = barbershop.bitSafiraToken || process.env.BITSAFIRA_TOKEN;
    if (!bitSafiraToken) {
      return NextResponse.json({ success: false, message: "Token da BitSafira nao configurado." }, { status: 400 });
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);
    console.log(`Consultando informacoes da instancia ${instanceId} na BitSafira.`);

    const result: GetInstanceInfoResponse = await bitSafira.getInstanceInfo(instanceId);
    console.log("Resultado da consulta de instancia:", result);

    if (result.status === 200 && result.dados) {
      await updateBarbershop(barbershopId, {
        whatsappStatus: result.dados.status,
        qrCodeBase64: result.dados.qrCode || null,
      });
      return NextResponse.json({ success: true, data: result.dados }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, message: result.mensagem || "Falha ao obter informacoes da instancia." },
      { status: result.status || 500 },
    );
  } catch (error: any) {
    console.error("Erro na API /api/bitsafira/instance/info/[id]:", error);
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

