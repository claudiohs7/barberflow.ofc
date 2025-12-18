// src/app/api/reminders/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { processReminderQueueForBarbershop } from "@/server/reminders/run-reminders";

export async function POST(request: NextRequest) {
  try {
    const { barbershopId } = await request.json();
    if (!barbershopId) {
      return NextResponse.json({ error: "Barbearia nao encontrada" }, { status: 400 });
    }

    const result = await processReminderQueueForBarbershop(barbershopId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro ao processar lembretes:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar lembretes." },
      { status: 500 }
    );
  }
}
