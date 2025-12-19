import { NextRequest, NextResponse } from "next/server";
import { listReminderQueueEntries } from "@/server/db/repositories/whatsapp-queue";
import { getAppointmentsByIds } from "@/server/db/repositories/appointments";
import { syncReminderQueueForBarbershop } from "@/server/reminders/reminder-queue";

export async function GET(request: NextRequest) {
  const barbershopId = request.nextUrl.searchParams.get("barbershopId");
  const statusParam = request.nextUrl.searchParams.get("status");
  const shouldSync = request.nextUrl.searchParams.get("sync") === "1";
  const status = statusParam && statusParam !== "all" ? statusParam : undefined;

  if (!barbershopId) {
    return NextResponse.json({ data: [], error: "barbershopId e obrigatorio." }, { status: 400 });
  }

  try {
    if (shouldSync) {
      try {
        await syncReminderQueueForBarbershop(barbershopId);
      } catch (syncError) {
        console.warn("Falha ao sincronizar fila:", syncError);
      }
    }
    const queueEntries = await listReminderQueueEntries(barbershopId, status as any);
    const appointmentIds = Array.from(new Set(queueEntries.map((entry) => entry.appointmentId))).filter(
      (id): id is string => Boolean(id)
    );
    const appointments = await getAppointmentsByIds(appointmentIds);
    const appointmentMap = new Map(appointments.map((appt) => [appt.id, appt]));

    const data = queueEntries.map((entry) => {
      const appt = appointmentMap.get(entry.appointmentId);
      return {
        id: entry.id,
        appointmentId: entry.appointmentId,
        templateType: entry.templateType,
        scheduledFor: entry.scheduledFor,
        status: entry.status,
        attempts: entry.attempts,
        lastError: entry.lastError ?? null,
        clientName: appt?.clientName || "",
        clientPhone: appt?.clientPhone || "",
        appointmentStart: appt?.startTime || null,
      };
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Erro ao listar fila de lembretes:", error);
    return NextResponse.json(
      { data: [], error: error?.message || "Erro ao listar fila de lembretes." },
      { status: 200 }
    );
  }
}
