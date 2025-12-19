import type { Appointment, MessageTemplate } from "@/lib/definitions";
import { messageTemplates as defaultTemplates } from "@/lib/data";
import { getBarbershopById } from "@/server/db/repositories/barbershops";
import { listAppointments } from "@/server/db/repositories/appointments";
import { cancelReminderQueueEntry, removeReminderQueueEntry, upsertReminderQueueEntry } from "@/server/db/repositories/whatsapp-queue";
import {
  getTemplateQueueType,
  mergeTemplates,
  normalizeTemplateType,
  templateMatchesKind,
} from "@/server/reminders/template-utils";

const REMINDER_KIND = "lembrete";
const SURVEY_KIND = "pesquisa";
const SURVEY_DELAY_HOURS = 24;

const getTemplatesForBarbershop = (templates?: MessageTemplate[] | null) =>
  mergeTemplates(defaultTemplates, templates ?? []);

function findTemplateByKind(
  templates: MessageTemplate[],
  kind: string,
  opts: { requireEnabled?: boolean; requireReminderHours?: boolean } = {}
) {
  const template = templates.find((tpl) => {
    const matchesKind = templateMatchesKind(tpl, kind);
    const enabledOk = opts.requireEnabled ? tpl.enabled : true;
    return matchesKind && enabledOk;
  });
  if (!template) return null;
  if (opts.requireReminderHours) {
    if (typeof template.reminderHoursBefore !== "number" || template.reminderHoursBefore <= 0) {
      return null;
    }
  }
  return template;
}

function listTemplateQueueTypes(templates: MessageTemplate[], kind: string) {
  const types = new Set<string>();
  templates.forEach((tpl) => {
    if (!templateMatchesKind(tpl, kind)) return;
    if (tpl.type) types.add(tpl.type);
    if (tpl.name) types.add(tpl.name);
  });
  return Array.from(types);
}

export async function syncReminderQueueForAppointment(appointment: Appointment) {
  if (!appointment.barbershopId) return;

  const barbershop = await getBarbershopById(appointment.barbershopId);
  if (!barbershop) return;

  const templates = getTemplatesForBarbershop(barbershop.messageTemplates);
  await syncReminderQueueForAppointmentWithTemplates(appointment, templates, appointment.barbershopId);
}

async function syncReminderQueueForAppointmentWithTemplates(
  appointment: Appointment,
  templates: MessageTemplate[],
  barbershopId: string
) {
  if (!barbershopId) return;

  const reminderTemplate = findTemplateByKind(templates, REMINDER_KIND, {
    requireEnabled: true,
    requireReminderHours: true,
  });
  const surveyTemplate = findTemplateByKind(templates, SURVEY_KIND, { requireEnabled: true });
  const reminderTypes = listTemplateQueueTypes(templates, REMINDER_KIND);
  const surveyTypes = listTemplateQueueTypes(templates, SURVEY_KIND);
  let reminderQueueType = reminderTemplate ? getTemplateQueueType(reminderTemplate, REMINDER_KIND) : null;
  let surveyQueueType = surveyTemplate ? getTemplateQueueType(surveyTemplate, SURVEY_KIND) : null;

  if (
    reminderQueueType &&
    surveyQueueType &&
    normalizeTemplateType(reminderQueueType) === normalizeTemplateType(surveyQueueType)
  ) {
    const surveyFallback =
      surveyTemplate?.name &&
      normalizeTemplateType(surveyTemplate.name) !== normalizeTemplateType(reminderQueueType)
        ? surveyTemplate.name
        : `${surveyQueueType} (Pesquisa)`;
    surveyQueueType = surveyFallback;
  }

  const isCancelled = appointment.status === "cancelled";
  const isCompleted = appointment.status === "completed";

  if (isCancelled) {
    const reminderCancelTypes = new Set([...reminderTypes, reminderQueueType].filter(Boolean));
    const surveyCancelTypes = new Set([...surveyTypes, surveyQueueType].filter(Boolean));

    for (const type of reminderCancelTypes) {
      await cancelReminderQueueEntry({
        barbershopId,
        appointmentId: appointment.id,
        templateType: type,
        reason: "Agendamento cancelado.",
      });
    }
    for (const type of surveyCancelTypes) {
      await cancelReminderQueueEntry({
        barbershopId,
        appointmentId: appointment.id,
        templateType: type,
        reason: "Agendamento cancelado.",
      });
    }
    return;
  }

  const startTime = new Date(appointment.startTime);
  if (reminderTemplate && reminderQueueType && !isCompleted) {
    const scheduledFor = new Date(startTime.getTime() - reminderTemplate.reminderHoursBefore * 60 * 60 * 1000);
    const now = new Date();

    if (scheduledFor.getTime() <= now.getTime()) {
      const reminderCancelTypes = new Set([...reminderTypes, reminderQueueType].filter(Boolean));
      for (const type of reminderCancelTypes) {
        await cancelReminderQueueEntry({
          barbershopId,
          appointmentId: appointment.id,
          templateType: type,
          reason: `Lembrete nao enviado: agendamento com menos de ${reminderTemplate.reminderHoursBefore} hora(s) de antecedencia.`,
        });
      }
    } else {
      await upsertReminderQueueEntry({
        barbershopId,
        appointmentId: appointment.id,
        templateType: reminderQueueType,
        scheduledFor,
        status: "pending",
      });
    }
  } else if (reminderTypes.length > 0 || reminderQueueType) {
    const reminderCancelTypes = new Set([...reminderTypes, reminderQueueType].filter(Boolean));
    for (const type of reminderCancelTypes) {
      await cancelReminderQueueEntry({
        barbershopId,
        appointmentId: appointment.id,
        templateType: type,
        reason: isCompleted ? "Agendamento finalizado." : "Lembrete desativado ou sem horario configurado.",
      });
    }
  }

  if (surveyTemplate && surveyQueueType) {
    const scheduledFor = new Date(startTime.getTime() + SURVEY_DELAY_HOURS * 60 * 60 * 1000);
    await upsertReminderQueueEntry({
      barbershopId,
      appointmentId: appointment.id,
      templateType: surveyQueueType,
      scheduledFor,
      status: "pending",
    });
  } else if (surveyTypes.length > 0 || surveyQueueType) {
    const surveyCancelTypes = new Set([...surveyTypes, surveyQueueType].filter(Boolean));
    for (const type of surveyCancelTypes) {
      await cancelReminderQueueEntry({
        barbershopId,
        appointmentId: appointment.id,
        templateType: type,
        reason: "Pesquisa desativada.",
      });
    }
  }
}

export async function removeReminderQueueForAppointment(appointmentId: string) {
  await removeReminderQueueEntry({ appointmentId });
}

export async function syncReminderQueueForBarbershop(barbershopId: string) {
  if (!barbershopId) return;

  const barbershop = await getBarbershopById(barbershopId);
  if (!barbershop) return;

  const templates = getTemplatesForBarbershop(barbershop.messageTemplates);
  const now = new Date();
  const windowStart = new Date(now.getTime() - SURVEY_DELAY_HOURS * 60 * 60 * 1000);
  const appointments = await listAppointments(barbershopId, windowStart);

  for (const appointment of appointments) {
    await syncReminderQueueForAppointmentWithTemplates(appointment, templates, barbershopId);
  }
}
