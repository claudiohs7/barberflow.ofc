'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { fetchJson } from "@/lib/fetcher";
import type { Barbershop, SupportTicket } from "@/lib/definitions";
import { DollarSign, Store, Users, Ticket } from 'lucide-react';
import { SalesChart } from '@/components/sales-chart'; // Importa o novo componente

const planPrices = {
    'Básico': 49.90,
    'Premium': 119.90
};


export default function SuperAdminDashboardPage() {
    const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [barbershopResponse, ticketsResponse] = await Promise.all([
                fetchJson<{ data: Barbershop[] }>("/api/barbershops"),
                fetchJson<{ data: SupportTicket[] }>("/api/tickets"),
            ]);
            setBarbershops(barbershopResponse.data ?? []);
            setSupportTickets(ticketsResponse.data ?? []);
        } catch (error: any) {
            console.error("Erro ao carregar dados do superadmin:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const allBarbershops = useMemo(() => {
        if (!barbershops) return [];
        return barbershops.map(shop => ({
            id: shop.id,
            plan: shop.plan || 'Básico',
            status: shop.status || 'Inativa',
        }));
    }, [barbershops]);

    const totalRevenue = useMemo(() => allBarbershops.reduce((acc, shop) => {
        if (shop.status === 'Ativa') {
            return acc + (planPrices[shop.plan as keyof typeof planPrices] || 0);
        }
        return acc;
    }, 0), [allBarbershops]);

    const activeSubscriptions = useMemo(() => allBarbershops.filter(s => s.status === 'Ativa').length, [allBarbershops]);
    
    const kpiData = [
        {
            title: "Faturamento Mensal",
            value: formatCurrency(totalRevenue),
            icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
        },
        {
            title: "Total de Barbearias",
            value: allBarbershops.length,
            icon: <Store className="h-4 w-4 text-muted-foreground" />
        },
        {
            title: "Assinaturas Ativas",
            value: activeSubscriptions,
            icon: <Users className="h-4 w-4 text-muted-foreground" />
        },
         {
            title: "Tickets Abertos",
            value: supportTickets?.filter(t => t.status === 'open').length || 0,
            icon: <Ticket className="h-4 w-4 text-muted-foreground" />
        },
    ];

    // Mock data for the sales chart
    const mockSalesData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 90; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            data.push({
                date: date.toISOString().split('T')[0],
                sales: Math.floor(Math.random() * 500) + 50,
            });
        }
        return data;
    }, []);


    if (isLoading) {
        return <div className="p-8">Carregando dashboard...</div>
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Dashboard Super Admin</h2>
                    <p className="text-muted-foreground">Visão geral do sistema BarberFlow.</p>
                </div>
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((kpi, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            {kpi.icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4">
                <SalesChart data={mockSalesData} />
            </div>
        </div>
    );
}
