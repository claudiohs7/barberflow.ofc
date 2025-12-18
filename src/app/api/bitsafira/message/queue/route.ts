import { NextRequest, NextResponse } from "next/server";
import { getBarbershopById } from "@/server/db/repositories/barbershops";

export const dynamic = "force-dynamic";

type QueueStatus = "pending" | "sent";

export type QueueItem = {
  id: string;
  clientName: string;
  phone: string;
  templateName?: string;
  scheduledFor: string;
  status: QueueStatus;
};

async function fetchFromBitsafira(barbershopId: string): Promise<QueueItem[]> {
  // TODO: Integrar com a API real ou banco de fila.
  // Enquanto a integração não está pronta, devolvemos dados de exemplo para visualização.
  const now = new Date();
  const addMinutes = (m: number) => new Date(now.getTime() + m * 60000).toISOString();

  return [
    {
      id: "mock-pending-1",
      clientName: "Cliente Exemplo",
      phone: "5531999999999",
      templateName: "Lembrete Padrão",
      scheduledFor: addMinutes(240), // 4h
      status: "pending",
    },
    {
      id: "mock-sent-1",
      clientName: "Maria Silva",
      phone: "5531888888888",
      templateName: "Confirmação Padrão",
      scheduledFor: addMinutes(-30),
      status: "sent",
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const barbershopId = request.nextUrl.searchParams.get("barbershopId");
    if (!barbershopId) {
      return NextResponse.json({ success: false, message: "barbershopId é obrigatório" }, { status: 400 });
    }

    // Verifica se a barbearia existe (mock de segurança)
    const shop = await getBarbershopById(barbershopId);
    if (!shop) {
      return NextResponse.json({ success: false, message: "Barbearia não encontrada." }, { status: 404 });
    }

    const data = await fetchFromBitsafira(barbershopId);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET /api/bitsafira/message/queue error:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao obter fila de mensagens.", error: error?.message },
      { status: 500 }
    );
  }
}
