// Simple in-memory log store for reminder sends (ephemeral, per runtime)
export type ReminderLogEntry = {
  id: string;
  barbershopId: string;
  appointmentId?: string | null;
  clientName?: string;
  clientPhone?: string;
  templateType?: string;
  status: "success" | "error" | "skipped";
  message: string;
  sentAt: string; // ISO
  details?: string;
};

const reminderLogs: ReminderLogEntry[] = [];

export function addReminderLogs(entries: ReminderLogEntry[]) {
  reminderLogs.unshift(...entries);
  // keep last 200
  if (reminderLogs.length > 200) {
    reminderLogs.length = 200;
  }
}

export function addWhatsappLogs(entries: ReminderLogEntry[]) {
  addReminderLogs(entries);
}

export function listReminderLogs(barbershopId?: string) {
  if (!barbershopId) return reminderLogs;
  return reminderLogs.filter((log) => log.barbershopId === barbershopId);
}
