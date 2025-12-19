import { NextResponse } from "next/server";
import { listTickets, createTicket } from "@/server/db/repositories/tickets";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barbershopId = searchParams.get("barbershopId") || undefined;
    const data = await listTickets(barbershopId || undefined);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/tickets error:", error);
    return NextResponse.json({ error: "Erro ao listar tickets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await createTicket(body);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tickets error:", error);
    return NextResponse.json({ error: "Erro ao criar ticket" }, { status: 500 });
  }
}
