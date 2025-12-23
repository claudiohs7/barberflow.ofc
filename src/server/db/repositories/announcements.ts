import prisma from "../client";
import type { SystemMessage } from "@/lib/definitions";

export async function listAnnouncements(limit = 5) {
  const query: Parameters<typeof prisma.announcement.findMany>[0] = {
    orderBy: { createdAt: "desc" },
  };

  if (Number.isFinite(limit) && limit > 0) {
    query.take = limit;
  }

  const data = await prisma.announcement.findMany(query);
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

export async function updateAnnouncement(id: string, content: string) {
  const updated = await prisma.announcement.update({
    where: { id },
    data: { content },
  });
  return {
    id: updated.id,
    content: updated.content,
    createdAt: updated.createdAt,
  };
}

export async function deleteAnnouncement(id: string) {
  await prisma.announcement.delete({ where: { id } });
  return { success: true };
}
