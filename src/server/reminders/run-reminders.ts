import { getBarbershopById } from "@/server/db/repositories/barbershops";
import { getAppointmentsByIds } from "@/server/db/repositories/appointments";
import { listBarbers } from "@/server/db/repositories/barbers";
import { listServices } from "@/server/db/repositories/services";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import type { MessageTemplate, Barbershop } from "@/lib/definitions";
import { messageTemplates as defaultTemplates } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { createWhatsappMessageLogs, WhatsappMessageLogInput } from "@/server/db/repositories/whatsapp-logs";
import { listDueReminderQueueEntries, updateReminderQueueEntryStatus } from "@/server/db/repositories/whatsapp-queue";
import {
  mergeTemplates,
  normalizeTemplateType,
  templateMatchesKind,
} from "@/server/reminders/template-utils";

type ReminderResult = {
  appointmentId: string;
  success: boolean;
  message?: string;
};

export type ReminderRunResult = {
  message: string;
  processed: number;
  skipped: number;
  results: ReminderResult[];
};

const getActionLabel = (templateType: string) => {
  const normalized = normalizeTemplateType(templateType);
  if (normalized.includes("lembrete")) return "Lembrete";
  if (normalized.includes("pesquisa")) return "Pesquisa";
  return "Mensagem";
};

function formatBarbershopAddress(barbershop?: Barbershop | null) {
  const address = barbershop?.address;
  if (!address) return "";

  const street = address.street?.trim();
  const number = address.number?.trim();
  const complement = address.complement?.trim();
  const neighborhood = address.neighborhood?.trim();
  const city = address.city?.trim();
  const state = address.state?.trim();

  const line = [street, number].filter(Boolean).join(", ");
  const rest = [neighborhood, city, state].filter(Boolean).join(" - ");
  const extra = complement ? ` ${complement}` : "";

  return [line + extra, rest].filter(Boolean).join(" - ");
}

function getTemplatesForBarbershop(barbershop?: Barbershop | null) {
  return mergeTemplates(defaultTemplates, barbershop?.messageTemplates ?? []);
}

function resolveTemplateForQueueEntry(templates: MessageTemplate[], templateType: string) {
  const enabledTemplates = templates.filter((tpl) => tpl.enabled);
  const direct = enabledTemplates.find((tpl) => tpl.type === templateType || tpl.name === templateType);
  if (direct) return direct;
  const normalizedType = normalizeTemplateType(templateType);
  const normalizedMatch = enabledTemplates.find(
    (tpl) =>
      normalizeTemplateType(tpl.type) === normalizedType ||
      normalizeTemplateType(tpl.name) === normalizedType
  );
  if (normalizedMatch) return normalizedMatch;

  if (normalizedType.includes("pesquisa")) {
    return enabledTemplates.find((tpl) => templateMatchesKind(tpl, "pesquisa")) || null;
  }
  if (normalizedType.includes("lembrete")) {
    return enabledTemplates.find((tpl) => templateMatchesKind(tpl, "lembrete")) || null;
  }
  if (normalizedType.includes("confirmacao")) {
    return enabledTemplates.find((tpl) => templateMatchesKind(tpl, "confirmacao")) || null;
  }
  return null;
}

function buildTemplateMessage(
  template: MessageTemplate,
  context: {
    clientName: string;
    barbershopName: string;
    services: string;
    serviceValue: string;
    barbershopAddress?: string;
    startTime: Date;
    barberName: string;
  }
) {
  let message = template.content;
  message = message.replace("{cliente}", context.clientName);
  message = message.replace("{servico}", context.services || "");
  message = message.replace("{valor}", context.serviceValue || "");
  message = message.replace("{data}", context.startTime.toLocaleDateString());
  message = message.replace(
    "{horario}",
    context.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  message = message.replace("{barbeiro}", context.barberName || "");
  message = message.replace("{barbearia}", context.barbershopName || "sua barbearia");
  message = message.replace("{endereco}", context.barbershopAddress || "");
  return message;
}

async function sendQueueMessage(
  barbershop: Barbershop,
  payload: { number: string; message: string }
) {
  const bitSafiraToken = barbershop.bitSafiraToken || process.env.BITSAFIRA_TOKEN;
  const bitsafiraInstanceId = barbershop.bitsafiraInstanceId || process.env.BITSAFIRA_INSTANCE_ID;

  if (!bitSafiraToken || !bitsafiraInstanceId) {
    throw new Error("Token ou ID da instancia BitSafira nao configurados.");
  }

  const client = getBitSafiraApiClient(bitSafiraToken);
  const cleaned = payload.number.replace(/\D/g, "");
  const normalized = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;

  const result = await client.sendMessage({
    idInstancia: bitsafiraInstanceId,
    whatsapp: normalized,
    texto: payload.message,
    envioImediato: 1,
  });

  if (![200, 201].includes(result.status)) {
    throw new Error(result.mensagem || result.message || "Falha ao enviar mensagem.");
  }
}

export async function processReminderQueueForBarbershop(barbershopId: string): Promise<ReminderRunResult> {
  if (!barbershopId) {
    throw new Error("Barbearia nao encontrada");
  }

  const barbershop = await getBarbershopById(barbershopId);
  if (!barbershop) {
    throw new Error("Barbearia nao encontrada");
  }

  const templates = getTemplatesForBarbershop(barbershop);
  const now = new Date();
  const queueEntries = await listDueReminderQueueEntries(barbershopId, now);

  if (!queueEntries.length) {
    return {
      message: "Nenhuma mensagem pendente para envio.",
      processed: 0,
      skipped: 0,
      results: [],
    };
  }

  const appointmentIds = Array.from(new Set(queueEntries.map((entry) => entry.appointmentId))).filter(
    (id): id is string => Boolean(id)
  );

  const [appointments, barbers, services] = await Promise.all([
    getAppointmentsByIds(appointmentIds),
    listBarbers(barbershopId),
    listServices(barbershopId),
  ]);

  const appointmentMap = new Map(appointments.map((appt) => [appt.id, appt]));
  const barbersMap = new Map(barbers.map((b) => [b.id, b.name]));
  const serviceMap = new Map(services.map((s) => [s.id, { name: s.name, price: s.price }]));

  const results: ReminderResult[] = [];
  const reminderLogs: WhatsappMessageLogInput[] = [];

  for (const queueEntry of queueEntries) {
    const template = resolveTemplateForQueueEntry(templates, queueEntry.templateType || "");
    const actionLabel = getActionLabel(queueEntry.templateType || "");

    if (!template) {
      await updateReminderQueueEntryStatus({
        id: queueEntry.id,
        status: "cancelled",
        lastError: "Template desativado ou nao encontrado.",
      });
      reminderLogs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        barbershopId,
        appointmentId: queueEntry.appointmentId,
        clientName: undefined,
        clientPhone: undefined,
        templateType: queueEntry.templateType,
        status: "skipped",
        message: `${actionLabel} ignorado: template desativado ou nao encontrado.`,
        sentAt: new Date().toISOString(),
      });
      continue;
    }

    const normalizedType = normalizeTemplateType(queueEntry.templateType || template.type || "");
    const isReminder = normalizedType.includes("lembrete");
    const isSurvey = normalizedType.includes("pesquisa");

    const appt = appointmentMap.get(queueEntry.appointmentId);
    if (!appt) {
      await updateReminderQueueEntryStatus({
        id: queueEntry.id,
        status: "cancelled",
        lastError: "Agendamento nao encontrado.",
      });
      reminderLogs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        barbershopId,
        appointmentId: queueEntry.appointmentId,
        clientName: undefined,
        clientPhone: undefined,
        templateType: queueEntry.templateType,
        status: "skipped",
        message: `${actionLabel} ignorado: agendamento nao encontrado.`,
        sentAt: new Date().toISOString(),
      });
      continue;
    }

    if (appt.status === "cancelled") {
      await updateReminderQueueEntryStatus({
        id: queueEntry.id,
        status: "cancelled",
        lastError: "Agendamento cancelado.",
      });
      reminderLogs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        barbershopId,
        appointmentId: appt.id,
        clientName: appt.clientName,
        clientPhone: appt.clientPhone,
        templateType: queueEntry.templateType,
        status: "skipped",
        message: `${actionLabel} ignorado: agendamento cancelado.`,
        sentAt: new Date().toISOString(),
      });
      continue;
    }

    if (appt.status === "completed" && !isSurvey) {
      await updateReminderQueueEntryStatus({
        id: queueEntry.id,
        status: "cancelled",
        lastError: "Agendamento finalizado.",
      });
      reminderLogs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        barbershopId,
        appointmentId: appt.id,
        clientName: appt.clientName,
        clientPhone: appt.clientPhone,
        templateType: queueEntry.templateType,
        status: "skipped",
        message: `${actionLabel} ignorado: agendamento finalizado.`,
        sentAt: new Date().toISOString(),
      });
      continue;
    }

    if (!appt.clientPhone) {
      await updateReminderQueueEntryStatus({
        id: queueEntry.id,
        status: "error",
        lastError: "Cliente sem numero de WhatsApp.",
      });
      reminderLogs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        barbershopId,
        appointmentId: appt.id,
        clientName: appt.clientName,
        clientPhone: appt.clientPhone,
        templateType: queueEntry.templateType,
        status: "error",
        message: "Falha ao enviar mensagem: cliente sem numero de WhatsApp.",
        sentAt: new Date().toISOString(),
      });
      continue;
    }

    const startTime = new Date(appt.startTime);
    if (isReminder && queueEntry.createdAt) {
      const createdAt = new Date(queueEntry.createdAt);
      const scheduledFor = queueEntry.scheduledFor ? new Date(queueEntry.scheduledFor) : null;
      if (scheduledFor && createdAt.getTime() > scheduledFor.getTime()) {
        await updateReminderQueueEntryStatus({
          id: queueEntry.id,
          status: "cancelled",
          lastError: "Agendamento criado/alterado apos o horario do lembrete.",
        });
        reminderLogs.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          barbershopId,
          appointmentId: appt.id,
          clientName: appt.clientName,
          clientPhone: appt.clientPhone,
          templateType: queueEntry.templateType,
          status: "skipped",
          message: `${actionLabel} ignorado: agendamento criado/alterado com pouca antecedencia.`,
          sentAt: new Date().toISOString(),
        });
        continue;
      }
    }
    if (isReminder && startTime <= now) {
      await updateReminderQueueEntryStatus({
        id: queueEntry.id,
        status: "cancelled",
        lastError: "Horario do agendamento ja comecou.",
      });
      reminderLogs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        barbershopId,
        appointmentId: appt.id,
        clientName: appt.clientName,
        clientPhone: appt.clientPhone,
        templateType: queueEntry.templateType,
        status: "skipped",
        message: `${actionLabel} ignorado: horario ja comecou/terminou.`,
        sentAt: new Date().toISOString(),
      });
      continue;
    }

    const serviceDetails = appt.serviceIds
      .map((id) => serviceMap.get(id))
      .filter(Boolean) as { name: string; price: number }[];
    const serviceNames = serviceDetails.map((service) => service.name).join(", ");
    const totalPrice = serviceDetails.reduce((acc, service) => acc + Number(service.price || 0), 0);

    const message = buildTemplateMessage(template, {
      clientName: appt.clientName,
      barbershopName: barbershop.name || "sua barbearia",
      services: serviceNames,
      serviceValue: formatCurrency(totalPrice),
      barbershopAddress: formatBarbershopAddress(barbershop),
      startTime,
      barberName: barbersMap.get(appt.barberId) || "Barbeiro",
    });

    const attempts = (queueEntry.attempts ?? 0) + 1;

    try {
      await sendQueueMessage(barbershop, { number: appt.clientPhone, message });
      await updateReminderQueueEntryStatus({
        id: queueEntry.id,
        status: "sent",
        attempts,
        lastError: null,
        sentAt: new Date(),
      });
      results.push({ appointmentId: appt.id, success: true });
      reminderLogs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        barbershopId,
        appointmentId: appt.id,
        clientName: appt.clientName,
        clientPhone: appt.clientPhone,
        templateType: queueEntry.templateType,
        status: "success",
        message,
        sentAt: new Date().toISOString(),
        details: `Mensagem enviada. Agendado para: ${queueEntry.scheduledFor?.toISOString?.() || ""}`,
      });
    } catch (error: any) {
      await updateReminderQueueEntryStatus({
        id: queueEntry.id,
        status: "error",
        attempts,
        lastError: error?.message || "Falha ao enviar mensagem.",
      });
      results.push({
        appointmentId: appt.id,
        success: false,
        message: error?.message || "Falha ao enviar mensagem.",
      });
      reminderLogs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        barbershopId,
        appointmentId: appt.id,
        clientName: appt.clientName,
        clientPhone: appt.clientPhone,
        templateType: queueEntry.templateType,
        status: "error",
        message: error?.message || "Falha ao enviar mensagem.",
        sentAt: new Date().toISOString(),
      });
    }
  }

  if (reminderLogs.length > 0) {
    try {
      await createWhatsappMessageLogs(reminderLogs);
    } catch (logError) {
      console.warn("Falha ao registrar logs de lembrete:", logError);
    }
  }

  return {
    message: "Processo de mensagens concluido.",
    processed: results.length,
    skipped: reminderLogs.filter((l: any) => l.status === "skipped").length,
    results,
  };
}
