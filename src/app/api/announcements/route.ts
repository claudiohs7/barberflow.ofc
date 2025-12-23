import { NextResponse } from "next/server";
import { createAnnouncement, listAnnouncements } from "@/server/db/repositories/announcements";
import { verifyAccessToken } from "@/lib/jwt";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    let limit = 10;
    if (limitParam === "all") {
      limit = 0;
    } else if (limitParam) {
      const parsed = Number(limitParam);
      if (Number.isFinite(parsed)) {
        limit = Math.max(1, Math.min(100, parsed));
      }
    }
    const data = await listAnnouncements(limit);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json({ error: "Erro ao listar avisos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Token de autorizacao ausente." }, { status: 401 });
    }

    const token = authorization.slice(7).trim();
    const payload = verifyAccessToken(token);
    if (!payload || typeof payload === "string") {
      return NextResponse.json({ error: "Token invalido ou expirado." }, { status: 401 });
    }

    if ((payload as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Apenas Super Admin pode enviar avisos globais." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Conteudo e obrigatorio" }, { status: 400 });
    }

    const created = await createAnnouncement({
      title: body.title,
      content: body.content,
      createdByUserId: (payload as any).userId,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json({ error: "Erro ao criar aviso" }, { status: 500 });
  }
}

