import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import prisma from "../client";
import type { Service } from "@/lib/definitions";

type ServiceInput = Omit<Service, "id">;

function toDomain(model: Prisma.ServiceGetPayload<{}>): Service {
  return {
    id: model.id,
    barbershopId: model.barbershopId,
    name: model.name,
    description: model.description ?? undefined,
    duration: model.durationMinutes,
    price: Number(model.price),
    active: model.active,
  };
}

export async function listServices(barbershopId: string) {
  const records = await prisma.service.findMany({
    where: { barbershopId },
    orderBy: { name: "asc" },
  });
  return records.map(toDomain);
}

export async function createService(barbershopId: string, data: ServiceInput) {
  const created = await prisma.service.create({
    data: {
      id: randomUUID(),
      barbershopId,
      name: data.name,
      description: data.description,
      durationMinutes: data.duration,
      price: new Prisma.Decimal(data.price),
      active: data.active ?? true,
    },
  });
  return toDomain(created);
}

export async function updateService(id: string, data: Partial<ServiceInput>) {
  const updated = await prisma.service.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      durationMinutes: data.duration,
      price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
      active: data.active,
    },
  });
  return toDomain(updated);
}

export async function deleteService(id: string) {
  await prisma.service.delete({ where: { id } });
}
