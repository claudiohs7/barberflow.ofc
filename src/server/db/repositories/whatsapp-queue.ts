import prisma from "../client";
import {
  cancelReminderQueue,
  listDueReminderQueue,
  listReminderQueue,
  removeReminderQueue,
  removeReminderQueueById,
  updateReminderQueueStatus,
  upsertReminderQueue,
  type ReminderQueueStatus,
} from "@/server/reminders/queue-store";

export type WhatsappMessageQueueStatus = ReminderQueueStatus;

export type WhatsappMessageQueueEntry = {
  id: string;
  barbershopId: string;
  appointmentId: string;
  templateType: string;
  scheduledFor: Date;
  status: WhatsappMessageQueueStatus;
  attempts: number;
  lastError?: string | null;
  sentAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function getQueueModel() {
  return (prisma as any).whatsappmessagequeue;
}

export async function upsertReminderQueueEntry(input: {
  barbershopId: string;
  appointmentId: string;
  templateType: string;
  scheduledFor: Date;
  status?: WhatsappMessageQueueStatus;
}) {
  const queueModel = getQueueModel();
  if (!queueModel) {
    console.warn("Modelo whatsappmessagequeue nao encontrado. Usando fila em memoria.");
    upsertReminderQueue({ ...input, status: input.status ?? "pending", attempts: 0, lastError: null, sentAt: null });
    return;
  }

  try {
    const existing = await queueModel.findUnique({
      where: {
        appointmentId_templateType: {
          appointmentId: input.appointmentId,
          templateType: input.templateType,
        },
      },
    });

    if (existing?.status === "sent") {
      return;
    }

    if (existing?.status === "cancelled") {
      return;
    }

    if (existing) {
      await queueModel.update({
        where: { id: existing.id },
        data: {
          scheduledFor: input.scheduledFor,
          status: input.status ?? existing.status,
          attempts: existing.attempts,
          lastError: existing.lastError,
          sentAt: existing.sentAt,
        },
      });
      return;
    }

    await queueModel.create({
      data: {
        barbershopId: input.barbershopId,
        appointmentId: input.appointmentId,
        templateType: input.templateType,
        scheduledFor: input.scheduledFor,
        status: input.status ?? "pending",
        attempts: 0,
      },
    });
  } catch (error) {
    console.warn("Falha ao gravar fila no banco. Usando fila em memoria.", error);
    upsertReminderQueue({ ...input, status: input.status ?? "pending", attempts: 0, lastError: null, sentAt: null });
  }
}

export async function listDueReminderQueueEntries(barbershopId: string, dueBefore: Date) {
  const queueModel = getQueueModel();
  if (!queueModel) {
    return listDueReminderQueue(barbershopId, dueBefore);
  }
  try {
    return (await queueModel.findMany({
      where: {
        barbershopId,
        status: "pending",
        scheduledFor: { lte: dueBefore },
      },
      orderBy: { scheduledFor: "asc" },
    })) as WhatsappMessageQueueEntry[];
  } catch (error) {
    console.warn("Falha ao ler fila no banco. Usando fila em memoria.", error);
    return listDueReminderQueue(barbershopId, dueBefore);
  }
}

export async function listReminderQueueEntries(
  barbershopId: string,
  status?: WhatsappMessageQueueStatus
) {
  const queueModel = getQueueModel();
  if (!queueModel) {
    return listReminderQueue(barbershopId, status);
  }
  try {
    return (await queueModel.findMany({
      where: {
        barbershopId,
        ...(status ? { status } : {}),
      },
      orderBy: { scheduledFor: "asc" },
    })) as WhatsappMessageQueueEntry[];
  } catch (error) {
    console.warn("Falha ao ler fila no banco. Usando fila em memoria.", error);
    return listReminderQueue(barbershopId, status);
  }
}

export async function updateReminderQueueEntryStatus(input: {
  id: string;
  status: WhatsappMessageQueueStatus;
  attempts?: number;
  lastError?: string | null;
  sentAt?: Date | null;
}) {
  const queueModel = getQueueModel();
  if (!queueModel) {
    updateReminderQueueStatus(input.id, {
      status: input.status,
      attempts: input.attempts,
      lastError: input.lastError,
      sentAt: input.sentAt,
    });
    return;
  }
  try {
    await queueModel.update({
      where: { id: input.id },
      data: {
        status: input.status,
        attempts: input.attempts,
        lastError: input.lastError ?? null,
        sentAt: input.sentAt ?? null,
      },
    });
  } catch (error) {
    console.warn("Falha ao atualizar fila no banco. Usando fila em memoria.", error);
    updateReminderQueueStatus(input.id, {
      status: input.status,
      attempts: input.attempts,
      lastError: input.lastError,
      sentAt: input.sentAt,
    });
  }
}

export async function cancelReminderQueueEntry(input: {
  barbershopId: string;
  appointmentId: string;
  templateType: string;
  reason?: string;
}) {
  const queueModel = getQueueModel();
  if (!queueModel) {
    cancelReminderQueue(input.appointmentId, input.templateType, input.reason);
    return;
  }
  try {
    await queueModel.updateMany({
      where: {
        barbershopId: input.barbershopId,
        appointmentId: input.appointmentId,
        templateType: input.templateType,
      },
      data: {
        status: "cancelled",
        lastError: input.reason ?? null,
      },
    });
  } catch (error) {
    console.warn("Falha ao cancelar fila no banco. Usando fila em memoria.", error);
    cancelReminderQueue(input.appointmentId, input.templateType, input.reason);
  }
}

export async function removeReminderQueueEntry(input: {
  appointmentId: string;
  templateType?: string;
  reason?: string;
}) {
  const queueModel = getQueueModel();
  if (!queueModel) {
    removeReminderQueue(input.appointmentId, input.templateType);
    return;
  }
  try {
    await queueModel.updateMany({
      where: {
        appointmentId: input.appointmentId,
        ...(input.templateType ? { templateType: input.templateType } : {}),
      },
      data: {
        status: "cancelled",
        lastError: input.reason ?? "Fila cancelada manualmente.",
      },
    });
  } catch (error) {
    console.warn("Falha ao remover fila no banco. Usando fila em memoria.", error);
    removeReminderQueue(input.appointmentId, input.templateType);
  }
}

export async function removeReminderQueueEntryById(id: string) {
  const queueModel = getQueueModel();
  if (!queueModel) {
    removeReminderQueueById(id);
    return;
  }
  try {
    await queueModel.update({
      where: { id },
      data: { status: "cancelled", lastError: "Fila cancelada manualmente." },
    });
  } catch (error) {
    console.warn("Falha ao remover item da fila no banco. Usando fila em memoria.", error);
    removeReminderQueueById(id);
  }
}
