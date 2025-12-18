import { NextResponse } from "next/server";
import {
  createBarbershop,
  listBarbershops,
  listBarbershopsByOwner,
} from "@/server/db/repositories/barbershops";

export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const ownerId = searchParams.get("ownerId");
    if (ownerId) {
      const data = await listBarbershopsByOwner(ownerId);
      return NextResponse.json({ data });
    }
    const data = await listBarbershops();
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/barbershops error:", error);
    return NextResponse.json({ error: "Erro ao listar barbearias" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await createBarbershop(body);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/barbershops error:", error);
    const message = error?.message || "Erro ao criar barbearia";
    const status = message.includes("CPF/CNPJ") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
