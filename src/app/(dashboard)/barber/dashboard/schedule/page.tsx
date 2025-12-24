"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle, Clock, Loader2, MapPin, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Client, Service, Barber, BarberSchedule, Barbershop } from "@/lib/definitions";
import { useAuth } from "@/context/AuthContext";
import { fetchJson } from "@/lib/fetcher";
import { addMinutes, getDay, parse, startOfDay, endOfDay, isWithinInterval } from "date-fns";

type FullAppointment = Appointment & {
  id: string;
  startTime: Date;
  endTime: Date;
  serviceNames: string;
  totalPrice: number;
};

type ApiAppointment = {
  id: string;
  startTime: string;
  endTime: string;
};

const weekDaysMap: { [key: number]: string } = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

function BarberWorkSchedule({ schedule }: { schedule: BarberSchedule[] | undefined }) {
  const orderedSchedule = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];
    const dayOrder = { Domingo: 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, Sábado: 6 };
    return [...schedule].sort((a, b) => dayOrder[a.day as keyof typeof dayOrder] - dayOrder[b.day as keyof typeof dayOrder]);
  }, [schedule]);

  if (!schedule || schedule.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meus Horários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Ainda não há horários configurados. Peça ao administrador para atualizar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> Meus Horários de Trabalho
        </CardTitle>
        <CardDescription>Exibindo a escala informada pela barbearia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {orderedSchedule.map((day) => (
          <div key={day.day} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 rounded-md bg-muted/50 border gap-2">
            <span className="font-semibold">{day.day}</span>
            <div className="text-right text-sm space-y-1">
              {day.lunchTime?.start && day.lunchTime?.end ? (
                <>
                  <p>
                    <span className="text-muted-foreground">Manhã:</span> {day.start} - {day.lunchTime.start}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Tarde:</span> {day.lunchTime.end} - {day.end}
                  </p>
                </>
              ) : (
                <p>
                  <span className="text-muted-foreground">Trabalho:</span> {day.start} - {day.end}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function formatAddress(address?: Barbershop["address"]) {
  if (!address) return "Endereço não informado";
  const { street = "", number = "", neighborhood = "", city = "", state = "" } = address;
  return `${street}, ${number} - ${neighborhood}, ${city} - ${state}`;
}

export default function BarberSchedulePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const barbershopId = "ZzlwFDljhWZGQ02NkSMrXaGDcLl2";

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [appointments, setAppointments] = useState<FullAppointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayAppointments = useMemo(() => {
    const today = new Date();
    return appointments.filter((appt) => appt.startTime.toDateString() === today.toDateString());
  }, [appointments]);

  const servicesMap = useMemo(
    () => new Map<string, Service>(services.map((service) => [service.id, service])),
    [services]
  );

  const loadAppointments = useCallback(async (barberId: string, availableServices?: Service[]) => {
    try {
      const response = await fetchJson<{ data: Appointment[] }>(
        `/api/appointments?barbershopId=${barbershopId}&barberId=${encodeURIComponent(barberId)}`
      );
      const lookupServices = availableServices ?? services;
      const serviceLookup = new Map<string, Service>(lookupServices.map((service) => [service.id, service]));
      const enriched = (response.data || [])
        .map((appt) => {
          const serviceNames = appt.serviceIds
            .map((id) => serviceLookup.get(id)?.name)
            .filter(Boolean)
            .join(", ");
          const totalPrice = appt.serviceIds.reduce((acc, id) => acc + (serviceLookup.get(id)?.price || 0), 0);
          return {
            ...appt,
            id: appt.id,
            startTime: new Date(appt.startTime),
            endTime: new Date(appt.endTime),
            serviceNames: serviceNames || "Serviço",
            totalPrice,
          };
        })
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      setAppointments(enriched);
    } catch (error: any) {
      console.error("Erro ao carregar agendamentos:", error);
    }
  }, [barbershopId, services]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shopRes, servicesRes, barbersRes, clientsRes] = await Promise.all([
        fetchJson<{ data: Barbershop | null }>(`/api/barbershops/${barbershopId}`),
        fetchJson<{ data: Service[] }>(`/api/services?barbershopId=${barbershopId}`),
        fetchJson<{ data: Barber[] }>(`/api/barbers?barbershopId=${barbershopId}`),
        fetchJson<{ data: Client[] }>(`/api/clients?barbershopId=${barbershopId}`),
      ]);
      setBarbershop(shopRes.data);
      setServices(servicesRes.data || []);
      setClients(clientsRes.data || []);
      const foundBarber = barbersRes.data?.find((b) => b.id === user?.id) || null;
      setBarber(foundBarber);
      if (foundBarber) {
        await loadAppointments(foundBarber.id, servicesRes.data || []);
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados do barbeiro:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar sua agenda." });
    } finally {
      setIsLoading(false);
    }
  }, [barbershopId, loadAppointments, toast, user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const totalDuration = useMemo(() => {
    const service = services.find((s) => s.id === selectedServiceId);
    return service?.duration || 0;
  }, [selectedServiceId, services]);

  useEffect(() => {
    const getSlots = async () => {
      if (!isManualBookingOpen || !selectedDate || !totalDuration || !barber) {
        setAvailableTimeSlots([]);
        return;
      }
      setIsLoadingTimes(true);
      try {
        const from = startOfDay(selectedDate).toISOString();
        const to = endOfDay(selectedDate).toISOString();
        const response = await fetchJson<{ data: ApiAppointment[] }>(
          `/api/appointments?barbershopId=${barbershopId}&barberId=${barber.id}&from=${from}&to=${to}`
        );
        const existing = (response.data || []).map((appt) => ({
          startTime: new Date(appt.startTime),
          endTime: new Date(appt.endTime),
        }));
        const daySchedule = barber.schedule.find((schedule) => schedule.day === weekDaysMap[getDay(selectedDate)]);
        const shopSchedule = barbershop?.operatingHours?.find((schedule) => schedule.day === weekDaysMap[getDay(selectedDate)]);
        if (!daySchedule || !shopSchedule) {
          setAvailableTimeSlots([]);
          return;
        }
        const barbershopOpenTime = parse(shopSchedule.open, "HH:mm", selectedDate);
        const barbershopCloseTime = parse(shopSchedule.close, "HH:mm", selectedDate);
        const barberStartTime = parse(daySchedule.start, "HH:mm", selectedDate);
        const barberEndTime = parse(daySchedule.end, "HH:mm", selectedDate);
        const effectiveStart = barbershopOpenTime > barberStartTime ? barbershopOpenTime : barberStartTime;
        const effectiveEnd = barbershopCloseTime < barberEndTime ? barbershopCloseTime : barberEndTime;
        const lunchStartTime = daySchedule.lunchTime?.start ? parse(daySchedule.lunchTime.start, "HH:mm", selectedDate) : null;
        const lunchEndTime = daySchedule.lunchTime?.end ? parse(daySchedule.lunchTime.end, "HH:mm", selectedDate) : null;

        const slots: string[] = [];
        let current = new Date(effectiveStart);
        while (addMinutes(current, totalDuration) <= effectiveEnd) {
          const slotStart = new Date(current);
          const slotEnd = addMinutes(slotStart, totalDuration);
          const overlapsLunch =
            lunchStartTime && lunchEndTime
              ? isWithinInterval(slotStart, { start: lunchStartTime, end: addMinutes(lunchEndTime, -1) }) ||
                isWithinInterval(addMinutes(slotEnd, -1), { start: lunchStartTime, end: addMinutes(lunchEndTime, -1) }) ||
                (slotStart < lunchStartTime && slotEnd > lunchEndTime)
              : false;
          const hasConflict = existing.some((appt) => slotStart < appt.endTime && slotEnd > appt.startTime);
          if (!overlapsLunch && !hasConflict) {
            slots.push(slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
          }
          current = addMinutes(current, 15);
        }
        setAvailableTimeSlots(slots);
      } catch (error) {
        console.error("Erro ao buscar horários:", error);
      } finally {
        setIsLoadingTimes(false);
      }
    };
    getSlots();
  }, [isManualBookingOpen, selectedDate, totalDuration, barber, barbershopId, barbershop]);

  const handleManualBooking = async () => {
    if (!barber || !selectedDate || !selectedTime || !selectedServiceId) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos." });
      return;
    }
    setIsSubmitting(true);
    try {
      let clientId: string | null = null;
      let clientName = "";
      let clientPhone = "";
      if (selectedClientId === "new") {
        if (!newClientName || !newClientPhone) {
          toast({ variant: "destructive", title: "Erro", description: "Informe nome e WhatsApp do convidado." });
          setIsSubmitting(false);
          return;
        }
        const response = await fetchJson<{ data: Client }>("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barbershopId, name: newClientName, phone: newClientPhone }),
        });
        clientId = response.data.id;
        clientName = response.data.name;
        clientPhone = response.data.phone;
        setClients((prev) => [...prev, response.data]);
      } else {
        const match = clients.find((client) => client.id === selectedClientId);
        if (!match) {
          toast({ variant: "destructive", title: "Erro", description: "Cliente não encontrado." });
          setIsSubmitting(false);
          return;
        }
        clientId = match.id;
        clientName = match.name;
        clientPhone = match.phone;
      }

      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = addMinutes(startTime, totalDuration);
      await fetchJson<{ data: Appointment }>("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbershopId,
          barberId: barber.id,
          clientId,
          clientName,
          clientPhone,
          serviceIds: [selectedServiceId],
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: "confirmed",
          totalDuration,
        }),
      });
      toast({ title: "Agendamento criado", description: "O horário foi confirmado." });
      setIsManualBookingOpen(false);
      setSelectedClientId("");
      setNewClientName("");
      setNewClientPhone("");
      setSelectedServiceId("");
      setSelectedTime(null);
      setAvailableTimeSlots([]);
      if (barber) {
        await loadAppointments(barber.id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível criar o agendamento." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoadingPage = isAuthLoading || isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Minha Agenda</h1>
        <Button variant="ghost" onClick={() => setIsManualBookingOpen(true)} disabled={!barber}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Agendar manualmente
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <BarberWorkSchedule schedule={barber?.schedule} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Próximos horários
              </CardTitle>
              <CardDescription>Agenda do dia para seu perfil.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingPage ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando agenda...
                </div>
              ) : todayAppointments.length > 0 ? (
                todayAppointments.map((appt) => (
                  <div key={appt.id} className="p-3 rounded-md border">
                    <p className="font-semibold">{appt.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {appt.startTime.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })} -{" "}
                      {appt.endTime.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </p>
                    <p className="text-muted-foreground text-sm">{appt.serviceNames}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Dados da barbearia
            </CardTitle>
            <CardDescription>{barbershop ? formatAddress(barbershop.address) : "Carregando..."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Telefone:</span> {barbershop?.phone || "Não informado"}
            </p>
            <p className="text-sm">
              <span className="font-semibold">E-mail:</span> {barbershop?.email || "Não informado"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isManualBookingOpen} onOpenChange={setIsManualBookingOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Agendamento Manual</DialogTitle>
            <DialogDescription>Cadastre um cliente e confirme o horário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Cadastrar novo cliente</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClientId === "new" && (
              <div className="space-y-2">
                <Input placeholder="Nome do cliente" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                <Input placeholder="WhatsApp" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Serviço</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} ({formatCurrency(service.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
            </div>

            <div className="space-y-2">
              <Label>Horários disponíveis</Label>
              <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {isLoadingTimes ? (
                  <div className="col-span-3 text-center text-muted-foreground">Buscando...</div>
                ) : availableTimeSlots.length === 0 ? (
                  <div className="col-span-3 text-center text-muted-foreground">Selecione serviço e data.</div>
                ) : (
                  availableTimeSlots.map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedTime === slot ? "default" : "outline"}
                      onClick={() => setSelectedTime(slot)}
                      className="text-sm"
                    >
                      {slot}
                    </Button>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleManualBooking} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
