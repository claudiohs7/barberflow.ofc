export type ReminderQueueStatus = "pending" | "sent" | "cancelled" | "error";

export type ReminderQueueEntry = {
  id: string;
  barbershopId: string;
  appointmentId: string;
  templateType: string;
  scheduledFor: Date;
  status: ReminderQueueStatus;
  attempts: number;
  lastError?: string | null;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const reminderQueue: ReminderQueueEntry[] = [];

export function upsertReminderQueue(entry: {
  id?: string;
  barbershopId: string;
  appointmentId: string;
  templateType: string;
  scheduledFor: Date;
  status?: ReminderQueueStatus;
  attempts?: number;
  lastError?: string | null;
  sentAt?: Date | null;
}) {
  const now = new Date();
  const existingIndex = reminderQueue.findIndex(
    (item) => item.appointmentId === entry.appointmentId && item.templateType === entry.templateType
  );

  if (existingIndex >= 0) {
    const existing = reminderQueue[existingIndex];
    if (existing.status === "sent") {
      return existing;
    }
    reminderQueue[existingIndex] = {
      ...existing,
      scheduledFor: entry.scheduledFor,
      status: entry.status ?? existing.status,
      attempts: entry.attempts ?? existing.attempts,
      lastError: entry.lastError === undefined ? existing.lastError : entry.lastError,
      sentAt: entry.sentAt ?? existing.sentAt ?? null,
      updatedAt: now,
    };
    return reminderQueue[existingIndex];
  }

  const created: ReminderQueueEntry = {
    id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    barbershopId: entry.barbershopId,
    appointmentId: entry.appointmentId,
    templateType: entry.templateType,
    scheduledFor: entry.scheduledFor,
    status: entry.status ?? "pending",
    attempts: entry.attempts ?? 0,
    lastError: entry.lastError === undefined ? null : entry.lastError,
    sentAt: entry.sentAt ?? null,
    createdAt: now,
    updatedAt: now,
  };

  reminderQueue.unshift(created);
  return created;
}

export function listDueReminderQueue(barbershopId: string, dueBefore: Date) {
  return reminderQueue
    .filter(
      (entry) =>
        entry.barbershopId === barbershopId &&
        entry.status === "pending" &&
        entry.scheduledFor.getTime() <= dueBefore.getTime()
    )
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

export function listReminderQueue(barbershopId: string, status?: ReminderQueueStatus) {
  return reminderQueue
    .filter((entry) => entry.barbershopId === barbershopId && (!status || entry.status === status))
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}

export function updateReminderQueueStatus(
  id: string,
  patch: Partial<Pick<ReminderQueueEntry, "status" | "attempts" | "lastError" | "sentAt">>
) {
  const index = reminderQueue.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  const existing = reminderQueue[index];
  reminderQueue[index] = {
    ...existing,
    status: patch.status ?? existing.status,
    attempts: patch.attempts ?? existing.attempts,
    lastError: patch.lastError === undefined ? existing.lastError : patch.lastError,
    sentAt: patch.sentAt === undefined ? existing.sentAt : patch.sentAt,
    updatedAt: new Date(),
  };
}

export function cancelReminderQueue(
  appointmentId: string,
  templateType: string,
  reason?: string
) {
  const now = new Date();
  for (const entry of reminderQueue) {
    if (entry.appointmentId === appointmentId && entry.templateType === templateType) {
      entry.status = "cancelled";
      entry.lastError = reason || entry.lastError;
      entry.updatedAt = now;
    }
  }
}

export function removeReminderQueue(appointmentId: string, templateType?: string) {
  for (let i = reminderQueue.length - 1; i >= 0; i -= 1) {
    const entry = reminderQueue[i];
    if (entry.appointmentId === appointmentId && (!templateType || entry.templateType === templateType)) {
      reminderQueue.splice(i, 1);
    }
  }
}

export function removeReminderQueueById(id: string) {
  const index = reminderQueue.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    reminderQueue.splice(index, 1);
  }
}
