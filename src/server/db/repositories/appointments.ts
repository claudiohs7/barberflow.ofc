import { Prisma, $Enums } from "@prisma/client";
import prisma from "../client";
import type { Appointment, AppointmentStatus } from "@/lib/definitions";
import { removeReminderQueueEntry } from "@/server/db/repositories/whatsapp-queue";

type AppointmentInput = {
  barbershopId: string;
  barberId?: string | null;
  clientId?: string | null;
  clientName: string;
  clientPhone: string;
  serviceIds: string[];
  startTime: Date;
  endTime: Date;
  status?: AppointmentStatus;
  totalDuration?: number;
};

function mapStatus(status?: AppointmentStatus): $Enums.AppointmentStatus {
  switch (status) {
    case "cancelled":
      return $Enums.AppointmentStatus.CANCELLED;
    case "completed":
      return $Enums.AppointmentStatus.COMPLETED;
    case "pending":
      return $Enums.AppointmentStatus.PENDING;
    case "confirmed":
    default:
      return $Enums.AppointmentStatus.CONFIRMED;
  }
}

function toDomain(model: Prisma.AppointmentGetPayload<{ include: { services: true } }>): Appointment {
  return {
    id: model.id,
    barbershopId: model.barbershopId,
    barberId: model.barberId ?? "",
    clientId: model.clientId ?? null,
    clientName: model.clientName ?? "",
    clientPhone: model.clientPhone ?? "",
    serviceIds: model.services.map((link) => link.serviceId),
    startTime: model.startTime,
    endTime: model.endTime,
    status:
      model.status === "CANCELLED"
        ? "cancelled"
        : model.status === "COMPLETED"
        ? "completed"
        : model.status === "PENDING"
        ? "pending"
        : "confirmed",
    totalDuration: model.totalDuration ?? undefined,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

export async function listAppointments(
  barbershopId: string,
  from?: Date,
  to?: Date,
  opts?: { clientId?: string; barberId?: string; createdAfter?: Date }
) {
  const records = await prisma.appointment.findMany({
    where: {
      barbershopId,
      ...(opts?.clientId ? { clientId: opts.clientId } : {}),
      ...(opts?.barberId ? { barberId: opts.barberId } : {}),
      ...(opts?.createdAfter
        ? {
            createdAt: {
              gt: opts.createdAfter,
            },
          }
        : {}),
      ...(from || to
        ? {
            startTime: {
              gte: from,
              lte: to,
            },
          }
        : {}),
    },
    orderBy: { startTime: "desc" },
    include: { services: true },
  });
  return records.map(toDomain);
}

export async function listAppointmentsByClient(clientId: string) {
  const records = await prisma.appointment.findMany({
    where: { clientId },
    include: { services: true },
    orderBy: { startTime: "desc" },
  });
  return records.map(toDomain);
}

export async function listAppointmentsByPhone(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  if (!normalized) return [];

  const records = await prisma.appointment.findMany({
    where: {
      clientPhone: {
        contains: normalized,
      },
    },
    include: { services: true },
    orderBy: { startTime: "desc" },
  });

  return records.map(toDomain);
}

export async function getAppointmentsByIds(ids: string[]) {
  if (!ids.length) return [];
  const records = await prisma.appointment.findMany({
    where: { id: { in: ids } },
    include: { services: true },
  });
  return records.map(toDomain);
}

export async function createAppointment(input: AppointmentInput) {
  // Garantir que o clientId referencie um cliente existente, caso contrário removemos para evitar FK error
  let clientId: string | undefined = undefined;
  if (input.clientId) {
    const clientExists = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (clientExists) {
      clientId = input.clientId;
    }
  }

  const created = await prisma.appointment.create({
    data: {
      barbershopId: input.barbershopId,
      barberId: input.barberId ?? undefined,
      clientId,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      status: mapStatus(input.status),
      startTime: input.startTime,
      endTime: input.endTime,
      totalDuration: input.totalDuration,
      services: {
        create: input.serviceIds.map((serviceId) => ({ serviceId })),
      },
    },
    include: { services: true },
  });
  return toDomain(created);
}

export async function updateAppointment(id: string, data: Partial<AppointmentInput>) {
  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      barberId: data.barberId ?? undefined,
      clientId: data.clientId ?? undefined,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      status: data.status ? mapStatus(data.status) : undefined,
      startTime: data.startTime,
      endTime: data.endTime,
      totalDuration: data.totalDuration,
      ...(data.serviceIds
        ? {
            services: {
              deleteMany: {},
              create: data.serviceIds.map((serviceId) => ({ serviceId })),
            },
          }
        : {}),
    },
    include: { services: true },
  });
  return toDomain(updated);
}

export async function deleteAppointment(id: string) {
  // Remove o agendamento e, em seguida, limpa a fila ligada a ele.
  // Feito fora de transação para evitar conflito com outros clients dentro de removeReminderQueueEntry.
  await prisma.appointment.delete({ where: { id } });
  await removeReminderQueueEntry({ appointmentId: id });
}
