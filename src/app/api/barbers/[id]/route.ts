import { NextResponse } from "next/server";
import { updateBarber, deleteBarber } from "@/server/db/repositories/barbers";

type Params = { params: Promise<{ id?: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do barbeiro e obrigatorio." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updated = await updateBarber(id, body);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/barbers/:id error:", error);
    return NextResponse.json({ error: "Erro ao atualizar barbeiro" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do barbeiro e obrigatorio." }, { status: 400 });
  }

  try {
    await deleteBarber(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/barbers/:id error:", error);
    return NextResponse.json({ error: "Erro ao remover barbeiro" }, { status: 500 });
  }
}
