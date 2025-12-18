import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import type { AuthUser } from "@/lib/definitions";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }
    const payload = verifyAccessToken(token);
    if (!payload || typeof payload === "string") {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    const user: AuthUser = {
      id: (payload as any).userId,
      email: (payload as any).email,
      role: (payload as any).role,
      name: (payload as any).name ?? null,
      phone: (payload as any).phone ?? null,
      avatarUrl: (payload as any).avatarUrl ?? null,
    };
    return NextResponse.json({ data: user });
  } catch (error: any) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
}
