import prisma from "../client";
import type { MessageTemplate, MessageTemplateType } from "@/lib/definitions";

type TemplateInput = Omit<MessageTemplate, "id"> & { barbershopId: string };
type TemplateUpdateInput = Partial<TemplateInput>;

function toDomain(model: any): MessageTemplate {
  return {
    id: model.id,
    name: model.name,
    content: model.content,
    enabled: model.enabled,
    type: model.type as MessageTemplateType,
    reminderHoursBefore: model.reminderHoursBefore ?? null,
  };
}

export async function listTemplates(barbershopId: string) {
  const data = await prisma.messagetemplate.findMany({
    where: { barbershopId },
    orderBy: { createdAt: "desc" },
  });
  return data.map(toDomain);
}

export async function createTemplate(input: TemplateInput) {
  const created = await prisma.messagetemplate.create({
    data: {
      barbershopId: input.barbershopId,
      name: input.name,
      content: input.content,
      enabled: input.enabled,
      type: input.type,
      reminderHoursBefore: input.reminderHoursBefore ?? null,
    },
  });
  return toDomain(created);
}

export async function updateTemplate(id: string, input: TemplateUpdateInput) {
  const updated = await prisma.messagetemplate.update({
    where: { id },
    data: {
      name: input.name,
      content: input.content,
      enabled: input.enabled,
      type: input.type,
      reminderHoursBefore: input.reminderHoursBefore ?? undefined,
    },
  });
  return toDomain(updated);
}

export async function replaceTemplates(
  barbershopId: string,
  templates: MessageTemplate[]
) {
  const operations = [
    prisma.messagetemplate.deleteMany({ where: { barbershopId } }),
    ...templates.map((template) =>
      prisma.messagetemplate.create({
        data: {
          id: template.id,
          barbershopId,
          name: template.name,
          content: template.content,
          enabled: template.enabled,
          type: template.type,
          reminderHoursBefore: template.reminderHoursBefore ?? null,
        },
      })
    ),
  ];

  const results = await prisma.$transaction(operations);
  const created = results.slice(1);
  return created.map(toDomain);
}

export async function deleteTemplate(id: string) {
  await prisma.messagetemplate.delete({ where: { id } });
}
