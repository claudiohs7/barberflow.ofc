import prisma from "@/server/db/client";
import { processReminderQueueForBarbershop } from "@/server/reminders/run-reminders";

// Evita múltiplos intervalos em hot-reload ou rotas chamadas várias vezes
const globalAny = globalThis as typeof globalThis & { __reminderPoller?: NodeJS.Timer };

async function tick() {
  try {
    const shops = await prisma.barbershop.findMany({
      select: { id: true },
      where: { id: { not: undefined as any } }, // evita prisma validation quando where vazio
    });

    for (const shop of shops) {
      try {
        await processReminderQueueForBarbershop(shop.id);
      } catch (shopErr) {
        console.warn(`[reminder-poller] Falha ao processar fila da barbearia ${shop.id}:`, shopErr);
      }
    }
  } catch (err) {
    console.warn("[reminder-poller] Falha ao listar barbearias:", err);
  }
}

if (!globalAny.__reminderPoller) {
  // roda a cada 5 minutos
  globalAny.__reminderPoller = setInterval(() => {
    void tick();
  }, 5 * 60 * 1000);

  // primeira rodada imediata para não esperar 5 minutos
  void tick();
}

export {};
