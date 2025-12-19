import prisma from "../client";
import { randomUUID } from "crypto";
import type { Client } from "@/lib/definitions";

type ClientInput = Omit<Client, "id"> & { barbershopId: string };
type ClientUpdateInput = Partial<ClientInput>;

function toDomain(model: any): Client {
  return {
    id: model.id,
    name: model.name,
    phone: model.phone ?? "",
    email: model.email ?? undefined,
    userId: model.userId ?? undefined,
    notes: model.notes ?? undefined,
    favoriteBarbershops: model.favoriteBarbershops ? JSON.parse(model.favoriteBarbershops) : undefined,
  };
}

export async function listClients(barbershopId: string) {
  const data = await prisma.client.findMany({
    where: { barbershopId },
    orderBy: { name: "asc" },
  });
  return data.map(toDomain);
}

export async function listClientsByUserId(userId: string) {
  const data = await prisma.client.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return data.map(toDomain);
}

export async function createClient(input: ClientInput) {
  const created = await prisma.client.create({
    data: {
      id: randomUUID(),
      barbershopId: input.barbershopId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      userId: input.userId ?? undefined,
      notes: input.notes,
      favoriteBarbershops: input.favoriteBarbershops ? JSON.stringify(input.favoriteBarbershops) : undefined,
    },
  });
  return toDomain(created);
}

export async function updateClient(id: string, input: ClientUpdateInput) {
  const updated = await prisma.client.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      userId: input.userId ?? undefined,
      notes: input.notes,
      favoriteBarbershops: input.favoriteBarbershops ? JSON.stringify(input.favoriteBarbershops) : undefined,
    },
  });
  return toDomain(updated);
}

export async function deleteClient(id: string) {
  await prisma.client.delete({ where: { id } });
}

export async function findClientByPhoneAndName(barbershopId: string, phone: string, name: string) {
  const existing = await prisma.client.findFirst({
    where: {
      barbershopId,
      phone,
    },
  });
  if (!existing) return null;
  const normalizedExisting = (existing.name || "").trim().toLowerCase();
  const normalizedInput = name.trim().toLowerCase();
  return normalizedExisting === normalizedInput ? toDomain(existing) : null;
}
