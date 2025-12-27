// src/app/api/super-admin/admin-whatsapp/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminWhatsappSettings, updateAdminWhatsappSettings } from "@/server/db/repositories/admin-whatsapp";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import { mapBitSafiraStatus, extractBitSafiraStatus, normalizeQrCodeBase64 } from "@/lib/bitsafira/status";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await getAdminWhatsappSettings();

    const bitSafiraToken =
      body.bitSafiraToken || settings.bitSafiraToken || process.env.BITSAFIRA_ADMIN_TOKEN || process.env.BITSAFIRA_TOKEN;
    let instanceId =
      body.bitsafiraInstanceId ||
      settings.bitsafiraInstanceId ||
      process.env.BITSAFIRA_ADMIN_INSTANCE_ID ||
      process.env.BITSAFIRA_INSTANCE_ID;

    if (!bitSafiraToken) {
      return NextResponse.json({ success: false, message: "Token BitSafira não configurado." }, { status: 400 });
    }
    if (!instanceId) {
      return NextResponse.json({ success: false, message: "Instância BitSafira não informada." }, { status: 400 });
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);

    const connectResponse = await bitSafira.connectInstance({ id: instanceId });
    if (![200, 201].includes(connectResponse.status || 500)) {
      return NextResponse.json(
        { success: false, message: connectResponse.mensagem || connectResponse.message || "Falha ao conectar." },
        { status: connectResponse.status || 500 },
      );
    }

    const rawStatus = extractBitSafiraStatus(connectResponse.dados);
    const whatsappStatus = mapBitSafiraStatus(rawStatus);
    const qrCodeBase64 = normalizeQrCodeBase64(connectResponse.dados?.qrCode || connectResponse.dados?.qr) ?? null;

    if (whatsappStatus === "CONNECTED") {
      // se já vier conectado, não precisamos de QR
    }

    await updateAdminWhatsappSettings({
      bitsafiraInstanceId: instanceId,
      bitSafiraToken,
      whatsappStatus,
      qrCodeBase64,
      instanceData: connectResponse.dados,
    });

    return NextResponse.json({
      success: true,
      message: connectResponse.mensagem || "Instância conectada/QR gerado.",
      data: {
        bitsafiraInstanceId: instanceId,
        whatsappStatus,
        qrCodeBase64,
      },
    });
  } catch (error: any) {
    console.error("Erro em /api/super-admin/admin-whatsapp/connect:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao conectar.", error: error?.message },
      { status: 500 },
    );
  }
}
