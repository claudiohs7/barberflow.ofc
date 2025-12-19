
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { addDays, differenceInDays } from 'date-fns';
import {
  getBarbershopById,
  updateBarbershop,
} from '@/server/db/repositories/barbershops';

const dailyCostBasic = 49.90 / 30;
const dailyCostPremium = 119.90 / 30;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("INFO: Mercado Pago Webhook Received:", JSON.stringify(body, null, 2));

        const topic = body.type;
        const paymentId = body.data?.id;

        if (topic === 'payment' && paymentId) {
            const token = process.env.MP_ACCESS_TOKEN;
            if (!token) {
                console.error("CRITICAL: MP_ACCESS_TOKEN não está configurado no servidor.");
                return NextResponse.json(
                    { success: false, message: 'Configuração do servidor de pagamento incompleta.' },
                    { status: 200 }
                );
            }

            const client = new MercadoPagoConfig({ accessToken: token });
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: paymentId });

            console.log(`INFO: Fetched Payment Status for ${paymentId}: ${paymentInfo.status}`);

            if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
                const barbershopId = paymentInfo.external_reference;
                const barbershop = await getBarbershopById(barbershopId);
                if (!barbershop) {
                    console.error(`ERROR: Webhook - Barbershop with ID ${barbershopId} not found.`);
                    return NextResponse.json(
                        { success: false, message: `Barbershop ${barbershopId} not found.` },
                        { status: 200 }
                    );
                }

                if (barbershop.plan === 'Premium') {
                    console.log(`INFO: Barbershop ${barbershopId} is already on the Premium plan. No update needed.`);
                    return NextResponse.json({ success: true, message: 'Plan is already Premium.' }, { status: 200 });
                }

                const upgradeAmountPaid = paymentInfo.transaction_amount || 0;
                let newExpiryDate: Date;
                const currentExpiry = barbershop.expiryDate ? new Date(barbershop.expiryDate) : null;
                const today = new Date();

                if (currentExpiry && currentExpiry > today) {
                    const remainingDays = differenceInDays(currentExpiry, today);
                    const remainingCredit = remainingDays * dailyCostBasic;
                    const totalValueForPremium = remainingCredit + upgradeAmountPaid;
                    const daysToAdd = totalValueForPremium / dailyCostPremium;
                    newExpiryDate = addDays(today, Math.floor(daysToAdd));
                } else {
                    const daysToAdd = upgradeAmountPaid / dailyCostPremium;
                    newExpiryDate = addDays(today, Math.floor(daysToAdd));
                }

                await updateBarbershop(barbershopId, {
                    plan: 'Premium',
                    status: 'Ativa',
                    expiryDate: newExpiryDate,
                });

                console.log(`SUCCESS: Premium plan activated for barbershop: ${barbershopId}. Valid until: ${newExpiryDate.toLocaleDateString()}`);
            } else {
                 console.log(`INFO: Payment ${paymentId} not approved or no external reference. Status: ${paymentInfo.status}`);
            }
        }
        
        return NextResponse.json({ success: true, message: 'Webhook received.' }, { status: 200 });

    } catch (error: any) {
        console.error('ERROR: Could not process Mercado Pago webhook:', error);
        return NextResponse.json({ success: false, message: 'Internal server error.', error: error.message }, { status: 500 });
    }
}
