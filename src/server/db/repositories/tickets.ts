import prisma from "../client";
import type { SupportTicket, SupportTicketResponse } from "@/lib/definitions";

type TicketInput = Omit<SupportTicket, "id" | "createdAt" | "updatedAt">;
type TicketUpdateInput = Partial<TicketInput>;

type TicketResponseInput = Omit<SupportTicketResponse, "id" | "createdAt"> & { ticketId: string };

function mapStatus(status?: SupportTicket["status"]) {
  switch (status) {
    case "in_progress":
      return "IN_PROGRESS" as const;
    case "closed":
      return "CLOSED" as const;
    case "open":
    default:
      return "OPEN" as const;
  }
}

function toDomain(model: any): SupportTicket {
  return {
    id: model.id,
    title: model.subject,
    description: model.message ?? "",
    status:
      model.status === "CLOSED"
        ? "closed"
        : model.status === "IN_PROGRESS"
        ? "in_progress"
        : "open",
    priority: (model.priority as SupportTicket["priority"]) || "medium",
    category: (model.category as SupportTicket["category"]) || "other",
    createdBy: model.createdByUserId ?? "",
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    assignedTo: undefined,
    barbershopId: model.barbershopId ?? undefined,
    clientEmail: model.clientEmail ?? "",
    clientName: model.clientName ?? "",
  };
}

function toResponse(model: any): SupportTicketResponse {
  return {
    id: model.id,
    message: model.message,
    createdBy: model.authorUserId ?? "",
    createdAt: model.createdAt,
    isAdmin: !!model.isAdmin,
  };
}

export async function listTickets(barbershopId?: string) {
  const data = await prisma.ticket.findMany({
    where: barbershopId ? { barbershopId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return data.map(toDomain);
}

export async function createTicket(input: TicketInput) {
  const created = await prisma.ticket.create({
    data: {
      barbershopId: input.barbershopId,
      subject: input.title,
      message: input.description,
      status: mapStatus(input.status),
      priority: input.priority,
      category: input.category,
      createdByUserId: input.createdBy,
      clientEmail: input.clientEmail,
      clientName: input.clientName,
    },
  });
  return toDomain(created);
}

export async function updateTicket(id: string, input: TicketUpdateInput) {
  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      subject: input.title,
      message: input.description,
      status: input.status ? mapStatus(input.status) : undefined,
      priority: input.priority,
      category: input.category,
      clientEmail: input.clientEmail,
      clientName: input.clientName,
      barbershopId: input.barbershopId,
    },
  });
  return toDomain(updated);
}

export async function deleteTicket(id: string) {
  await prisma.ticket.delete({ where: { id } });
}

export async function addTicketResponse(input: TicketResponseInput) {
  const created = await prisma.ticketResponse.create({
    data: {
      ticketId: input.ticketId,
      message: input.message,
      authorUserId: input.createdBy,
      isAdmin: input.isAdmin,
    },
  });
  return toResponse(created);
}

export async function listTicketResponses(ticketId: string) {
  const data = await prisma.ticketResponse.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
  });
  return data.map(toResponse);
}
