
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DollarSign, TrendingUp, TrendingDown, CalendarCheck, CalendarDays, Users, AlertTriangle, ExternalLink, Link as LinkIcon, Copy } from "lucide-react";
import { cn, formatCurrency, slugify } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Barber, Expense, Appointment, Service, Barbershop } from "@/lib/definitions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker"
import { startOfWeek, isWithinInterval, endOfDay, startOfDay, endOfMonth, endOfWeek, isSameMonth, format, getDay, getYear, getMonth, differenceInDays, subDays, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBarbershopId } from "@/context/BarbershopIdContext";
import Link from "next/link";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { fetchJson } from "@/lib/fetcher";


interface BarberPerformance {
    barberId: string;
    barberName: string;
    barberAvatar: string;
    totalServices: number;
    serviceBreakdown: { [serviceName: string]: number };
}

type DateFilter = 'day' | 'week' | 'month' | 'year';

const chartConfig = {
  appointments: {
    label: "Agendamentos",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function AdminDashboardPage() {
    const { user: authUser } = useAuth();
    const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
    const { toast } = useToast();
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
    const [barbershopData, setBarbershopData] = useState<Barbershop | null>(null);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const loadDashboardData = useCallback(async () => {
        if (!barbershopId) {
            setBarbershopData(null);
            setBarbers([]);
            setServices([]);
            setAppointments([]);
            setExpenses([]);
            setIsLoadingData(false);
            return;
        }

        setIsLoadingData(true);
        try {
            const [
                barbershopResponse,
                barbersResponse,
                servicesResponse,
                expensesResponse,
                appointmentsResponse,
            ] = await Promise.all([
                fetchJson<{ data: Barbershop | null }>(`/api/barbershops/${encodeURIComponent(barbershopId)}`),
                fetchJson<{ data: Barber[] }>(`/api/barbers?barbershopId=${encodeURIComponent(barbershopId)}`),
                fetchJson<{ data: Service[] }>(`/api/services?barbershopId=${encodeURIComponent(barbershopId)}`),
                fetchJson<{ data: Expense[] }>(`/api/expenses?barbershopId=${encodeURIComponent(barbershopId)}`),
                fetchJson<{ data: Appointment[] }>(`/api/appointments?barbershopId=${encodeURIComponent(barbershopId)}`),
            ]);

            setBarbershopData(barbershopResponse.data ?? null);
            setBarbers(barbersResponse.data ?? []);
            setServices(servicesResponse.data ?? []);
            setExpenses(expensesResponse.data?.map((exp) => ({ ...exp, date: new Date(exp.date) })) ?? []);
            setAppointments(
                (appointmentsResponse.data ?? []).map((appt) => ({
                    ...appt,
                    startTime: new Date(appt.startTime),
                    endTime: new Date(appt.endTime),
                }))
            );
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar o dashboard",
                description: error.message || "Não foi possível carregar os dados da barbearia.",
            });
        } finally {
            setIsLoadingData(false);
        }
    }, [barbershopId, toast]);

    useEffect(() => {
        void loadDashboardData();
    }, [loadDashboardData]);
    
    const isSuperAdmin = authUser?.email === 'claudiohs@hotmail.com';
    

    const filteredAppointments = useMemo(() => {
      if (!appointments) return [];
      if (!dateRange || !dateRange.from) return appointments;
      
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

      return appointments.filter(appt => {
        return isWithinInterval(appt.startTime, { start: from, end: to })
      })
    }, [appointments, dateRange]);


    const totalRevenue = useMemo(() => {
        if (!filteredAppointments || !services) return 0;
        return filteredAppointments
            .filter(appt => appt.status === 'completed' || appt.status === 'confirmed')
            .reduce((acc, appt) => {
                const apptServices = services.filter(s => appt.serviceIds.includes(s.id));
                const apptRevenue = apptServices.reduce((sum, s) => sum + s.price, 0);
                return acc + apptRevenue;
            }, 0);
    }, [filteredAppointments, services]);

    const totalExpenses = useMemo(() => {
        if (!expenses) return 0;
        if (!dateRange || !dateRange.from) return expenses.reduce((acc, exp) => acc + exp.amount, 0);

        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        
        return expenses
            .filter(exp => exp.date && isWithinInterval(exp.date, { start: from, end: to }))
            .reduce((acc, exp) => acc + exp.amount, 0);
    }, [expenses, dateRange]);
    
    const totalProfit = useMemo(() => totalRevenue - totalExpenses, [totalRevenue, totalExpenses]);

    const totalAppointments = useMemo(() => {
         if (!filteredAppointments) return 0;
         return filteredAppointments.length;
    }, [filteredAppointments]);


    const weeklyAppointmentsData = useMemo(() => {
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weekData = weekDays.map(day => ({ name: day, appointments: 0 }));

        if (filteredAppointments) {
            filteredAppointments.forEach(appt => {
                // getDay() retorna 0 para Domingo, 1 para Segunda, etc.
                const dayIndex = getDay(appt.startTime);
                if(weekData[dayIndex]) {
                  weekData[dayIndex].appointments++;
                }
            });
        }
        return weekData;
    }, [filteredAppointments]);
    

    const kpiData = useMemo(() => [
        {
            title: "Faturamento no Período",
            value: formatCurrency(totalRevenue),
            icon: DollarSign,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
            href: undefined,
        },
        {
            title: "Despesas no Período",
            value: formatCurrency(totalExpenses),
            icon: TrendingDown,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
            href: "/admin/dashboard/expenses",
        },
        {
            title: "Lucro no Período",
            value: formatCurrency(totalProfit),
            icon: TrendingUp,
            color: totalProfit >= 0 ? "text-blue-500" : "text-red-500",
            bgColor: totalProfit >= 0 ? "bg-blue-500/10" : "bg-red-500/10",
            href: undefined,
        },
        {
            title: "Agendamentos no Período",
            value: totalAppointments.toString(),
            icon: CalendarCheck,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            href: "/admin/dashboard/schedule",
        },
    ], [totalRevenue, totalExpenses, totalProfit, totalAppointments]);

    const barberPerformance = useMemo(() => {
        if (!filteredAppointments || !barbers || !services) return [];
        
        const performanceMap = new Map<string, { total: number, breakdown: { [key: string]: number } }>();

        for (const appt of filteredAppointments) {
            const current = performanceMap.get(appt.barberId) || { total: 0, breakdown: {} };
            current.total += appt.serviceIds.length;
            
            for (const serviceId of appt.serviceIds) {
                const service = services.find(s => s.id === serviceId);
                if (service) {
                    current.breakdown[service.name] = (current.breakdown[service.name] || 0) + 1;
                }
            }
            performanceMap.set(appt.barberId, current);
        }

        const performanceData: BarberPerformance[] = barbers.map(barber => {
            const data = performanceMap.get(barber.id);
            return {
                barberId: barber.id,
                barberName: barber.name,
                barberAvatar: barber.avatarUrl,
                totalServices: data?.total || 0,
                serviceBreakdown: data?.breakdown || {}
            };
        });

        return performanceData.sort((a,b) => b.totalServices - a.totalServices);

    }, [filteredAppointments, barbers, services]);

    
    const [bookingLink, setBookingLink] = useState('');

    useEffect(() => {
        const slugFromName = barbershopData?.name ? slugify(barbershopData.name) : "";
        const slugSegment = slugFromName || barbershopData?.id;
        if (slugSegment) {
            const relative = `/agendar/${slugSegment}`;
            const base =
              typeof window !== "undefined"
                ? window.location.origin
                : process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
            setBookingLink(base ? `${base}${relative}` : relative);
        } else {
            setBookingLink("");
        }
    }, [barbershopData?.id, barbershopData?.name]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({
                title: "Copiado!",
                description: "O texto foi copiado para a área de transferência.",
            });
        }).catch(err => {
            toast({
                variant: 'destructive',
                title: "Erro ao Copiar",
                description: "Não foi possível copiar.",
            });
        });
    };

  if (isBarbershopIdLoading || isLoadingData) {
      return <div className="p-6">Carregando dashboard...</div>;
  }
  
  const currentPlan = barbershopData?.plan || 'Básico';

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold font-headline">Dashboard da {barbershopData?.name}</h1>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} className="mt-4 sm:mt-0" />
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
            <Card key={index} className="flex flex-col p-4">
                <div className="flex items-center gap-4">
                    <div className={cn("flex items-center justify-center h-12 w-12 rounded-lg", kpi.bgColor)}>
                        <kpi.icon className={cn("h-6 w-6", kpi.color)} />
                    </div>
                    <div>
                        <CardDescription>{kpi.title}</CardDescription>
                        <CardTitle className="text-2xl font-bold">{kpi.value}</CardTitle>
                    </div>
                </div>
                {kpi.href && (
                  <CardFooter className="p-0 pt-4 mt-auto">
                    <Button asChild variant="link" className="p-0 h-auto text-xs text-muted-foreground">
                      <Link href={kpi.href}>Ver tudo</Link>
                    </Button>
                  </CardFooter>
                )}
            </Card>
        ))}
      </div>
       <div className="space-y-6">
           <Card>
              <CardHeader>
                  <CardTitle className="text-base font-medium">Link Público para Agendamentos</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                  <p className="text-sm text-muted-foreground">
                      Use o link abaixo para divulgar sua página de agendamentos.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-md bg-muted/50 border">
                      <span className="font-mono text-sm text-foreground truncate flex-1">
                          {bookingLink}
                      </span>
                      <div className="flex gap-2">
                          <Button asChild size="sm" className="shrink-0">
                              <Link href={bookingLink} target="_blank">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Abrir
                              </Link>
                          </Button>
                          <Button onClick={() => copyToClipboard(bookingLink)} size="sm" className="shrink-0">
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar
                          </Button>
                      </div>
                  </div>
              </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Agendamentos da Semana</CardTitle>
                  <CardDescription>
                    Um resumo dos agendamentos da sua barbearia para o período
                    selecionado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart
                      accessibilityLayer
                      data={weeklyAppointmentsData}
                      margin={{
                        left: 12,
                        right: 12,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 3)}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Bar
                        dataKey="appointments"
                        fill="var(--color-appointments)"
                        radius={4}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="h-full">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Desempenho dos Barbeiros</CardTitle>
                          <p className="text-sm text-muted-foreground">Desempenho no período selecionado</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {barberPerformance.length === 0 ? (
                          <div className="text-center text-muted-foreground py-10">
                              Nenhum serviço registrado neste período.
                          </div>
                      ) : barberPerformance.map(barber => (
                          <div key={barber.barberId} className="flex items-start gap-4">
                              <Avatar>
                                  <AvatarImage src={barber.barberAvatar} alt={barber.barberName} />
                                  <AvatarFallback>{barber.barberName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                  <p className="font-medium">{barber.barberName}</p>
                                  {barber.totalServices > 0 ? (
                                          <div className="text-xs text-muted-foreground">
                                          {Object.entries(barber.serviceBreakdown)
                                              .map(([name, count]) => `${name}: ${count}`)
                                              .join(', ')}
                                      </div>
                                  ) : (
                                      <p className="text-xs text-muted-foreground">Nenhum serviço</p>
                                  )}
                              </div>
                              <div className="text-right">
                              <p className="font-bold text-lg">{barber.totalServices}</p>
                              <p className="text-xs text-muted-foreground">serviços</p>
                              </div>
                          </div>
                      ))}
                  </CardContent>
              </Card>
            </div>
          </div>
        </div>
    </div>
  );
}
