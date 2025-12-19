import { NextResponse } from "next/server";
import { createAppointment, listAppointments } from "@/server/db/repositories/appointments";
import { syncReminderQueueForAppointment } from "@/server/reminders/reminder-queue";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const barbershopId = searchParams.get("barbershopId");
    if (!barbershopId) {
      return NextResponse.json({ error: "barbershopId é obrigatório" }, { status: 400 });
    }
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const clientId = searchParams.get("clientId") || undefined;
    const barberId = searchParams.get("barberId") || undefined;
    const data = await listAppointments(
      barbershopId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      { clientId, barberId }
    );
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json({ error: "Erro ao listar agendamentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await createAppointment({
      barbershopId: body.barbershopId,
      barberId: body.barberId,
      clientId: body.clientId,
      clientName: body.clientName,
      clientPhone: body.clientPhone,
      serviceIds: body.serviceIds,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      status: body.status,
      totalDuration: body.totalDuration,
    });
    try {
      await syncReminderQueueForAppointment(created);
    } catch (queueError) {
      console.warn("Falha ao agendar lembrete para o novo agendamento:", queueError);
    }
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}
