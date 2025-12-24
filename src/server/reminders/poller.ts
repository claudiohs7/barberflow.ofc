import prisma from "@/server/db/client";
import { syncReminderQueueForBarbershop } from "@/server/reminders/reminder-queue";
import { processReminderQueueForBarbershop } from "@/server/reminders/run-reminders";

// Evita multiplos intervalos em hot-reload ou rotas chamadas varias vezes
const globalAny = globalThis as typeof globalThis & { __reminderPoller?: NodeJS.Timer };

async function tick() {
  try {
    const shops = await prisma.barbershop.findMany({
      select: { id: true },
      where: { id: { not: undefined as any } }, // evita prisma validation quando where vazio
    });

    for (const shop of shops) {
      try {
        await syncReminderQueueForBarbershop(shop.id);
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
  // roda a cada 60 segundos para ficar mais proximo do horario agendado
  globalAny.__reminderPoller = setInterval(() => {
    void tick();
  }, 60 * 1000);

  // primeira rodada imediata para nao esperar o primeiro intervalo
  void tick();
}

export {};
