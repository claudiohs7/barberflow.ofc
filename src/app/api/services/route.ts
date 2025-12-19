import { NextResponse } from "next/server";
import { createService, listServices } from "@/server/db/repositories/services";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barbershopId = searchParams.get("barbershopId");
    if (!barbershopId) {
      return NextResponse.json({ error: "barbershopId é obrigatório" }, { status: 400 });
    }
    const data = await listServices(barbershopId);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/services error:", error);
    return NextResponse.json({ error: "Erro ao listar serviços" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { barbershopId, ...payload } = body;
    if (!barbershopId) {
      return NextResponse.json({ error: "barbershopId é obrigatório" }, { status: 400 });
    }
    const created = await createService(barbershopId, payload);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/services error:", error);
    return NextResponse.json({ error: "Erro ao criar serviço" }, { status: 500 });
  }
}
