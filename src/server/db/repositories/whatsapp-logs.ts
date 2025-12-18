import prisma from "../client";
import { addWhatsappLogs, listReminderLogs } from "@/server/reminders/log-store";

export type WhatsappMessageLogInput = {
  id?: string;
  barbershopId: string;
  appointmentId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  templateType?: string | null;
  status: "success" | "error" | "skipped";
  message: string;
  sentAt?: Date | string;
  details?: string | null;
};

export async function createWhatsappMessageLogs(entries: WhatsappMessageLogInput[]) {
  if (!entries.length) return;
  const fallbackToMemory = () => {
    addWhatsappLogs(
      entries.map((entry) => ({
        id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        barbershopId: entry.barbershopId,
        appointmentId: entry.appointmentId ?? null,
        clientName: entry.clientName ?? undefined,
        clientPhone: entry.clientPhone ?? undefined,
        templateType: entry.templateType ?? undefined,
        status: entry.status,
        message: entry.message,
        sentAt: (entry.sentAt ? new Date(entry.sentAt) : new Date()).toISOString(),
        details: entry.details ?? undefined,
      }))
    );
  };

  const logModel = (prisma as any).whatsappmessagelog;
  if (!logModel) {
    console.warn("Modelo whatsappmessagelog nao encontrado. Usando log em memoria.");
    fallbackToMemory();
    return;
  }

  const data = entries.map((entry) => ({
    ...(entry.id ? { id: entry.id } : {}),
    barbershopId: entry.barbershopId,
    appointmentId: entry.appointmentId ?? null,
    clientName: entry.clientName ?? null,
    clientPhone: entry.clientPhone ?? null,
    templateType: entry.templateType ?? null,
    status: entry.status,
    message: entry.message,
    sentAt: entry.sentAt ? new Date(entry.sentAt) : new Date(),
    details: entry.details ?? null,
  }));

  try {
    await logModel.createMany({ data });
  } catch (error) {
    console.warn("Falha ao gravar logs no banco. Usando log em memoria.", error);
    fallbackToMemory();
  }
}

export async function listWhatsappMessageLogs(barbershopId?: string) {
  const logModel = (prisma as any).whatsappmessagelog;
  if (!logModel) {
    return listReminderLogs(barbershopId);
  }
  try {
    return logModel.findMany({
      where: barbershopId ? { barbershopId } : undefined,
      orderBy: { sentAt: "desc" },
    });
  } catch (error) {
    console.warn("Falha ao ler logs do banco. Usando log em memoria.", error);
    return listReminderLogs(barbershopId);
  }
}
