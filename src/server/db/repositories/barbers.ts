import prisma from "../client";
import { randomUUID } from "crypto";
import type { Barber, BarberSchedule, BarberService } from "@/lib/definitions";

type BarberInput = {
  barbershopId: string;
  userId?: string | null;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  schedule?: BarberSchedule[];
  services?: BarberService[];
};

type BarberUpdateInput = Partial<BarberInput>;

function toDomain(model: any): Barber {
  return {
    id: model.id,
    name: model.name,
    phone: model.phone ?? "",
    email: model.email ?? undefined,
    userId: model.userId ?? undefined,
    avatarUrl: model.avatarUrl ?? "",
    schedule: (model.scheduleJson as BarberSchedule[] | null) ?? [],
    services:
      model.services?.map((s: any) => ({
        serviceId: s.serviceId,
        duration: s.durationMinutes ?? undefined,
      })) ?? [],
  };
}

export async function listBarbers(barbershopId: string) {
  const data = await prisma.barber.findMany({
    where: { barbershopId },
    orderBy: { name: "asc" },
    include: { services: true },
  });
  return data.map(toDomain);
}

export async function createBarber(input: BarberInput) {
  const created = await prisma.barber.create({
    data: {
      id: randomUUID(),
      barbershopId: input.barbershopId,
      userId: input.userId ?? undefined,
      name: input.name,
      phone: input.phone,
      email: input.email,
      avatarUrl: input.avatarUrl,
      scheduleJson: input.schedule ?? [],
      services: {
        create: input.services?.map((s) => ({
          serviceId: s.serviceId,
          durationMinutes: s.duration,
        })),
      },
    },
    include: { services: true },
  });
  return toDomain(created);
}

export async function updateBarber(id: string, input: BarberUpdateInput) {
  const updated = await prisma.barber.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      avatarUrl: input.avatarUrl,
      scheduleJson: input.schedule ?? undefined,
      ...(input.services
        ? {
            services: {
              deleteMany: {},
              create: input.services.map((s) => ({
                serviceId: s.serviceId,
                durationMinutes: s.duration,
              })),
            },
          }
        : {}),
    },
    include: { services: true },
  });
  return toDomain(updated);
}

export async function deleteBarber(id: string) {
  await prisma.barber.delete({ where: { id } });
}
