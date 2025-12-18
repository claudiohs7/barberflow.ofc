import { NextResponse } from "next/server";
import { listExpenses, createExpense } from "@/server/db/repositories/expenses";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barbershopId = searchParams.get("barbershopId");
    if (!barbershopId) {
      return NextResponse.json({ error: "barbershopId ? obrigat?rio" }, { status: 400 });
    }
    const data = await listExpenses(barbershopId);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json({ error: "Erro ao listar despesas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { barbershopId, description, category, type, amount, date } = body ?? {};

    if (!barbershopId) {
      return NextResponse.json({ error: "barbershopId ? obrigat?rio" }, { status: 400 });
    }

    if (!description || !category || !type || !amount || !date) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount)) {
      return NextResponse.json({ error: "Valor inválido para a despesa" }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Data inválida para a despesa" }, { status: 400 });
    }

    const created = await createExpense({
      barbershopId,
      description,
      category,
      type,
      amount: parsedAmount,
      date: parsedDate,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json({ error: "Erro ao criar despesa" }, { status: 500 });
  }
}
