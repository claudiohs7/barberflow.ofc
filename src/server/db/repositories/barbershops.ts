import { Prisma } from "@prisma/client";
import prisma from "../client";
import type { Barbershop, Address, OperatingHour, MessageTemplate } from "@/lib/definitions";
import { slugify } from "@/lib/utils";

type BarbershopCreateInput = {
  id?: string;
  name: string;
  legalName?: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  description?: string;
  ownerId?: string;
  plan?: "Básico" | "Premium";
  status?: "Ativa" | "Inativa";
  expiryDate?: Date | string | null;
  address?: Address;
  operatingHours?: OperatingHour[];
  logoUrl?: string;
  whatsappStatus?: string;
  qrCodeBase64?: string | null;
  bitsafiraInstanceId?: string | null;
  bitSafiraToken?: string | null;
  whatsAppInstanceId?: string | null;
  bitsafiraInstanceData?: Prisma.InputJsonValue;
};

type BarbershopUpdateInput = Partial<BarbershopCreateInput>;

function mapPlan(plan?: string): "BASIC" | "PREMIUM" {
  if (!plan) return "BASIC";
  return plan.toLowerCase().includes("prem") ? "PREMIUM" : "BASIC";
}

function normalizeCpfCnpj(value?: string) {
  return (value || "").replace(/\D/g, "");
}

function normalizeDate(value?: Date | string | null) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function findExistingBarbershopByCpfCnpj(normalizedCpfCnpj: string, excludeId?: string) {
  const matches = await prisma.barbershop.findMany({
    where: {
      cpfCnpj: { not: null },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, cpfCnpj: true },
  });

  return matches.find((shop) => normalizeCpfCnpj(shop.cpfCnpj ?? "") === normalizedCpfCnpj);
}

function toDomain(shop: Prisma.BarbershopGetPayload<{ include: { messageTemplates: true } }>): Barbershop {
  return {
    id: shop.id,
    name: shop.name,
    legalName: shop.legalName ?? undefined,
    cpfCnpj: shop.cpfCnpj ?? undefined,
    email: shop.email ?? undefined,
    phone: shop.phone ?? undefined,
    description: shop.description ?? undefined,
    ownerId: shop.ownerId ?? undefined,
    plan: shop.plan === "PREMIUM" ? "Premium" : "Básico",
    status: shop.status as Barbershop["status"],
    expiryDate: shop.expiryDate?.toISOString(),
    address: (shop.addressJson as Address | null) ?? undefined,
    operatingHours: (shop.operatingHoursJson as OperatingHour[] | null) ?? undefined,
    logoUrl: shop.logoUrl ?? undefined,
    whatsappStatus: shop.whatsappStatus as Barbershop["whatsappStatus"],
    qrCodeBase64: shop.qrCodeBase64 ?? undefined,
    bitsafiraInstanceId: shop.bitsafiraInstanceId ?? undefined,
    bitSafiraToken: shop.bitSafiraToken ?? undefined,
    whatsAppInstanceId: shop.whatsAppInstanceId ?? undefined,
    messageTemplates: shop.messageTemplates?.map<MessageTemplate>((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      content: tpl.content,
      enabled: tpl.enabled,
      type: tpl.type as MessageTemplate["type"],
      reminderHoursBefore: tpl.reminderHoursBefore ?? null,
    })) || [],
    bitsafiraInstanceData: (shop.bitsafiraInstanceData as object | null) ?? undefined,
    createdAt: shop.createdAt?.toISOString(),
  };
}

export async function createBarbershop(data: BarbershopCreateInput) {
  const barbershopId = data.id || crypto.randomUUID();
  const normalizedCpfCnpj = normalizeCpfCnpj(data.cpfCnpj);
  const expiryDate = normalizeDate(data.expiryDate);
  if (normalizedCpfCnpj) {
    const existing = await findExistingBarbershopByCpfCnpj(normalizedCpfCnpj);
    if (existing) {
      throw new Error("CPF/CNPJ já está cadastrado para outra barbearia.");
    }
  }

  const created = await prisma.barbershop.create({
    data: {
      id: barbershopId,
      name: data.name,
      legalName: data.legalName,
      cpfCnpj: normalizedCpfCnpj || data.cpfCnpj,
      email: data.email,
      phone: data.phone,
      description: data.description,
      ownerId: data.ownerId,
      plan: mapPlan(data.plan) as any,
      status: data.status,
      expiryDate,
      addressJson: data.address ? (data.address as Prisma.InputJsonValue) : undefined,
      operatingHoursJson: data.operatingHours ? (data.operatingHours as Prisma.InputJsonValue) : undefined,
      logoUrl: data.logoUrl,
      whatsappStatus: data.whatsappStatus,
      qrCodeBase64: data.qrCodeBase64,
      bitsafiraInstanceId: data.bitsafiraInstanceId ?? undefined,
      bitSafiraToken: data.bitSafiraToken ?? undefined,
      whatsAppInstanceId: data.whatsAppInstanceId ?? undefined,
      bitsafiraInstanceData: data.bitsafiraInstanceData ?? undefined,
    },
    include: { messageTemplates: true },
  });

  return toDomain(created);
}

export async function updateBarbershop(id: string, data: BarbershopUpdateInput) {
  const normalizedCpfCnpj = normalizeCpfCnpj(data.cpfCnpj);
  if (normalizedCpfCnpj) {
    const existing = await findExistingBarbershopByCpfCnpj(normalizedCpfCnpj, id);
    if (existing) {
      throw new Error("CPF/CNPJ já está cadastrado para outra barbearia.");
    }
  }

  const expiryDate = normalizeDate(data.expiryDate);

  const updated = await prisma.barbershop.update({
    where: { id },
    data: {
      name: data.name,
      legalName: data.legalName,
      cpfCnpj: normalizedCpfCnpj || data.cpfCnpj,
      email: data.email,
      phone: data.phone,
      description: data.description,
      ownerId: data.ownerId,
      plan: data.plan ? mapPlan(data.plan) : undefined,
      status: data.status,
      expiryDate,
      addressJson: data.address ? (data.address as Prisma.InputJsonValue) : undefined,
      operatingHoursJson: data.operatingHours ? (data.operatingHours as Prisma.InputJsonValue) : undefined,
      logoUrl: data.logoUrl,
      whatsappStatus: data.whatsappStatus,
      qrCodeBase64: data.qrCodeBase64,
      bitsafiraInstanceId: data.bitsafiraInstanceId,
      bitSafiraToken: data.bitSafiraToken,
      whatsAppInstanceId: data.whatsAppInstanceId,
      bitsafiraInstanceData: data.bitsafiraInstanceData,
    },
    include: { messageTemplates: true },
  });
  return toDomain(updated);
}

export async function getBarbershopById(id: string) {
  const shop = await prisma.barbershop.findUnique({
    where: { id },
    include: { messageTemplates: true },
  });
  return shop ? toDomain(shop) : null;
}

export async function getBarbershopBySlugOrId(slugOrId: string) {
  // tenta primeiro por ID
  const byId = await getBarbershopById(slugOrId);
  if (byId) return byId;

  const normalized = slugify(slugOrId || "");
  if (!normalized) return null;

  const shops = await prisma.barbershop.findMany({ include: { messageTemplates: true } });
  const match = shops.find((shop) => slugify(shop.name) === normalized);
  return match ? toDomain(match) : null;
}

export async function findBarbershopByBitsafiraInstanceId(instanceId: string) {
  const shop = await prisma.barbershop.findFirst({
    where: { bitsafiraInstanceId: instanceId },
    include: { messageTemplates: true },
  });
  return shop ? toDomain(shop) : null;
}

export async function listBarbershops() {
  const shops = await prisma.barbershop.findMany({
    orderBy: { createdAt: "desc" },
    include: { messageTemplates: true },
  });
  return shops.map(toDomain);
}

export async function listBarbershopsByOwner(ownerId: string) {
  const shops = await prisma.barbershop.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: { messageTemplates: true },
  });
  return shops.map(toDomain);
}

export async function deleteBarbershop(id: string) {
  await prisma.barbershop.delete({ where: { id } });
}

export async function deleteBarbershopAndData(barbershopId: string) {
  await prisma.$transaction(async (tx) => {
    // Things that reference barbershopId directly
    await tx.whatsappmessagelog.deleteMany({ where: { barbershopId } });
    await tx.webhook.deleteMany({ where: { barbershopId } });
    await tx.messagetemplate.deleteMany({ where: { barbershopId } });
    await tx.expense.deleteMany({ where: { barbershopId } });

    // Tickets/announcements have optional barbershopId, but may still block deletion
    await tx.ticket.deleteMany({ where: { barbershopId } });
    await tx.announcement.deleteMany({ where: { barbershopId } });

    // Appointments (and their join tables)
    await tx.appointmentservice.deleteMany({ where: { appointment: { barbershopId } } });
    await tx.whatsappmessagequeue.deleteMany({ where: { barbershopId } });
    await tx.appointment.deleteMany({ where: { barbershopId } });

    // People/services
    await tx.barber.deleteMany({ where: { barbershopId } });
    await tx.client.deleteMany({ where: { barbershopId } });
    await tx.service.deleteMany({ where: { barbershopId } });

    await tx.barbershop.delete({ where: { id: barbershopId } });
  });
}
