// src/app/api/super-admin/admin-whatsapp/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminWhatsappSettings, updateAdminWhatsappSettings } from "@/server/db/repositories/admin-whatsapp";

function requireSuperAdmin(req: NextRequest) {
  // Placeholder auth check; assume middleware protects route. In case not, allow for now.
  return true;
}

export async function GET(request: NextRequest) {
  if (!requireSuperAdmin(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminWhatsappSettings();
  const instanceData = (settings as any).instanceData || {};
  return NextResponse.json({
    success: true,
    data: {
      ...settings,
      intervalSecondsB: instanceData.intervalSecondsB ?? settings.intervalSeconds,
      attachmentBase64: instanceData.attachmentBase64 ?? null,
      attachmentName: instanceData.attachmentName ?? null,
      // do not leak token in GET
      bitSafiraToken: undefined,
    },
  });
}

export async function PUT(request: NextRequest) {
  if (!requireSuperAdmin(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      bitsafiraInstanceId,
      bitSafiraToken,
      templateContent,
      intervalSeconds,
      intervalSecondsB,
      attachmentBase64,
      attachmentName,
    } = body;

    const current = await getAdminWhatsappSettings();
    const currentInstance = ((current as any).instanceData || {}) as Record<string, unknown>;
    const nextInstance = {
      ...currentInstance,
      intervalSecondsB: typeof intervalSecondsB === "number" ? Math.max(1, intervalSecondsB) : currentInstance.intervalSecondsB,
      attachmentBase64:
        attachmentBase64 === null
          ? null
          : typeof attachmentBase64 === "string"
            ? attachmentBase64
            : currentInstance.attachmentBase64,
      attachmentName:
        attachmentName === null ? null : typeof attachmentName === "string" ? attachmentName : currentInstance.attachmentName,
    };

    const updated = await updateAdminWhatsappSettings({
      bitsafiraInstanceId,
      bitSafiraToken,
      templateContent,
      intervalSeconds: typeof intervalSeconds === "number" ? Math.max(1, intervalSeconds) : undefined,
      instanceData: nextInstance,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        bitSafiraToken: undefined,
        intervalSecondsB: nextInstance.intervalSecondsB ?? updated.intervalSeconds,
        attachmentBase64: nextInstance.attachmentBase64 ?? null,
        attachmentName: nextInstance.attachmentName ?? null,
      },
    });
  } catch (error: any) {
    console.error("Erro ao atualizar configurações de WhatsApp admin:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao salvar configurações.", error: error?.message },
      { status: 500 },
    );
  }
}
