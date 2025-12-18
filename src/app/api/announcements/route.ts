import { NextResponse } from "next/server";
import { createAnnouncement, listAnnouncements } from "@/server/db/repositories/announcements";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(50, Number(limitParam))) : 5;
    const data = await listAnnouncements(limit);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json({ error: "Erro ao listar avisos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 });
    }
    const created = await createAnnouncement({
      title: body.title,
      content: body.content,
      createdByUserId: body.createdByUserId,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json({ error: "Erro ao criar aviso" }, { status: 500 });
  }
}
