import { NextResponse } from "next/server";
import { createUser } from "@/server/db/repositories/users";
import type { UserRole } from "@/lib/definitions";

type RegisterBody = {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  role?: UserRole;
};

export async function POST(req: Request) {
  try {
    const body: RegisterBody = await req.json();
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
    }
    const email = body.email.trim().toLowerCase();
    const created = await createUser({
      email,
      password: body.password,
      name: body.name,
      phone: body.phone,
      role: body.role,
    });
    return NextResponse.json({ data: { id: created.id, email: created.email, name: created.name, role: created.role } }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ error: "Não foi possível cadastrar" }, { status: 500 });
  }
}
