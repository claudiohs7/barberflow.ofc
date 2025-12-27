// src/app/api/super-admin/admin-whatsapp/disconnect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminWhatsappSettings, updateAdminWhatsappSettings } from "@/server/db/repositories/admin-whatsapp";
import { getBitSafiraApiClient } from "@/lib/bitsafira/api";

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
    const res = await bitSafira.disconnectInstance({ id: bitsafiraInstanceId });

    await updateAdminWhatsappSettings({
      whatsappStatus: "DISCONNECTED",
      qrCodeBase64: null,
    });

    if (![200, 201].includes(res.status || 500)) {
      return NextResponse.json(
        { success: false, message: res.mensagem || res.message || "Falha ao desconectar." },
        { status: res.status || 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: res.mensagem || "Instância desconectada.",
    });
  } catch (error: any) {
    console.error("Erro em /api/super-admin/admin-whatsapp/disconnect:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao desconectar.", error: error?.message },
      { status: 500 },
    );
  }
}
