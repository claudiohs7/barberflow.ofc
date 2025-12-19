"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { fetchJson } from "@/lib/fetcher";
import type { Appointment, Service, Barber, Barbershop, Client } from "@/lib/definitions";
import { differenceInHours, addMinutes, getDay, parse, startOfDay, endOfDay, format, isSameDay, isWithinInterval } from "date-fns";
import { MapPin, MessageCircle, Edit, Trash2, Loader2, Calendar as CalendarIcon, Scissors, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
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
import { cn, formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FullAppointment = Appointment & {
  serviceNames: string;
  totalDuration: number;
  totalPrice: number;
  barberName: string;
  barbershopName: string;
  barbershopPhone: string;
  barbershopAddress: string;
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

function formatAddress(address?: Barbershop["address"]) {
  if (!address) return "Endereço não informado";
  const { street = "", number = "", neighborhood = "", city = "", state = "" } = address;
  return `${street}, ${number} - ${neighborhood}, ${city} - ${state}`;
}

export default function ClientMyAppointmentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<FullAppointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [clientProfile, setClientProfile] = useState<Client | null>(null);
  const [barbersByShop, setBarbersByShop] = useState<Record<string, Barber[]>>({});
  const [servicesByShop, setServicesByShop] = useState<Record<string, Service[]>>({});
  const [shopDetails, setShopDetails] = useState<Record<string, Barbershop>>({});

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<FullAppointment | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<FullAppointment | null>(null);
  const [editBarberId, setEditBarberId] = useState<string>("");
  const [editServiceIds, setEditServiceIds] = useState<Set<string>>(new Set());
  const [editDate, setEditDate] = useState<Date | undefined>(new Date());
  const [editTime, setEditTime] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  const [servicesOfBarbershop, setServicesOfBarbershop] = useState<Service[]>([]);
  const [barbersOfShop, setBarbersOfShop] = useState<Barber[]>([]);

  const editTotalDuration = useMemo(() => {
    if (!servicesOfBarbershop.length) return 0;
    return Array.from(editServiceIds).reduce((acc, serviceId) => {
      const service = servicesOfBarbershop.find((s) => s.id === serviceId);
      return acc + (service?.duration || 0);
    }, 0);
  }, [editServiceIds, servicesOfBarbershop]);

  const upcomingAppointments = appointments.filter((a) => a.status === "confirmed" && a.startTime >= new Date());
  const pastAppointments = appointments
    .filter((a) => a.status !== "confirmed" || a.startTime < new Date())
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  const fetchBarbershopMetadata = async (barbershopId: string) => {
    const [shopResponse, servicesResponse, barbersResponse] = await Promise.all([
      fetchJson<{ data: Barbershop | null }>(`/api/barbershops/${barbershopId}`),
      fetchJson<{ data: Service[] }>(`/api/services?barbershopId=${barbershopId}`),
      fetchJson<{ data: Barber[] }>(`/api/barbers?barbershopId=${barbershopId}`),
    ]);
    return {
      shop: shopResponse.data,
      services: servicesResponse.data || [],
      barbers: barbersResponse.data || [],
    };
  };

  const loadAppointments = useCallback(async () => {
    if (!user) {
      setIsLoadingAppointments(false);
      return;
    }
    setIsLoadingAppointments(true);
    try {
      const { data } = await fetchJson<{ data: Appointment[] }>(`/api/appointments?clientId=${user.id}`);
      const uniqueShopIds = Array.from(
        new Set(data.map((appt) => appt.barbershopId).filter((id): id is string => Boolean(id)))
      );
      const shopMap: Record<string, Barbershop> = {};
      const barberCache: Record<string, Barber[]> = {};
      const serviceCache: Record<string, Service[]> = {};
      await Promise.all(
        uniqueShopIds.map(async (shopId) => {
          const metadata = await fetchBarbershopMetadata(shopId!);
          if (metadata.shop) {
            shopMap[shopId] = metadata.shop;
          }
          barberCache[shopId] = metadata.barbers;
          serviceCache[shopId] = metadata.services;
        })
      );
      setShopDetails(shopMap);
      setBarbersByShop(barberCache);
      setServicesByShop(serviceCache);

      const serviceLookup = Object.values(serviceCache).flat().reduce<Record<string, Service>>((acc, service) => {
        acc[service.id] = service;
        return acc;
      }, {});
      const barberLookup = Object.values(barberCache).flat().reduce<Record<string, Barber>>((acc, barber) => {
        acc[barber.id] = barber;
        return acc;
      }, {});

      const formatted = data
        .map((appt) => {
          const services = appt.serviceIds.map((serviceId) => serviceLookup[serviceId]).filter(Boolean) as Service[];
          const barberId = appt.barberId;
          const barber = barberId ? barberLookup[barberId] : undefined;
          const shopId = appt.barbershopId;
          const shop = shopId ? shopMap[shopId] : undefined;
          const serviceNames = services.map((service) => service.name).join(", ") || "Serviços indisponíveis";
          const totalDuration = appt.totalDuration || services.reduce((acc, service) => acc + service.duration, 0);
          const totalPrice = services.reduce((acc, service) => acc + service.price, 0);
          return {
            ...appt,
            serviceNames,
            totalDuration,
            totalPrice,
            barberName: barber?.name || "Desconhecido",
            barbershopName: shop?.name || "Barbearia",
            barbershopPhone: shop?.phone || "",
            barbershopAddress: formatAddress(shop?.address),
            startTime: new Date(appt.startTime),
            endTime: new Date(appt.endTime),
          };
        })
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      setAppointments(formatted);
    } catch (error: any) {
      console.error("Erro ao carregar agendamentos:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível buscar seus agendamentos." });
    } finally {
      setIsLoadingAppointments(false);
    }
  }, [user, toast]);

  const loadClientProfile = useCallback(async () => {
    if (!user) {
      setClientProfile(null);
      setIsLoadingProfile(false);
      return;
    }
    setIsLoadingProfile(true);
    try {
      const response = await fetchJson<{ data: Client[] }>(`/api/clients?userId=${user.id}`);
      setClientProfile(response.data?.[0] || null);
    } catch (error: any) {
      console.error("Falha ao buscar perfil do cliente:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível recuperar seu perfil." });
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadClientProfile();
  }, [loadClientProfile]);

  const handleCancelClick = (appointment: FullAppointment) => {
    setAppointmentToCancel(appointment);
    setIsCancelDialogOpen(true);
  };

  const confirmCancellation = async () => {
    if (!appointmentToCancel) return;
    try {
      await fetchJson(`/api/appointments/${appointmentToCancel.id}`, { method: "DELETE" });
      setAppointments((prev) => prev.filter((appt) => appt.id !== appointmentToCancel.id));
      toast({ title: "Agendamento cancelado", description: "Seu horário foi removido." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível cancelar." });
    } finally {
      setIsCancelDialogOpen(false);
      setAppointmentToCancel(null);
    }
  };

  const handleEditClick = (appointment: FullAppointment) => {
    setAppointmentToEdit(appointment);
    setEditBarberId(appointment.barberId);
    setEditDate(appointment.startTime);
    setEditTime(format(appointment.startTime, "HH:mm"));
    setEditServiceIds(new Set(appointment.serviceIds));
    const shopId = appointment.barbershopId;
    setServicesOfBarbershop(shopId ? servicesByShop[shopId] || [] : []);
    setBarbersOfShop(shopId ? barbersByShop[shopId] || [] : []);
    setIsEditDialogOpen(true);
  };

  useEffect(() => {
    const loadAvailableTimes = async () => {
      if (!appointmentToEdit || !editBarberId || !editDate || !servicesOfBarbershop.length) {
        setAvailableTimes([]);
        return;
      }

      setIsLoadingTimes(true);
      try {
        const from = startOfDay(editDate).toISOString();
        const to = endOfDay(editDate).toISOString();
        const response = await fetchJson<{ data: ApiAppointment[] }>(
          `/api/appointments?barbershopId=${appointmentToEdit.barbershopId}&barberId=${editBarberId}&from=${from}&to=${to}`
        );
        const existing = (response.data || [])
          .filter((appt) => appt.id !== appointmentToEdit.id)
          .map((appt) => ({ startTime: new Date(appt.startTime), endTime: new Date(appt.endTime) }));

        const daySchedule = (barbersOfShop.find((b) => b.id === editBarberId)?.schedule || []).find(
          (s) => s.day === weekDaysMap[getDay(editDate)]
        );
        const shopId = appointmentToEdit.barbershopId;
        const shop = shopId ? shopDetails[shopId] : undefined;
        const shopSchedule = shop?.operatingHours?.find((h: { day: string }) => h.day === weekDaysMap[getDay(editDate)]);
        if (!daySchedule || !shopSchedule) {
          setAvailableTimes([]);
          setIsLoadingTimes(false);
          return;
        }

        const barbershopOpenTime = parse(shopSchedule.open, "HH:mm", editDate);
        const barbershopCloseTime = parse(shopSchedule.close, "HH:mm", editDate);
        const barberStartTime = parse(daySchedule.start, "HH:mm", editDate);
        const barberEndTime = parse(daySchedule.end, "HH:mm", editDate);

        const effectiveStartTime = barbershopOpenTime > barberStartTime ? barbershopOpenTime : barberStartTime;
        const effectiveEndTime = barbershopCloseTime < barberEndTime ? barbershopCloseTime : barberEndTime;

        const lunchStartTime = daySchedule.lunchTime?.start ? parse(daySchedule.lunchTime.start, "HH:mm", editDate) : null;
        const lunchEndTime = daySchedule.lunchTime?.end ? parse(daySchedule.lunchTime.end, "HH:mm", editDate) : null;

        const slots: string[] = [];
        let currentTime = new Date(effectiveStartTime);
        while (addMinutes(currentTime, editTotalDuration) <= effectiveEndTime) {
          const slotStart = new Date(currentTime);
          const slotEnd = addMinutes(slotStart, editTotalDuration);
          const overlapsLunch =
            lunchStartTime && lunchEndTime
              ? isWithinInterval(slotStart, { start: lunchStartTime, end: addMinutes(lunchEndTime, -1) }) ||
                isWithinInterval(addMinutes(slotEnd, -1), { start: lunchStartTime, end: addMinutes(lunchEndTime, -1) }) ||
                (slotStart < lunchStartTime && slotEnd > lunchEndTime)
              : false;
          const hasConflict = existing.some((appt) => slotStart < appt.endTime && slotEnd > appt.startTime);
          if (!hasConflict && !overlapsLunch) {
            slots.push(slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          }
          currentTime = addMinutes(currentTime, 15);
        }
        setAvailableTimes(slots);
      } catch (err) {
        console.error("Erro ao carregar horários de edição:", err);
      } finally {
        setIsLoadingTimes(false);
      }
    };

    loadAvailableTimes();
  }, [appointmentToEdit, editBarberId, editDate, editTotalDuration, barbersOfShop, shopDetails, servicesOfBarbershop.length]);

  const availableServicesForEdit = useMemo(() => {
    const barber = barbersOfShop.find((b) => b.id === editBarberId);
    if (!barber) return [];
    const barberServiceIds = new Set(barber.services?.map((s) => s.serviceId) || []);
    return servicesOfBarbershop.filter((service) => barberServiceIds.has(service.id));
  }, [barbersOfShop, editBarberId, servicesOfBarbershop]);

  const handleUpdateAppointment = async () => {
    if (!appointmentToEdit || !editBarberId || !editDate || !editTime || editServiceIds.size === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos." });
      return;
    }
    const [hours, minutes] = editTime.split(":").map(Number);
    const startTime = new Date(editDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = addMinutes(startTime, editTotalDuration);
    try {
      const response = await fetchJson<{ data: Appointment }>(`/api/appointments/${appointmentToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: editBarberId,
          serviceIds: Array.from(editServiceIds),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          totalDuration: editTotalDuration,
        }),
      });
      const updated = response.data;
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === updated.id
            ? {
                ...appt,
                barberId: updated.barberId,
                barberName: barbersOfShop.find((b) => b.id === updated.barberId)?.name || appt.barberName,
                serviceIds: updated.serviceIds,
                serviceNames: updated.serviceIds
                  .map((id) => servicesOfBarbershop.find((s) => s.id === id))
                  .filter(Boolean)
                  .map((s) => s!.name)
                  .join(", "),
                startTime: new Date(updated.startTime),
                endTime: new Date(updated.endTime),
                totalDuration: updated.totalDuration || editTotalDuration,
              }
            : appt
        )
      );
      toast({ title: "Agendamento atualizado", description: "Suas alterações foram salvas." });
      setIsEditDialogOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível salvar." });
    }
  };

  const getGoogleCalendarLink = (appointment: FullAppointment) => {
    const formatForGoogle = (date: Date) => date.toISOString().replace(/-|:|\.\d{3}/g, "");
    const startTime = formatForGoogle(appointment.startTime);
    const endTime = formatForGoogle(appointment.endTime);
    const title = encodeURIComponent(`Agendamento: ${appointment.serviceNames} na ${appointment.barbershopName}`);
    const details = encodeURIComponent(
      `Serviços: ${appointment.serviceNames}\nProfissional: ${appointment.barberName}\nAgendado via BarberFlow.`
    );
    const location = encodeURIComponent(appointment.barbershopAddress);
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
  };

  const getGoogleMapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const getWhatsAppLink = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, "")}`;

  const isLoading = isAuthLoading || isLoadingAppointments || isLoadingProfile;
  const displayName = clientProfile?.name?.split(" ")[0] || user?.name?.split(" ")[0] || "Cliente";

  return (
    <>
      <div className="grid gap-8">
        <div className="space-y-4">
          <Button variant="outline" asChild className="w-fit">
            <Link href="/client/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Menu
            </Link>
          </Button>
          <h1 className="text-3xl font-bold font-headline">Olá, {displayName}!</h1>
          <p className="text-muted-foreground">Gerencie seus agendamentos futuros e revise o histórico.</p>
        </div>

        <Separator />

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Próximos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>Próximos Agendamentos</CardTitle>
                <CardDescription>Acompanhe seus horários confirmados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-8 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando agendamentos...
                  </div>
                ) : upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appt) => {
                    const canModify = differenceInHours(appt.startTime, new Date()) >= 12;
                    return (
                      <Card key={appt.id} className="flex flex-col">
                        <CardHeader>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div>
                              <CardTitle className="text-xl">Barbearia {appt.barbershopName}</CardTitle>
                              <CardDescription>
                                {appt.serviceNames} com {appt.barberName}
                              </CardDescription>
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0 mt-2 sm:mt-0">
                              <p className="text-md font-semibold capitalize">
                                {appt.startTime.toLocaleDateString("pt-BR", {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                              <p className="text-muted-foreground">
                                {appt.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              <p className="font-semibold text-primary">{formatCurrency(appt.totalPrice)}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardFooter className="flex-col items-stretch gap-2 p-4 pt-0 mt-auto border-t pt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
                            <Button variant="outline" asChild size="sm" className="w-full">
                              <Link href={getGoogleMapsLink(appt.barbershopAddress)} target="_blank">
                                <MapPin className="mr-2 h-4 w-4" />
                                Ver no Mapa
                              </Link>
                            </Button>
                            <Button variant="outline" asChild size="sm" className="w-full">
                              <Link href={getWhatsAppLink(appt.barbershopPhone)} target="_blank">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Contato
                              </Link>
                            </Button>
                            <Button variant="outline" asChild size="sm" className="w-full">
                              <Link href={getGoogleCalendarLink(appt)} target="_blank">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                Google Calendar
                              </Link>
                            </Button>
                            <Button variant="secondary" size="sm" disabled={!canModify} onClick={() => handleEditClick(appt)} className="w-full">
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={!canModify}
                              onClick={() => handleCancelClick(appt)}
                              className="w-full lg:col-span-2"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancelar
                            </Button>
                          </div>
                          {!canModify && (
                            <p className="text-xs text-muted-foreground text-center pt-2">
                              Não é possível modificar agendamentos com menos de 12h de antecedência.
                            </p>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">Você não tem agendamentos futuros.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico</CardTitle>
                <CardDescription>Agendamentos passados ou cancelados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-8 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando histórico...
                  </div>
                ) : pastAppointments.length > 0 ? (
                  pastAppointments.map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div>
                        <p className="font-medium">
                          {appt.serviceNames} em {appt.barbershopName}
                        </p>
                        <p className="text-sm text-muted-foreground">{appt.startTime.toLocaleDateString()}</p>
                      </div>
                      <Badge
                        variant={appt.status === "completed" ? "secondary" : "destructive"}
                        className={cn(appt.status === "completed" && "bg-green-500/20 text-green-500 border border-green-500/30")}
                      >
                        {appt.status === "completed" ? "Concluído" : appt.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">Nenhum agendamento histórico.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar seu agendamento em{" "}
              <span className="font-bold">{appointmentToCancel?.barbershopName}</span> no dia{" "}
              <span className="font-bold">
                {appointmentToCancel?.startTime.toLocaleDateString()} às{" "}
                {appointmentToCancel?.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancellation} className="bg-destructive hover:bg-destructive/90">
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar agendamento</DialogTitle>
            <DialogDescription>Altere serviços, barbeiro ou horário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-barber">Barbeiro</Label>
              <Select value={editBarberId} onValueChange={setEditBarberId}>
                <SelectTrigger id="edit-barber">
                  <SelectValue placeholder="Selecione o barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {barbersOfShop.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Serviços</Label>
              <div className="space-y-2 rounded-md border p-4 max-h-40 overflow-y-auto">
                {availableServicesForEdit.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-service-${service.id}`}
                      checked={editServiceIds.has(service.id)}
                      onCheckedChange={() => {
                        setEditServiceIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(service.id)) next.delete(service.id);
                          else next.add(service.id);
                          return next;
                        });
                      }}
                    />
                    <Label htmlFor={`edit-service-${service.id}`} className="flex justify-between w-full cursor-pointer">
                      <span>{service.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(service.price)}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data & horário</Label>
              <div className="flex flex-col md:flex-row gap-4">
                <Calendar mode="single" selected={editDate} onSelect={setEditDate} className="rounded-md border" />
                <div className="grid grid-cols-3 gap-2 w-full max-h-60 overflow-y-auto">
                  {isLoadingTimes ? (
                    <div className="col-span-3 text-center text-muted-foreground">Carregando...</div>
                  ) : availableTimes.length > 0 ? (
                    availableTimes.map((time) => (
                      <Button key={time} variant={editTime === time ? "default" : "outline"} onClick={() => setEditTime(time)}>
                        {time}
                      </Button>
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-muted-foreground">Nenhum horário disponível.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleUpdateAppointment}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
