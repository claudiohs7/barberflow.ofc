import { NextResponse } from "next/server";
import { updateService, deleteService } from "@/server/db/repositories/services";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const data = await updateService(params.id, body);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("PATCH /api/services/:id error:", error);
    return NextResponse.json({ error: "Erro ao atualizar serviço" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await deleteService(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/services/:id error:", error);
    return NextResponse.json({ error: "Erro ao remover serviço" }, { status: 500 });
  }
}
