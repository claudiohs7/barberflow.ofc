import { NextResponse } from "next/server";
import { updateExpense, deleteExpense } from "@/server/db/repositories/expenses";

type Params = { params: { id: string } };

function parseAmount(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const digits = value.replace(/\D/g, "");
    if (!digits) return undefined;
    return Number(digits) / 100;
  }
  return undefined;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const { description, category, type, amount, date } = body ?? {};

    const parsedAmount = parseAmount(amount);
    if (amount !== undefined && !Number.isFinite(parsedAmount ?? NaN)) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    const parsedDate = date ? new Date(date) : undefined;
    if (date !== undefined && parsedDate && Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }

    const updated = await updateExpense(params.id, {
      description,
      category,
      type,
      amount: parsedAmount,
      date: parsedDate,
    });
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/expenses/:id error:", error);
    return NextResponse.json({ error: "Erro ao atualizar despesa" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await deleteExpense(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/expenses/:id error:", error);
    return NextResponse.json({ error: "Erro ao remover despesa" }, { status: 500 });
  }
}
