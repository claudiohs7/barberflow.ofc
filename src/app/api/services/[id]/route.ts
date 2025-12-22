import { NextResponse } from "next/server";
import { updateService, deleteService } from "@/server/db/repositories/services";

type Params = { params: Promise<{ id?: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do servico e obrigatorio." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = await updateService(id, body);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("PATCH /api/services/:id error:", error);
    return NextResponse.json({ error: "Erro ao atualizar servico" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do servico e obrigatorio." }, { status: 400 });
  }

  try {
    await deleteService(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/services/:id error:", error);
    return NextResponse.json({ error: "Erro ao remover servico" }, { status: 500 });
  }
}
