import type { MessageTemplate } from "@/lib/definitions";

export const normalizeTemplateType = (value?: string) =>
  (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function templateMatchesKind(template: MessageTemplate, kind: string) {
  const normalizedKind = normalizeTemplateType(kind);
  return (
    normalizeTemplateType(template.type).includes(normalizedKind) ||
    normalizeTemplateType(template.name).includes(normalizedKind)
  );
}

export function getTemplateQueueType(template: MessageTemplate, kind: string) {
  const normalizedKind = normalizeTemplateType(kind);
  if (normalizeTemplateType(template.type).includes(normalizedKind)) {
    return template.type;
  }
  if (normalizeTemplateType(template.name).includes(normalizedKind)) {
    return template.name;
  }
  return template.type || template.name;
}

export function mergeTemplates(
  defaults: MessageTemplate[],
  overrides: MessageTemplate[]
) {
  const merged = new Map<string, MessageTemplate>();

  for (const template of defaults) {
    const key = normalizeTemplateType(template.type);
    if (key) {
      merged.set(key, template);
    }
  }

  for (const template of overrides) {
    const key = normalizeTemplateType(template.type);
    if (key) {
      merged.set(key, template);
    }
  }

  return Array.from(merged.values());
}
