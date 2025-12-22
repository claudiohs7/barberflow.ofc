import { NextResponse } from "next/server";
import { updateTicket, deleteTicket, listTicketResponses } from "@/server/db/repositories/tickets";

type Params = { params: Promise<{ id?: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do ticket e obrigatorio." }, { status: 400 });
  }

  try {
    const responses = await listTicketResponses(id);
    return NextResponse.json({ data: responses });
  } catch (error: any) {
    console.error("GET /api/tickets/:id error:", error);
    return NextResponse.json({ error: "Erro ao buscar ticket" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do ticket e obrigatorio." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updated = await updateTicket(id, body);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/tickets/:id error:", error);
    return NextResponse.json({ error: "Erro ao atualizar ticket" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do ticket e obrigatorio." }, { status: 400 });
  }

  try {
    await deleteTicket(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/tickets/:id error:", error);
    return NextResponse.json({ error: "Erro ao excluir ticket" }, { status: 500 });
  }
}
