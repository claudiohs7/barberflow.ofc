import prisma from "../client";
import type { Webhook } from "@/lib/definitions";

type WebhookInput = Omit<Webhook, "id"> & { barbershopId: string };
type WebhookUpdateInput = Partial<WebhookInput>;

function toDomain(model: any): Webhook {
  return {
    id: model.id,
    url: model.url,
    name: model.name,
    events: model.events ? (JSON.parse(model.events) as Webhook["events"]) : [],
    lastStatus: (model.lastStatus as Webhook["lastStatus"]) || "pending",
    lastUsed: model.lastUsed ?? null,
  };
}

export async function listWebhooks(barbershopId: string) {
  const data = await prisma.webhook.findMany({
    where: { barbershopId },
    orderBy: { createdAt: "desc" },
  });
  return data.map(toDomain);
}

export async function createWebhook(input: WebhookInput) {
  const created = await prisma.webhook.create({
    data: {
      barbershopId: input.barbershopId,
      url: input.url,
      name: input.name,
      events: JSON.stringify(input.events),
      lastStatus: input.lastStatus,
      lastUsed: input.lastUsed ?? undefined,
    },
  });
  return toDomain(created);
}

export async function updateWebhook(id: string, input: WebhookUpdateInput) {
  const updated = await prisma.webhook.update({
    where: { id },
    data: {
      url: input.url,
      name: input.name,
      events: input.events ? JSON.stringify(input.events) : undefined,
      lastStatus: input.lastStatus,
      lastUsed: input.lastUsed ?? undefined,
    },
  });
  return toDomain(updated);
}

export async function deleteWebhook(id: string) {
  await prisma.webhook.delete({ where: { id } });
}
