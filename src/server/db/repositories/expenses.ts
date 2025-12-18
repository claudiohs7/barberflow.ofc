import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import prisma from "../client";
import type { Expense } from "@/lib/definitions";

type ExpenseInput = Omit<Expense, "id">;
type ExpenseUpdateInput = Partial<ExpenseInput>;

function toDomain(model: Prisma.ExpenseGetPayload<{}>): Expense {
  return {
    id: model.id,
    barbershopId: model.barbershopId,
    description: model.description ?? "",
    category: (model.category as Expense["category"]) || "Outros",
    type: (model.expenseType as Expense["type"]) || "Variável",
    amount: Number(model.amount),
    date: model.expenseDate,
  };
}

export async function listExpenses(barbershopId: string) {
  const data = await prisma.expense.findMany({
    where: { barbershopId },
    orderBy: { expenseDate: "desc" },
  });
  return data.map(toDomain);
}

export async function createExpense(input: ExpenseInput) {
  const created = await prisma.expense.create({
    data: {
      id: randomUUID(),
      barbershopId: input.barbershopId,
      description: input.description,
      category: input.category,
      expenseType: input.type,
      amount: new Prisma.Decimal(input.amount),
      expenseDate: input.date,
      title: input.description,
    },
  });
  return toDomain(created);
}

export async function updateExpense(id: string, input: ExpenseUpdateInput) {
  const updated = await prisma.expense.update({
    where: { id },
    data: {
      description: input.description,
      title: input.description,
      category: input.category,
      expenseType: input.type,
      amount: input.amount !== undefined ? new Prisma.Decimal(input.amount) : undefined,
      expenseDate: input.date,
    },
  });
  return toDomain(updated);
}

export async function deleteExpense(id: string) {
  await prisma.expense.delete({ where: { id } });
}
