import { NextResponse } from "next/server";
import { listBarbershops } from "@/server/db/repositories/barbershops";
import { processReminderQueueForBarbershop } from "@/server/reminders/run-reminders";

export async function POST() {
  try {
    const barbershops = await listBarbershops();
    const results: Array<{
      barbershopId: string;
      message?: string;
      processed?: number;
      skipped?: number;
      error?: string;
    }> = [];

    let totalProcessed = 0;
    let totalSkipped = 0;

    for (const shop of barbershops) {
      try {
        const result = await processReminderQueueForBarbershop(shop.id);
        results.push({ barbershopId: shop.id, ...result });
        totalProcessed += result.processed || 0;
        totalSkipped += result.skipped || 0;
      } catch (error: any) {
        results.push({
          barbershopId: shop.id,
          error: error?.message || "Erro ao processar barbearia.",
        });
      }
    }

    return NextResponse.json({
      message: "Processo de lembretes concluido.",
      processed: totalProcessed,
      skipped: totalSkipped,
      results,
    });
  } catch (error: any) {
    console.error("Erro ao processar lembretes para todas as barbearias:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar lembretes." },
      { status: 500 }
    );
  }
}
