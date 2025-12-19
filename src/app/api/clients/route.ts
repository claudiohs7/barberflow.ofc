import { NextResponse } from "next/server";
import { listClients, listClientsByUserId, createClient, findClientByPhoneAndName } from "@/server/db/repositories/clients";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (userId) {
      const data = await listClientsByUserId(userId);
      return NextResponse.json({ data });
    }
    const barbershopId = searchParams.get("barbershopId");
    if (!barbershopId) {
      return NextResponse.json({ error: "barbershopId é obrigatório" }, { status: 400 });
    }
    const data = await listClients(barbershopId);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ error: "Erro ao listar clientes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.barbershopId) {
      return NextResponse.json({ error: "barbershopId é obrigatório" }, { status: 400 });
    }
    const name = (body.name || "").trim();
    const phoneDigits = (body.phone || "").replace(/\D/g, "");
    if (!name || phoneDigits.length < 10) {
      return NextResponse.json({ error: "Nome e telefone válidos são obrigatórios" }, { status: 400 });
    }
    const existing = await findClientByPhoneAndName(body.barbershopId, phoneDigits, name);
    if (existing) {
      return NextResponse.json({ error: "Já existe um cliente com o mesmo nome e telefone." }, { status: 409 });
    }
    const created = await createClient({
      ...body,
      name,
      phone: phoneDigits,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
  }
}
