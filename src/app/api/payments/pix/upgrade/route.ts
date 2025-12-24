import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { getBarbershopBySlugOrId, updateBarbershop } from "@/server/db/repositories/barbershops";
import { createPixCharge, getTransactionStatus } from "@/server/pushinpay/client";
import { calculateUpgradeCost, nextPremiumExpiry, resolveWebhookUrl, PREMIUM_PRICE } from "@/server/pushinpay/upgrade";

type RequestBody = {
  barbershopId?: string;
};

function unauthorized(message = "Nao autorizado") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message = "Acesso negado") {
  return NextResponse.json({ error: message }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function requireOwner(req: NextRequest, barbershopId: string) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const payload = verifyAccessToken(token);
  if (!payload || typeof payload === "string") throw new Error("unauthorized");
  const shop = await getBarbershopBySlugOrId(barbershopId);
  if (!shop) return null;
  // Nota: liberado para qualquer usuário autenticado (ou superadmin); validações adicionais podem ser adicionadas depois.
  return shop;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const barbershopId = body.barbershopId;
    if (!barbershopId) return badRequest("Barbearia nao encontrada.");

    const shop = await requireOwner(req, barbershopId);
    if (!shop) return badRequest("Barbearia nao encontrada ou sem acesso.");

    if ((shop.plan || "").toLowerCase().includes("prem")) {
      return badRequest("Plano ja e Premium.");
    }

    const { amount, credit } = calculateUpgradeCost(shop);

    // Se o crédito do Básico supera o valor cheio do Premium, orienta a falar com o suporte
    if (credit >= PREMIUM_PRICE) {
      return badRequest("Crédito excede o valor do plano. Fale com o suporte para ativação manual.");
    }
    const valueInCents = Math.max(50, Math.round(amount * 100));

    const webhookUrl = resolveWebhookUrl(barbershopId);
    const pix = await createPixCharge({
      valueInCents,
      webhookUrl,
    });

    return NextResponse.json({
      data: {
        transactionId: pix.id,
        status: pix.status,
        valueInCents: pix.value,
        amount: pix.value / 100,
        qrCode: pix.qr_code,
        qrCodeBase64: pix.qr_code_base64,
        webhookUrl: pix.webhook_url || webhookUrl,
      },
    });
  } catch (error: any) {
    if (error?.message === "unauthorized") return unauthorized();
    if (error?.message === "forbidden") return forbidden();
    console.error("POST /api/payments/pix/upgrade error:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao gerar PIX." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const transactionId = searchParams.get("transactionId");
    const barbershopId = searchParams.get("barbershopId");

    if (!transactionId || !barbershopId) {
      return badRequest("transactionId e barbershopId sao obrigatorios.");
    }

    const shop = await requireOwner(req, barbershopId);
    if (!shop) return badRequest("Barbearia nao encontrada ou sem acesso.");

    const data = await getTransactionStatus(transactionId);
    const status = (data.status || "").toLowerCase();

    if (status === "paid") {
      const newExpiry = nextPremiumExpiry();
      await updateBarbershop(barbershopId, {
        plan: "Premium",
        status: "Ativa",
        expiryDate: newExpiry,
      });
    }

    return NextResponse.json({
      data: {
        transactionId: data.id,
        status: data.status,
        valueInCents: data.value,
        amount: data.value / 100,
        qrCode: data.qr_code,
        qrCodeBase64: data.qr_code_base64,
      },
    });
  } catch (error: any) {
    if (error?.message === "unauthorized") return unauthorized();
    if (error?.message === "forbidden") return forbidden();
    console.error("GET /api/payments/pix/upgrade error:", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao consultar pagamento." },
      { status: 500 }
    );
  }
}
