import { NextResponse } from "next/server";
import { listBarbers, createBarber } from "@/server/db/repositories/barbers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barbershopId = searchParams.get("barbershopId");
    if (!barbershopId) {
      return NextResponse.json({ error: "barbershopId é obrigatório" }, { status: 400 });
    }
    const data = await listBarbers(barbershopId);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/barbers error:", error);
    return NextResponse.json({ error: "Erro ao listar barbeiros" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.barbershopId) {
      return NextResponse.json({ error: "barbershopId é obrigatório" }, { status: 400 });
    }
    const created = await createBarber(body);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/barbers error:", error);
    return NextResponse.json({ error: "Erro ao criar barbeiro" }, { status: 500 });
  }
}
