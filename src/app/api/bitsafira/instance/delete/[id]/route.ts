// src/app/api/bitsafira/instance/delete/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import type { DeleteInstancePayload, DeleteInstanceResponse } from "@/lib/bitsafira/types";
import { getBarbershopById, updateBarbershop } from "@/server/db/repositories/barbershops";

type Params = { params: Promise<{ id?: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id: instanceId } = await params;
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
    console.log(`Tentando excluir instancia BitSafira com ID: ${instanceId}`);

    const deletePayload: DeleteInstancePayload = { id: instanceId };
    const deleteResult: DeleteInstanceResponse = await bitSafira.deleteInstance(deletePayload);
    console.log("Resultado da exclusao da instancia:", deleteResult);

    if (deleteResult.status === 200) {
      await updateBarbershop(barbershopId, {
        bitsafiraInstanceId: null,
        whatsappStatus: "DISCONNECTED",
        qrCodeBase64: null,
      });
      return NextResponse.json(
        { success: true, message: `Instancia ${instanceId} excluida com sucesso.` },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { success: false, message: deleteResult.mensagem || "Falha ao excluir instancia." },
      { status: deleteResult.status || 500 },
    );
  } catch (error: any) {
    console.error("Erro na API /api/bitsafira/instance/delete/[id]:", error);
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
