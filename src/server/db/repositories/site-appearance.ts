import prisma from "../client";

const SINGLETON_ID = 1;

export async function getSiteAppearance() {
  return prisma.siteappearance.findUnique({ where: { id: SINGLETON_ID } });
}

export async function upsertSiteAppearance(data: {
  homeHeroDesktopPath?: string | null;
  homeHeroMobilePath?: string | null;
}) {
  return prisma.siteappearance.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      homeHeroDesktopPath: data.homeHeroDesktopPath ?? null,
      homeHeroMobilePath: data.homeHeroMobilePath ?? null,
    },
    update: {
      homeHeroDesktopPath: data.homeHeroDesktopPath ?? undefined,
      homeHeroMobilePath: data.homeHeroMobilePath ?? undefined,
    },
  });
}

