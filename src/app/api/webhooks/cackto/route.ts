
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { addDays, differenceInDays } from 'date-fns';
import {
  getBarbershopById,
  updateBarbershop,
} from '@/server/db/repositories/barbershops';

/**
 * Este é o endpoint do webhook que recebe notificações da plataforma de pagamento (Cackto).
 * Ele inclui uma verificação de segurança usando uma chave secreta.
 */

interface CacktoWebhookPayload {
  event: string;
  data: {
    customer_id: string;
    // Adicionamos o product_id para identificar qual plano foi comprado.
    // Supondo que a Cackto possa enviar esta informação.
    product_id?: string; 
  };
}

// Mapeamento dos IDs de produto da Cackto para os nomes dos planos
const planMapping: { [key: string]: 'Básico' | 'Premium' } = {
  'prod_basico_id_na_cackto': 'Básico', // Substituir pelo ID real
  'prod_premium_id_na_cackto': 'Premium', // Substituir pelo ID real
  '633283': 'Básico', // Exemplo com o ID do link que você passou
  'r33rggt': 'Premium' // ID do link premium (exemplo, precisa ser o ID do produto)
};


const dailyCost = {
    'Básico': 49.90 / 30,
    'Premium': 119.90 / 30
};

export async function POST(req: NextRequest) {
  const cacktoSecret = process.env.CACKTO_WEBHOOK_SECRET;
  const providedSecret = req.headers.get('x-cackto-secret');

  if (!cacktoSecret || !providedSecret || providedSecret !== cacktoSecret) {
    console.warn('AVISO: Tentativa de webhook não autorizada.');
    return NextResponse.json({ success: false, message: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const payload = (await req.json()) as CacktoWebhookPayload;

    console.log('Cackto webhook recebido:', JSON.stringify(payload));
    
    if (payload.event === 'subscription.created' || payload.event === 'charge.paid') {
      const barbershopId = payload.data.customer_id;
      const purchasedPlan = planMapping[payload.data.product_id || ''] || 'Premium';

      if (!barbershopId) {
        return NextResponse.json(
          { success: false, message: 'customer_id não encontrado no payload do webhook.' },
          { status: 400 }
        );
      }

      if (payload.data.customer_id === 'test_customer_id') {
        console.log('Evento de teste recebido com sucesso.');
        return NextResponse.json({ success: true, message: 'Evento de teste recebido.' });
      }

      const barbershop = await getBarbershopById(barbershopId);
      if (!barbershop) {
        console.error(`Webhook error: Barbearia com ID ${barbershopId} não encontrada.`);
        return NextResponse.json(
          { success: false, message: `Barbearia com ID ${barbershopId} não encontrada.` },
          { status: 404 }
        );
      }

      const currentPlan = barbershop.plan || 'Básico';
      const currentExpiry = barbershop.expiryDate ? new Date(barbershop.expiryDate) : null;
      const today = new Date();
      let newExpiryDate: Date;

      if (purchasedPlan === currentPlan) {
        const baseDate = currentExpiry && currentExpiry > today ? currentExpiry : today;
        newExpiryDate = addDays(baseDate, 365);
      } else {
        let remainingCredit = 0;
        if (currentExpiry && currentExpiry > today) {
          const remainingDays = differenceInDays(currentExpiry, today);
          remainingCredit = remainingDays * (dailyCost[currentPlan as keyof typeof dailyCost] || 0);
        }

        const newPlanValue = 365 * dailyCost[purchasedPlan];
        const totalValue = remainingCredit + newPlanValue;
        const totalDays = totalValue / dailyCost[purchasedPlan];

        newExpiryDate = addDays(today, Math.floor(totalDays));
      }

      await updateBarbershop(barbershopId, {
        plan: purchasedPlan,
        status: 'Ativa',
        expiryDate: newExpiryDate,
      });

      console.log(
        `Plano ${purchasedPlan} ativado para a barbearia: ${barbershopId}. Válido até: ${newExpiryDate.toLocaleDateString()}`
      );
    }

    return NextResponse.json({ success: true, message: 'Webhook recebido com sucesso.' });

  } catch (error: any) {
    console.error('Erro ao processar o webhook da Cackto:', error);
    return NextResponse.json({ success: false, message: 'Erro interno no servidor.', error: error.message }, { status: 500 });
  }
}
