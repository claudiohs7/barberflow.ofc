
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Crown, Sparkles, Loader2, QrCode, Copy, CreditCard, HelpCircle, CheckCircle, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchJson } from "@/lib/fetcher";
import type { Barbershop, PlanName } from "@/lib/definitions";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { differenceInDays, startOfDay, format, isBefore } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const BASIC_PLAN: PlanName = "Básico";
const planPrices = {
    [BASIC_PLAN]: 49.90,
    Premium: 119.90,
};

export default function SubscriptionPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();

    const isSuperAdmin = user?.email === 'claudiohs@hotmail.com';
    const [barbershopData, setBarbershopData] = useState<Barbershop | null>(null);
    const [isLoadingBarbershop, setIsLoadingBarbershop] = useState(true);

    const fetchBarbershop = useCallback(
        async ({ showLoading = true, suppressToast = false } = {}) => {
            if (!barbershopId) {
                setBarbershopData(null);
                if (showLoading) setIsLoadingBarbershop(false);
                return null;
            }

            if (showLoading) setIsLoadingBarbershop(true);
            try {
                const response = await fetchJson<{ data: Barbershop }>(`/api/barbershops/${encodeURIComponent(barbershopId)}`);
                const shop = response.data ?? null;
                setBarbershopData(shop);
                return shop;
            } catch (error: any) {
                if (!suppressToast) {
                    toast({
                        variant: "destructive",
                        title: "Erro ao carregar barbearia",
                        description: error.message || "Não foi possível buscar as informações da barbearia.",
                    });
                }
                return null;
            } finally {
                if (showLoading) setIsLoadingBarbershop(false);
            }
        },
        [barbershopId, toast]
    );

    useEffect(() => {
        if (!barbershopId) {
            setBarbershopData(null);
            setIsLoadingBarbershop(false);
            return;
        }
        void fetchBarbershop();
    }, [barbershopId, fetchBarbershop]);

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradeCost, setUpgradeCost] = useState(0);
    const [upgradeCredit, setUpgradeCredit] = useState(0);

    useEffect(() => {
        if (!isUpgradeModalOpen || !barbershopId) return;
        let isActive = true;
        const checkUpgrade = async () => {
            const updated = await fetchBarbershop({ showLoading: false, suppressToast: true });
            if (!isActive || !updated) return;
            if (updated.plan === "Premium") {
                toast({
                    title: "Upgrade concluído!",
                    description: "Seu plano foi atualizado para Premium com sucesso.",
                });
                setIsUpgradeModalOpen(false);
            }
        };
        checkUpgrade();
        const intervalId = setInterval(checkUpgrade, 5000);
        return () => {
            isActive = false;
            clearInterval(intervalId);
        };
    }, [isUpgradeModalOpen, barbershopId, fetchBarbershop, toast]);

    const [isGeneratingPix, setIsGeneratingPix] = useState(false);
    const [pixData, setPixData] = useState<{ qrCodeBase64: string; qrCode: string; paymentId: string; } | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail as { id?: string; ownerId?: string };
            if (detail?.id && detail.id !== barbershopId) {
                if (detail.ownerId && detail.ownerId !== barbershopId) return;
                if (!detail.ownerId) return;
            }
            void fetchBarbershop({ showLoading: false, suppressToast: true });
        };
        const storageHandler = (event: StorageEvent) => {
            if (event.key !== "barbershop-updated" || !event.newValue) return;
            try {
                const payload = JSON.parse(event.newValue);
                if (payload.id && payload.id !== barbershopId) {
                    if (payload.ownerId && payload.ownerId !== barbershopId) return;
                    if (!payload.ownerId) return;
                }
            } catch (error) {
                console.warn("Formato inválido em barbershop-updated:", error);
            }
            void fetchBarbershop({ showLoading: false, suppressToast: true });
        };
        window.addEventListener("barbershop-updated", handler);
        window.addEventListener("storage", storageHandler);
        return () => {
            window.removeEventListener("barbershop-updated", handler);
            window.removeEventListener("storage", storageHandler);
        };
    }, [barbershopId, fetchBarbershop]);

    const getExpiryDetails = () => {
        if (!barbershopData || !barbershopData.expiryDate) {
            return { text: "Sem data de expiração.", days: 0, date: null, isTrial: false };
        }
        const expiry = new Date(barbershopData.expiryDate);
        if (Number.isNaN(expiry.getTime())) {
            return { text: "Sem data de expiração válida.", days: 0, date: null, isTrial: barbershopData.plan === BASIC_PLAN };
        }
        const today = startOfDay(new Date());
        const daysRemaining = differenceInDays(expiry, today);
        const formattedDate = format(expiry, "dd/MM/yyyy");
        const isTrial = barbershopData.plan === BASIC_PLAN;

        let text = isTrial ? `Teste expira em ${daysRemaining} dias.` : `Renovação em ${daysRemaining} dias.`;

        if (daysRemaining <= 0) text = isTrial ? "Período de teste expirou." : "Seu plano expirou.";
        if (daysRemaining === 1) text = isTrial ? "Teste expira hoje." : "Renovação em hoje.";
        return { text, days: daysRemaining, date: formattedDate, isTrial };
    }

const handleUpgradeClick = () => {
        const expiry = barbershopData?.expiryDate ? new Date(barbershopData.expiryDate) : null;
        const today = new Date();
        
        if (!expiry || Number.isNaN(expiry.getTime()) || isBefore(expiry, today)) {
            setUpgradeCredit(0);
            setUpgradeCost(planPrices.Premium);
        } else {
            const daysRemaining = differenceInDays(expiry, today);
            const dailyCostBasic = 1.66; // 49.90 / 30
            const dailyCostPremium = 3.99; // 119.90 / 30
            
            const credit = dailyCostBasic * daysRemaining;
            const premiumCostForPeriod = dailyCostPremium * daysRemaining;
            const finalCost = premiumCostForPeriod - credit;
            
            setUpgradeCost(finalCost > 0 ? finalCost : 0);
        }
        
        setIsUpgradeModalOpen(true);
        setPixData(null);
        setIsGeneratingPix(false);
    }

    const handleGeneratePix = async () => {
        if (!barbershopId || !barbershopData?.cpfCnpj || !barbershopData?.email) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Dados da barbearia (ID, CPF/CNPJ ou Email) estão incompletos.' });
            return;
        }

        setIsGeneratingPix(true);
        setPixData(null);

        try {
            const response = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: upgradeCost,
                    barbershopId: barbershopId,
                    ownerData: {
                        email: barbershopData.email,
                        cpfCnpj: barbershopData.cpfCnpj,
                        legalName: barbershopData.legalName || barbershopData.name,
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao gerar o PIX.');
            }

            const data = await response.json();
            setPixData({
                qrCodeBase64: data.qrCodeBase64,
                qrCode: data.qrCode,
                paymentId: data.paymentId,
            });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao Gerar PIX', description: error.message });
        } finally {
            setIsGeneratingPix(false);
        }
    }

    const copyPixCode = () => {
        if (!pixData?.qrCode) return;
        navigator.clipboard.writeText(pixData.qrCode).then(() => {
        toast({ title: "Código PIX Copiado!", description: "Use 'Copia e Cola' no seu app do banco." });
        });
    }

    if (isBarbershopIdLoading || isLoadingBarbershop) {
        return <div className="p-6">Carregando plano...</div>;
    }

    const currentPlan = barbershopData?.plan || 'Básico';
    const expiryDetails = getExpiryDetails();

    return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">Plano e Assinatura</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Visão Geral</CardTitle>
                    <CardDescription>
                        Gerencie seu plano atual e informações de pagamento.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-4 rounded-lg bg-muted/50 border gap-2">
                        <div>
                            <p className="text-sm text-muted-foreground">Seu plano atual</p>
                            <div className="flex items-center gap-2">
                            <p className="text-xl font-bold font-headline flex items-center gap-2">
                                {currentPlan === 'Premium' && <Crown className="h-5 w-5 text-primary"/>}
                                Plano {currentPlan}
                            </p>
                            </div>
                            <p className="text-sm font-semibold text-muted-foreground">({formatCurrency(planPrices[currentPlan])}/mês)</p>
                        </div>
                        <div className="text-center sm:text-right">
                            <Badge variant={expiryDetails.days > 7 ? "secondary" : "destructive"}>{expiryDetails.text}</Badge>
                            {expiryDetails.date && <p className="text-xs text-muted-foreground mt-1">Próxima cobrança em {expiryDetails.date}</p>}
                        </div>
                    </div>
                    {currentPlan === 'Básico' && (
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                            <h3 className="font-semibold text-primary flex items-center justify-center gap-2">
                                <Crown className="h-5 w-5"/>Faça o upgrade para o Premium!
                            </h3>
                            <p className="text-sm text-primary/80 mt-1">Desbloqueie WhatsApp automático, Webhooks, relatórios avançados e muito mais.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4 flex justify-between items-center">
                    {currentPlan === 'Básico' && (
                        <Button className="w-full" onClick={handleUpgradeClick}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Fazer Upgrade para Premium
                        </Button>
                    )}
                    {currentPlan === 'Premium' && (
                    <>
                        <p className="text-sm text-muted-foreground">Você já possui o plano mais completo!</p>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                        <Button variant="outline" disabled>
                                        <CreditCard className="mr-2 h-4 w-4" />
                                        Gerenciar Assinatura
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Em breve você poderá gerenciar sua assinatura por aqui.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </>
                    )}
                </CardFooter>
            </Card>
            
            
        </div>

        <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Crown className="h-6 w-6 text-primary"/>Upgrade para o Plano Premium
                    </DialogTitle>
                    <DialogDescription>
                        Complete a transição para o plano Premium e desbloqueie todos os recursos.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Card className="bg-muted/50 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-center text-lg">Resumo da Cobrança</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-1">
                            {upgradeCredit > 0 && (
                                <p className="text-sm text-green-500">Crédito de {formatCurrency(upgradeCredit)} (dias restantes do plano Básico) aplicado.</p>
                            )}
                            <p className="text-4xl font-bold">{formatCurrency(upgradeCost)}</p>
                            <p className="text-xs text-muted-foreground">
                            Valor proporcional para upgrade imediato. A próxima cobrança será o valor cheio do plano.
                            </p>
                        </CardContent>
                    </Card>
                    
                    {pixData ? (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-muted-foreground">Escaneie o QR Code abaixo com o app do seu banco:</p>
                            <div className="flex justify-center">
                                <Image src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="PIX QR Code" width={256} height={256} />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="pix-copy-paste" className="text-xs">Ou use o PIX Copia e Cola:</Label>
                            <div className="flex gap-2">
                                <Input id="pix-copy-paste" readOnly value={pixData.qrCode} className="text-xs h-8"/>
                                <Button size="sm" onClick={copyPixCode}><Copy className="mr-2 h-3 w-3"/>Copiar</Button>
                            </div>
                            </div>
                            <p className="text-xs text-muted-foreground pt-2">Aguardando pagamento... A página será atualizada automaticamente.</p>
                        </div>
                    ) : (
                        <Button onClick={handleGeneratePix} className="w-full" disabled={isGeneratingPix}>
                            {isGeneratingPix ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <QrCode className="mr-2 h-4 w-4" />
                            )}
                            {isGeneratingPix ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
                        </Button>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Fechar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
    );
}
