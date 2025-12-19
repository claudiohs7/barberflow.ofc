import prisma from "../client";
import type { SystemMessage } from "@/lib/definitions";

export async function listAnnouncements(limit = 5) {
  const data = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return data.map<SystemMessage>((announcement) => ({
    id: announcement.id,
    content: announcement.content,
    createdAt: announcement.createdAt,
  }));
}

type AnnouncementInput = {
  title?: string;
  content: string;
  createdByUserId?: string;
};

export async function createAnnouncement(input: AnnouncementInput) {
  const created = await prisma.announcement.create({
    data: {
      id: crypto.randomUUID(),
      title: input.title || "Aviso do Sistema",
      content: input.content,
      createdByUserId: input.createdByUserId ?? undefined,
    },
  });
  return {
    id: created.id,
    content: created.content,
    createdAt: created.createdAt,
  };
}
