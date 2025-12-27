// src/app/api/super-admin/admin-whatsapp/broadcast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminWhatsappSettings, updateAdminWhatsappSettings } from "@/server/db/repositories/admin-whatsapp";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import { listBarbershops } from "@/server/db/repositories/barbershops";

type BroadcastRequest = {
  message?: string;
  intervalSeconds?: number;
  intervalSecondsA?: number;
  intervalSecondsB?: number;
  excludeIds?: string[];
  imageBase64?: string;
  imageFilename?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeInterval(value?: number, fallback?: number) {
  const v = typeof value === "number" ? Math.min(Math.max(Math.floor(value), 1), 300) : undefined;
  return v ?? fallback ?? 10;
}

function parseImagePayload(body: BroadcastRequest) {
  if (!body.imageBase64) return undefined;
  const dataUrl = body.imageBase64;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  const base64 = match ? match[2] : dataUrl;
  const mime = match ? match[1] : undefined;
  const ext = mime ? mime.split("/").pop() : body.imageFilename?.split(".").pop();
  return {
    tipo: 1,
    descricao: body.imageFilename || "imagem",
    formato: ext || "png",
    base64,
  };
}

export async function POST(request: NextRequest) {
  // TODO: enforce super-admin auth; assume middleware protects for now
  try {
    const body = (await request.json()) as BroadcastRequest;
    const settings = await getAdminWhatsappSettings();
    const instanceData = (settings as any).instanceData || {};

    const bitSafiraToken = settings.bitSafiraToken || process.env.BITSAFIRA_ADMIN_TOKEN || process.env.BITSAFIRA_TOKEN;
    const bitsafiraInstanceId =
      settings.bitsafiraInstanceId || process.env.BITSAFIRA_ADMIN_INSTANCE_ID || process.env.BITSAFIRA_INSTANCE_ID;

    if (!bitSafiraToken || !bitsafiraInstanceId) {
      return NextResponse.json(
        { success: false, message: "Token ou instância BitSafira (admin) não configurados." },
        { status: 400 },
      );
    }

    const templateMessage = (body.message ?? settings.templateContent ?? "").trim();
    if (!templateMessage) {
      return NextResponse.json(
        { success: false, message: "Informe uma mensagem para disparo (template vazio)." },
        { status: 400 },
      );
    }

    const intervalA = sanitizeInterval(body.intervalSecondsA ?? body.intervalSeconds, settings.intervalSeconds);
    const intervalB = sanitizeInterval(
      body.intervalSecondsB,
      typeof instanceData.intervalSecondsB === "number" ? instanceData.intervalSecondsB : settings.intervalSeconds,
    );
    const intervals = [intervalA, intervalB].filter((v, idx, arr) => typeof v === "number" && arr.indexOf(v) === idx);
    const imagePayload = parseImagePayload(body);

    // Persist interval/template if provided ad-hoc
    await updateAdminWhatsappSettings({
      templateContent: templateMessage,
      intervalSeconds: intervalA,
      bitsafiraInstanceId,
      bitSafiraToken,
    });

    // Buscar barbearias e números dos donos
    const shops = await listBarbershops();
    const excludeSet = new Set((body.excludeIds || []).filter(Boolean));
    const targets = shops
      .map((shop) => ({
        id: shop.id,
        name: shop.name,
        phone: (shop.phone || "").replace(/\D/g, ""),
      }))
      .filter((t) => t.phone.length >= 10)
      .filter((t) => !excludeSet.has(t.id));

    if (!targets.length) {
      return NextResponse.json({ success: false, message: "Nenhum número de barbearia encontrado." }, { status: 404 });
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);
    const results: Array<{ barbershopId: string; phone: string; status: "sent" | "error"; error?: string }> = [];

    for (const target of targets) {
      try {
        const phone = target.phone.startsWith("55") ? target.phone : `55${target.phone}`;
        const payload: any = {
          idInstancia: bitsafiraInstanceId,
          whatsapp: phone,
          envioImediato: 1,
        };

        if (imagePayload) {
          payload.arquivo = { ...imagePayload, descricao: templateMessage };
          payload.texto = templateMessage; // envia legenda junto
        } else {
          payload.texto = templateMessage;
        }

        const res = await bitSafira.sendMessage(payload as any);
        if ([200, 201].includes(res.status)) {
          results.push({ barbershopId: target.id, phone, status: "sent" });
        } else {
          results.push({
            barbershopId: target.id,
            phone,
            status: "error",
            error: res.mensagem || res.message || "Falha desconhecida",
          });
        }
      } catch (err: any) {
        results.push({
          barbershopId: target.id,
          phone: target.phone,
          status: "error",
          error: err?.message || "Erro ao enviar",
        });
      }

      // intervalo entre disparos (alternando entre as opções fornecidas)
      const currentInterval = intervals.length ? intervals[results.length % intervals.length] : intervalA;
      await sleep(currentInterval * 1000);
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.length - sent;

    return NextResponse.json({
      success: failed === 0,
      message: `Disparo concluído. Sucesso: ${sent}, Falhas: ${failed}.`,
      data: results,
    });
  } catch (error: any) {
    console.error("Erro no broadcast WhatsApp admin:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao disparar mensagens.", error: error?.message },
      { status: 500 },
    );
  }
}
