import { NextRequest, NextResponse } from "next/server";
import { addDays, startOfDay } from "date-fns";
import { getBarbershopBySlugOrId, updateBarbershop } from "@/server/db/repositories/barbershops";

type PushinWebhookPayload = {
  id?: string;
  status?: string;
  value?: number;
  qr_code?: string;
  qr_code_base64?: string;
  webhook_url?: string;
  end_to_end_id?: string;
  payer_name?: string;
  payer_national_registration?: string;
};

export async function POST(req: NextRequest) {
  const barbershopId = req.nextUrl.searchParams.get("barbershopId");
  const providedSecret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.PUSHIN_PAY_WEBHOOK_SECRET;
  const providedHeaderToken = req.headers.get("x-pushinpay-token");
  const expectedHeaderToken = process.env.PUSHIN_PAY_WEBHOOK_TOKEN;

  if (!barbershopId) {
    return NextResponse.json({ success: false, message: "barbershopId ausente" }, { status: 200 });
  }

  if (expectedSecret && expectedSecret !== providedSecret) {
    return NextResponse.json({ success: false, message: "Nao autorizado" }, { status: 401 });
  }

  if (expectedHeaderToken && providedHeaderToken !== expectedHeaderToken) {
    return NextResponse.json({ success: false, message: "Token de webhook invalido" }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as PushinWebhookPayload;
    const status = (payload.status || "").toLowerCase();

    if (status === "paid") {
      const shop = await getBarbershopBySlugOrId(barbershopId);
      if (shop) {
        const newExpiry = addDays(startOfDay(new Date()), 30);
        await updateBarbershop(barbershopId, {
          plan: "Premium",
          status: "Ativa",
          expiryDate: newExpiry,
        });
        return NextResponse.json({ success: true, barbershop: shop, expiryDate: newExpiry.toISOString() });
      }
      // Mesmo sem shop, devolve 200 para não reprocessar em loop
      return NextResponse.json({ success: false, message: "Barbearia nao encontrada" });
    }

    return NextResponse.json({ success: true, message: "Evento recebido.", status: payload.status });
  } catch (error: any) {
    console.error("POST /api/webhooks/pushinpay error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar webhook." },
      { status: 500 }
    );
  }
}

// Permite teste rápido de reachability via GET
export async function GET(req: NextRequest) {
  const barbershopId = req.nextUrl.searchParams.get("barbershopId");
  const providedSecret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.PUSHIN_PAY_WEBHOOK_SECRET;
  const providedHeaderToken = req.headers.get("x-pushinpay-token");
  const expectedHeaderToken = process.env.PUSHIN_PAY_WEBHOOK_TOKEN;

  if (expectedSecret && expectedSecret !== providedSecret) {
    return NextResponse.json({ success: false, message: "Nao autorizado" }, { status: 401 });
  }
  if (expectedHeaderToken && providedHeaderToken !== expectedHeaderToken) {
    return NextResponse.json({ success: false, message: "Token de webhook invalido" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    message: "Webhook pushinpay ativo",
    barbershopId,
  });
}
