import { NextResponse } from "next/server";
import { updateClient, deleteClient } from "@/server/db/repositories/clients";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const updated = await updateClient(params.id, body);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/clients/:id error:", error);
    return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await deleteClient(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/clients/:id error:", error);
    return NextResponse.json({ error: "Erro ao remover cliente" }, { status: 500 });
  }
}
