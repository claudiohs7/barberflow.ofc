import { NextResponse } from "next/server";
import { updateBarber, deleteBarber } from "@/server/db/repositories/barbers";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const updated = await updateBarber(params.id, body);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/barbers/:id error:", error);
    return NextResponse.json({ error: "Erro ao atualizar barbeiro" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await deleteBarber(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/barbers/:id error:", error);
    return NextResponse.json({ error: "Erro ao remover barbeiro" }, { status: 500 });
  }
}
