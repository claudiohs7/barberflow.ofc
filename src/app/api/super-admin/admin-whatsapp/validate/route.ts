// src/app/api/super-admin/admin-whatsapp/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminWhatsappSettings, updateAdminWhatsappSettings } from "@/server/db/repositories/admin-whatsapp";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";
import { extractBitSafiraStatus, mapBitSafiraStatus, normalizeQrCodeBase64 } from "@/lib/bitsafira/status";

export async function POST(request: NextRequest) {
  try {
    const settings = await getAdminWhatsappSettings();
    const bitSafiraToken =
      settings.bitSafiraToken || process.env.BITSAFIRA_ADMIN_TOKEN || process.env.BITSAFIRA_TOKEN;
    const bitsafiraInstanceId =
      settings.bitsafiraInstanceId || process.env.BITSAFIRA_ADMIN_INSTANCE_ID || process.env.BITSAFIRA_INSTANCE_ID;

    if (!bitSafiraToken || !bitsafiraInstanceId) {
      return NextResponse.json(
        { success: false, message: "Token ou instância BitSafira (admin) não configurados." },
        { status: 400 },
      );
    }

    const bitSafira = getBitSafiraApiClient(bitSafiraToken);
    const info = await bitSafira.getInstanceInfo(bitsafiraInstanceId);
    if (info.status !== 200 || !info.dados) {
      return NextResponse.json(
        { success: false, message: info.mensagem || "Falha ao validar instância." },
        { status: info.status || 500 },
      );
    }

    const rawStatus = extractBitSafiraStatus(info.dados);
    const whatsappStatus = mapBitSafiraStatus(rawStatus);
    const qrCodeBase64 = normalizeQrCodeBase64(info.dados.qrCode || info.dados.qr);

    await updateAdminWhatsappSettings({
      whatsappStatus,
      qrCodeBase64: whatsappStatus === "CONNECTED" ? null : qrCodeBase64 ?? null,
      bitsafiraInstanceId,
      instanceData: info.dados,
    });

    const isConnected = whatsappStatus === "CONNECTED";
    return NextResponse.json({
      success: true,
      message: isConnected ? "Instância está conectada." : "Instância está desconectada.",
      data: {
        status: whatsappStatus,
        qrCodeBase64: whatsappStatus === "CONNECTED" ? null : qrCodeBase64 ?? null,
      },
    });
  } catch (error: any) {
    console.error("Erro em /api/super-admin/admin-whatsapp/validate:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao validar.", error: error?.message },
      { status: 500 },
    );
  }
}
