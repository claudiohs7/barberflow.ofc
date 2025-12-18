import { NextResponse } from "next/server";
import { removeReminderQueueEntryById } from "@/server/db/repositories/whatsapp-queue";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  if (!params?.id) {
    return NextResponse.json({ error: "ID e obrigatorio." }, { status: 400 });
  }

  try {
    await removeReminderQueueEntryById(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/reminders/queue/:id error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao cancelar o disparo." },
      { status: 500 }
    );
  }
}
