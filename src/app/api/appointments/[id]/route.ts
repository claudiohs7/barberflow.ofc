import { NextResponse } from "next/server";
import { updateAppointment, deleteAppointment } from "@/server/db/repositories/appointments";
import { removeReminderQueueForAppointment, syncReminderQueueForAppointment } from "@/server/reminders/reminder-queue";

type Params = { params: Promise<{ id?: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do agendamento é obrigatório." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = await updateAppointment(id, {
      ...body,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    });
    try {
      await syncReminderQueueForAppointment(data);
    } catch (queueError) {
      console.warn("Falha ao atualizar lembrete do agendamento:", queueError);
    }
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("PATCH /api/appointments/:id error:", error);
    return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do agendamento é obrigatório." }, { status: 400 });
  }

  try {
    await deleteAppointment(id);
    try {
      await removeReminderQueueForAppointment(id);
    } catch (queueError) {
      console.warn("Falha ao remover lembrete do agendamento:", queueError);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/appointments/:id error:", error);
    return NextResponse.json({ error: "Erro ao remover agendamento" }, { status: 500 });
  }
}
