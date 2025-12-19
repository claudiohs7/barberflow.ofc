
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';


export async function POST(req: NextRequest) {
    try {
        const { amount, barbershopId, ownerData } = await req.json();

        // Acessa o token do Mercado Pago de uma variável de ambiente. Use um fallback para desenvolvimento.
        const token = process.env.MP_ACCESS_TOKEN;

        if (!token) {
             console.error("MP_ACCESS_TOKEN não está configurado nas variáveis de ambiente.");
             return NextResponse.json({ success: false, message: 'Configuração do servidor de pagamento incompleta.' }, { status: 500 });
        }
        
        if (!amount || !barbershopId || !ownerData) {
            return NextResponse.json({ success: false, message: 'Dados incompletos para gerar pagamento.' }, { status: 400 });
        }
        
        const { email, cpfCnpj, legalName } = ownerData;

        if (!email || !cpfCnpj || !legalName) {
            return NextResponse.json({ success: false, message: 'Dados do proprietário (e-mail, nome, CPF/CNPJ) estão incompletos.' }, { status: 400 });
        }
        
        const nameParts = legalName.trim().split(/\s+/);
        const firstName = nameParts.shift() || 'Cliente';
        const lastName = nameParts.join(' ') || 'BarberFlow';
        
        // Usa a variável de ambiente para a URL do site ou um valor padrão de produção
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://barberflow.app';
        const notificationUrl = `${baseUrl}/api/webhooks/mercadopago`;


        const client = new MercadoPagoConfig({ accessToken: token });
        const payment = new Payment(client);

        const paymentData = {
            transaction_amount: Number(amount.toFixed(2)),
            description: 'Upgrade para o plano Premium - BarberFlow',
            payment_method_id: 'pix',
            payer: {
                email: email,
                first_name: firstName,
                last_name: lastName,
                identification: {
                    type: cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
                    number: cpfCnpj.replace(/\D/g, ''),
                },
            },
            external_reference: barbershopId, // Usamos o ID da barbearia como referência
            notification_url: notificationUrl, // URL para onde o Mercado Pago enviará as notificações
        };

        const response = await payment.create({ body: paymentData });
        
        const qrCodeBase64 = response.point_of_interaction?.transaction_data?.qr_code_base64;
        const qrCode = response.point_of_interaction?.transaction_data?.qr_code;
        const paymentId = response.id;


        if (!qrCodeBase64 || !qrCode || !paymentId) {
             throw new Error('Resposta da API do Mercado Pago não continha os dados do QR Code ou ID do pagamento.');
        }

        return NextResponse.json({ success: true, qrCodeBase64, qrCode, paymentId });

    } catch (error: any) {
        console.error('Erro ao criar pagamento PIX:', error?.cause || error.message);
        const errorMessage = error.cause?.error?.message || error.message || 'Erro desconhecido ao processar o pagamento.';
        return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
    }
}
