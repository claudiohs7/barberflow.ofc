'use client';

import { useEffect, useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import type { Appointment, Barbershop, Barber, Client, Service } from "@/lib/definitions";
import { capitalizeWords, formatCurrency } from "@/lib/utils";
import { Search, FilterX, Trash2 } from "lucide-react";
import { isSameDay, isWithinInterval } from "date-fns";

type FetchState = {
  barbershop: Barbershop | null;
  barbers: Barber[];
  clients: Client[];
  services: Service[];
  appointments: Appointment[];
};

type FullAppointment = Appointment & {
  servicesDetailed: Service[];
  barberName?: string;
  clientNameResolved: string;
  clientPhoneResolved: string;
  totalPrice: number;
};

export default function ScheduleHistoryPage() {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { toast } = useToast();

  const [data, setData] = useState<FetchState>({
    barbershop: null,
    barbers: [],
    clients: [],
    services: [],
    appointments: [],
  });
  const [fullAppointments, setFullAppointments] = useState<FullAppointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBarberId, setFilterBarberId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async (shopId: string) => {
    setIsLoading(true);
    try {
      const [shopRes, barbersRes, clientsRes, servicesRes, apptsRes] = await Promise.all([
        fetch(`/api/barbershops/${shopId}`),
        fetch(`/api/barbers?barbershopId=${encodeURIComponent(shopId)}`),
        fetch(`/api/clients?barbershopId=${encodeURIComponent(shopId)}`),
        fetch(`/api/services?barbershopId=${encodeURIComponent(shopId)}`),
        fetch(`/api/appointments?barbershopId=${encodeURIComponent(shopId)}`),
      ]);
      const [shopJson, barbersJson, clientsJson, servicesJson, apptsJson]: [
        { data: Barbershop | null },
        { data: Barber[] },
        { data: Client[] },
        { data: Service[] },
        { data: Appointment[] }
      ] = await Promise.all([shopRes.json(), barbersRes.json(), clientsRes.json(), servicesRes.json(), apptsRes.json()]);
      setData({
        barbershop: shopJson.data || null,
        barbers: barbersJson.data || [],
        clients: clientsJson.data || [],
        services: servicesJson.data || [],
        appointments: apptsJson.data || [],
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao carregar histórico", description: error.message || "Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (barbershopId) loadData(barbershopId);
  }, [barbershopId, loadData]);

  useEffect(() => {
    const { appointments, clients, barbers, services } = data;
    const mapped: FullAppointment[] = appointments.map((appt) => {
      const client = appt.clientId ? clients.find((c) => c.id === appt.clientId) : null;
      const barber = barbers.find((b) => b.id === appt.barberId);
      const detailedServices = services.filter((s) => appt.serviceIds.includes(s.id));
      const totalPrice = detailedServices.reduce((acc, s) => acc + s.price, 0);
      return {
        ...appt,
        startTime: new Date(appt.startTime),
        endTime: new Date(appt.endTime),
        servicesDetailed: detailedServices,
        barberName: barber?.name,
        clientNameResolved: client?.name || appt.clientName,
        clientPhoneResolved: client?.phone || appt.clientPhone,
        totalPrice,
      };
    });
    setFullAppointments(mapped);
  }, [data]);

  const filteredAppointments = useMemo(() => {
    let list = [...fullAppointments];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          a.clientNameResolved.toLowerCase().includes(t) ||
          a.clientPhoneResolved.toLowerCase().includes(t) ||
          (a.barberName || "").toLowerCase().includes(t)
      );
    }
    if (filterBarberId && filterBarberId !== "all") {
      list = list.filter((a) => a.barberId === filterBarberId);
    }
    if (filterStatus && filterStatus !== "all") {
      list = list.filter((a) => a.status === filterStatus);
    }
    return list.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }, [fullAppointments, searchTerm, filterBarberId, filterStatus]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterBarberId("");
    setFilterStatus("");
  };

  const statusLabels: Record<string, string> = {
    confirmed: "Confirmado",
    cancelled: "Cancelado",
    completed: "Concluído",
    pending: "Pendente",
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!barbershopId) return;
    const confirmed = window.confirm("Excluir este agendamento do hist\u00f3rico?");
    if (!confirmed) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("N\u00e3o foi poss\u00edvel remover o agendamento.");
      setData((prev) => ({
        ...prev,
        appointments: prev.appointments.filter((appt) => appt.id !== id),
      }));
      toast({ title: "Agendamento exclu\u00eddo", description: "O registro foi removido do hist\u00f3rico." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message || "Tente novamente.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Histórico de Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Visualize todos os agendamentos e faça filtros básicos.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Pesquise por cliente, telefone ou barbeiro.</CardDescription>
          <div className="flex flex-col gap-2 md:flex-row md:items-center mt-2">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou barbeiro..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterBarberId} onValueChange={setFilterBarberId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por barbeiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {data.barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={clearFilters} className="gap-2 shrink-0">
              <FilterX className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Carregando...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Nenhum agendamento encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Horário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Barbeiro</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{format(appt.startTime, "dd/MM/yy HH:mm")}</span>
                        <span className="text-xs text-muted-foreground">{format(appt.endTime, "dd/MM/yy HH:mm")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{appt.clientNameResolved}</span>
                        <span className="text-xs text-muted-foreground">{appt.clientPhoneResolved}</span>
                      </div>
                    </TableCell>
                    <TableCell>{appt.barberName || "—"}</TableCell>
                    <TableCell>
                      <ul className="text-xs text-muted-foreground list-disc pl-4">
                        {appt.servicesDetailed.map((s) => (
                          <li key={s.id}>{s.name}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="capitalize">{statusLabels[appt.status] || capitalizeWords(appt.status)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(appt.totalPrice)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteAppointment(appt.id)}
                        disabled={deletingId === appt.id}
                        className="transition-colors hover:bg-destructive/50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
