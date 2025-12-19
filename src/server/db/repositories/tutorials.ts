import prisma from "../client";

export type TutorialVideoInput = {
  title: string;
  description?: string | null;
  youtubeUrl: string;
  youtubeId?: string | null;
  targetEmail?: string | null;
  enabled?: boolean;
};

export function extractYoutubeId(rawUrl: string): string | null {
  const value = (rawUrl || "").trim();
  if (!value) return null;

  // If user pasted only the ID
  if (/^[a-zA-Z0-9_-]{6,}$/.test(value) && !value.includes("http")) {
    return value;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.replace("/", "").trim();
      return id || null;
    }

    if (host.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      // /embed/:id
      if (parts[0] === "embed" && parts[1]) return parts[1];
      // /shorts/:id
      if (parts[0] === "shorts" && parts[1]) return parts[1];
      // /live/:id
      if (parts[0] === "live" && parts[1]) return parts[1];
    }
  } catch {
    // ignore
  }

  return null;
}

function normalizeEmail(email?: string | null) {
  const value = (email || "").trim().toLowerCase();
  return value || null;
}

export async function listTutorialVideosForEmail(email: string | null) {
  const normalized = normalizeEmail(email);
  return prisma.tutorialvideo.findMany({
    where: {
      enabled: true,
      ...(normalized ? { OR: [{ targetEmail: null }, { targetEmail: normalized }] } : { targetEmail: null }),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllTutorialVideos() {
  return prisma.tutorialvideo.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createTutorialVideo(input: TutorialVideoInput) {
  return prisma.tutorialvideo.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      youtubeUrl: input.youtubeUrl,
      youtubeId: input.youtubeId ?? null,
      targetEmail: normalizeEmail(input.targetEmail),
      enabled: input.enabled ?? true,
    },
  });
}

export async function updateTutorialVideo(id: string, input: Partial<TutorialVideoInput>) {
  return prisma.tutorialvideo.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      youtubeUrl: input.youtubeUrl,
      youtubeId: input.youtubeId,
      targetEmail: input.targetEmail !== undefined ? normalizeEmail(input.targetEmail) : undefined,
      enabled: input.enabled,
    },
  });
}

export async function deleteTutorialVideo(id: string) {
  await prisma.tutorialvideo.delete({ where: { id } });
}

