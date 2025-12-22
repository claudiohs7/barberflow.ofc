import { NextResponse } from "next/server";
import { addTicketResponse, listTicketResponses } from "@/server/db/repositories/tickets";

type Params = { params: Promise<{ id?: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do ticket e obrigatorio." }, { status: 400 });
  }

  try {
    const data = await listTicketResponses(id);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/tickets/:id/responses error:", error);
    return NextResponse.json({ error: "Erro ao listar respostas" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do ticket e obrigatorio." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const created = await addTicketResponse({ ...body, ticketId: id });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tickets/:id/responses error:", error);
    return NextResponse.json({ error: "Erro ao adicionar resposta" }, { status: 500 });
  }
}
