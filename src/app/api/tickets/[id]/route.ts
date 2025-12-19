import { NextResponse } from "next/server";
import { updateTicket, deleteTicket, listTicketResponses } from "@/server/db/repositories/tickets";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  try {
    const responses = await listTicketResponses(params.id);
    return NextResponse.json({ data: responses });
  } catch (error: any) {
    console.error("GET /api/tickets/:id error:", error);
    return NextResponse.json({ error: "Erro ao buscar ticket" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const updated = await updateTicket(params.id, body);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/tickets/:id error:", error);
    return NextResponse.json({ error: "Erro ao atualizar ticket" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await deleteTicket(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/tickets/:id error:", error);
    return NextResponse.json({ error: "Erro ao excluir ticket" }, { status: 500 });
  }
}
