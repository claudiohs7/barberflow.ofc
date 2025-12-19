// src/app/api/reminders/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listWhatsappMessageLogs } from "@/server/db/repositories/whatsapp-logs";

export async function GET(request: NextRequest) {
  const barbershopId = request.nextUrl.searchParams.get("barbershopId") || undefined;
  try {
    const logs = await listWhatsappMessageLogs(barbershopId);
    return NextResponse.json({ data: logs });
  } catch (error: any) {
    console.error("Erro ao listar logs do WhatsApp:", error);
    return NextResponse.json(
      {
        data: [],
        error: error?.message || "Erro ao listar logs do WhatsApp.",
      },
      { status: 200 }
    );
  }
}
