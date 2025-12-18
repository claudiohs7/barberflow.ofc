import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { deleteBarbershopFully } from "@/server/services/barbershop-deletion";
import { getBarbershopBySlugOrId, updateBarbershop } from "@/server/db/repositories/barbershops";

interface Params {
  params: {
    id: string;
  };
}

export async function GET(_: Request, { params }: Params) {
  const { id } = params || {};
  if (!id) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  try {
    const shop = await getBarbershopBySlugOrId(id);
    if (!shop) {
      return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
    }
    return NextResponse.json({ data: shop });
  } catch (error: any) {
    console.error("GET /api/barbershops/[id] error:", error);
    return NextResponse.json({ error: "Erro ao buscar barbearia" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = params || {};
  if (!id) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }
  try {
    const payload = await req.json();
    const updatePayload: Record<string, any> = {};
    if (payload.name) updatePayload.name = payload.name;
    if (payload.legalName) updatePayload.legalName = payload.legalName;
    if (payload.cpfCnpj) updatePayload.cpfCnpj = payload.cpfCnpj;
    if (payload.email) updatePayload.email = payload.email;
    if (payload.phone) updatePayload.phone = payload.phone;
    if (payload.description) updatePayload.description = payload.description;
    if (payload.plan) updatePayload.plan = payload.plan;
    if (payload.status) updatePayload.status = payload.status;
    if (payload.status === "Inativa" && !payload.expiryDate) {
      updatePayload.expiryDate = new Date().toISOString();
    } else if (payload.expiryDate) {
      updatePayload.expiryDate = new Date(payload.expiryDate);
    }
    if (payload.logoUrl !== undefined) updatePayload.logoUrl = payload.logoUrl;
    if (payload.address) updatePayload.address = payload.address;
    if (payload.operatingHours) updatePayload.operatingHours = payload.operatingHours;
    const updated = await updateBarbershop(id, updatePayload);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PATCH /api/barbershops/[id] error:", error);
    const message = error?.message || "Erro ao atualizar barbearia";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = params || {};
  if (!id) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload || typeof payload === "string") {
      return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 401 });
    }
    if ((payload as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Apenas Superadmins podem excluir barbearias." }, { status: 403 });
    }

    await deleteBarbershopFully(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/barbershops/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao excluir barbearia" }, { status: 500 });
  }
}

