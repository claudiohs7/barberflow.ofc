import { NextResponse } from "next/server";
import type { MessageTemplate } from "@/lib/definitions";
import { replaceTemplates } from "@/server/db/repositories/message-templates";

interface RequestBody {
  barbershopId?: string;
  messageTemplates?: MessageTemplate[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    if (!body.barbershopId) {
      return NextResponse.json(
        { error: "Barbearia não encontrada" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.messageTemplates)) {
      return NextResponse.json(
        { error: "Os modelos de mensagem devem ser enviados como um array." },
        { status: 400 }
      );
    }

    const templates = body.messageTemplates.map((template) => ({
      ...template,
      enabled: !!template.enabled,
      reminderHoursBefore:
        typeof (template as any).reminderHoursBefore === "number"
          ? (template as any).reminderHoursBefore
          : null,
    }));

    const updatedTemplates = await replaceTemplates(body.barbershopId, templates);

    return NextResponse.json({ data: updatedTemplates });
  } catch (error: any) {
    console.error("POST /api/message-templates/update error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar os modelos." },
      { status: 500 }
    );
  }
}
