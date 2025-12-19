import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { getMimeFromExt } from "@/lib/site-assets";
import { getSiteAppearance } from "@/server/db/repositories/site-appearance";

export const dynamic = "force-dynamic";

function pickVariant(req: NextRequest): "desktop" | "mobile" {
  const v = (req.nextUrl.searchParams.get("variant") || "desktop").toLowerCase();
  return v === "mobile" ? "mobile" : "desktop";
}

async function readFallbackSvg() {
  const abs = path.join(process.cwd(), "public", "hero.svg");
  const data = await fs.readFile(abs);
  return { data, contentType: "image/svg+xml" };
}

async function readFileFromRelative(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const abs = path.join(process.cwd(), normalized.split("/").join(path.sep));
  const data = await fs.readFile(abs);
  const ext = path.extname(abs).replace(".", "").toLowerCase();
  return { data, contentType: getMimeFromExt(ext) };
}

export async function GET(req: NextRequest) {
  try {
    const variant = pickVariant(req);
    const appearance = await getSiteAppearance();
    const relativePath = variant === "mobile" ? appearance?.homeHeroMobilePath : appearance?.homeHeroDesktopPath;

    let result: { data: Buffer; contentType: string };
    if (relativePath) {
      result = await readFileFromRelative(relativePath);
    } else {
      result = await readFallbackSvg();
    }

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // If something went wrong, fallback to bundled SVG
    const fallback = await readFallbackSvg();
    return new NextResponse(fallback.data, {
      status: 200,
      headers: {
        "Content-Type": fallback.contentType,
        "Cache-Control": "no-store",
      },
    });
  }
}
