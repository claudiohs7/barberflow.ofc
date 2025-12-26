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



} from "@/components/ui/dialog";







import { Calendar } from "@/components/ui/calendar";







import { Users, Scissors, Calendar as CalendarIcon, Clock, Store, MapPin, Search, Loader2, Info, ArrowLeft } from "lucide-react";









import { useToast } from "@/hooks/use-toast";









import { formatCurrency } from "@/lib/utils";







import type { Service, Barber, Barbershop, MessageTemplate, MessageTemplateType } from "@/lib/definitions";







import { Combobox } from "@/components/ui/combobox";







import { addDays, addMinutes, getDay, parse, startOfDay, endOfDay, isSameDay, isValid, isWithinInterval as isWithinIntervalFns } from "date-fns";

import { Input } from "@/components/ui/input";

import { Label } from "./ui/label";






















import Link from "next/link";







import { useAuth } from "@/context/AuthContext";







import { ExternalLink } from "lucide-react";







import { messageTemplates as defaultTemplates } from "@/lib/data";















const weekDaysMap: { [key: number]: string } = {



  0: "Domingo",



  1: "Segunda-feira",



  2: "Terca-feira",



  3: "Quarta-feira",



  4: "Quinta-feira",



  5: "Sexta-feira",



  6: "Sabado",



};







const dayAliases: Record<number, string[]> = {



  0: ["domingo", "sunday"],



  1: ["segunda-feira", "segunda", "monday"],



  2: ["terca-feira", "terca", "tuesday"],



  3: ["quarta-feira", "quarta", "wednesday"],



  4: ["quinta-feira", "quinta", "thursday"],



  5: ["sexta-feira", "sexta", "friday"],



  6: ["sabado", "saturday"],



};







const normalizeDay = (value?: string) =>



  (value || "")



    .normalize("NFD")



    .replace(/[\u0300-\u036f]/g, "")



    .toLowerCase()



    .replace(/[^a-z]/g, "");







const findScheduleByDayIndex = <T extends { day: string }>(list: T[] | undefined, dayIndex: number) => {







  if (!list) return undefined;







  const aliases = dayAliases[dayIndex] || [];







  return list.find((item) => {







    const normalized = normalizeDay(item.day);







    return aliases.some((alias) => {







      const normAlias = normalizeDay(alias);







      return normalized === normAlias || normalized.startsWith(normAlias) || normAlias.startsWith(normalized);







    });







  });







};















type AppointmentSlot = {







  startTime: Date;







  endTime: Date;







};















type ApiAppointment = {







  id: string;







  startTime: string;







  endTime: string;







};















interface ConfirmedAppointmentDetails {







  startTime: Date;







  endTime: Date;







  serviceNames: string;







  barberName: string;







  barbershopName: string;







  barbershopAddress: string;







}















async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {







  const res = await fetch(url, init);







  if (!res.ok) {







    const err = await res.text();







    throw new Error(err || "Erro de rede");







  }







  return res.json() as Promise<T>;







}















function getFullAddress(shop?: Barbershop | null) {







  if (!shop?.address) return "Endereço não informado";







  const { street = "", number = "", neighborhood = "", city = "", state = "" } = shop.address;







  return `${street}, ${number} - ${neighborhood}, ${city} - ${state}`;







}















const getTemplatesForBarbershop = (barbershop?: Barbershop | null) => {







  if (barbershop?.messageTemplates && barbershop.messageTemplates.length > 0) {







    return barbershop.messageTemplates as MessageTemplate[];







  }







  return defaultTemplates as MessageTemplate[];







};















const buildTemplateMessage = (







  templateType: MessageTemplateType,







  templates: MessageTemplate[],







  context: {







    clientName: string;







    barbershopName: string;







    services: string;







    serviceValue: string;







    barbershopAddress: string;







    startTime: Date;







    barberName: string;







  }







) => {







  const template = templates.find((t) => t.type === templateType && t.enabled);







  if (!template) return null;















  let message = template.content;







  message = message.replace("{cliente}", context.clientName);







  message = message.replace("{servico}", context.services || "");



  message = message.replace("{valor}", context.serviceValue || "");







  message = message.replace("{data}", context.startTime.toLocaleDateString());







  message = message.replace(







    "{horario}",







    context.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })







  );







  message = message.replace("{barbeiro}", context.barberName || "");







  message = message.replace("{barbearia}", context.barbershopName || "sua barbearia");



  message = message.replace("{endereco}", context.barbershopAddress || "");







  return message;







};















export function BookingWizard({ barbershopIdFromSlug }: { barbershopIdFromSlug: string }) {







  const [selectedBarbershopId, setSelectedBarbershopId] = useState<string | null>(barbershopIdFromSlug);







  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);







  const [services, setServices] = useState<Service[]>([]);







  const [barbers, setBarbers] = useState<Barber[]>([]);







  const [isLoadingData, setIsLoadingData] = useState(false);







  const [isLoadingTimes, setIsLoadingTimes] = useState(false);







  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);







  const [error, setError] = useState<Error | null>(null);















  const [selectedServices, setSelectedServices] = useState<Service[]>([]);







  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);







  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);







  const [selectedTime, setSelectedTime] = useState<string | null>(null);







  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);







  const [isConfirming, setIsConfirming] = useState(false);







  const [confirmedAppointment, setConfirmedAppointment] = useState<ConfirmedAppointmentDetails | null>(null);







  const [guestName, setGuestName] = useState("");







  const [guestPhone, setGuestPhone] = useState("");















  const { toast } = useToast();

  const { user } = useAuth();

  const guestPhoneDigits = useMemo(() => guestPhone.replace(/\\D/g, ""), [guestPhone]);

  const isGuestInfoMissing = !user && (!guestName.trim() || guestPhoneDigits.length < 10);
















  const totalDuration = useMemo(() => selectedServices.reduce((acc, s) => acc + s.duration, 0), [selectedServices]);







  const totalPrice = useMemo(() => selectedServices.reduce((acc, s) => acc + s.price, 0), [selectedServices]);















  const availableServices = useMemo(() => {







    if (!selectedBarber) return services;







    const barberServiceIds = new Set(selectedBarber.services?.map((s) => s.serviceId) || []);







    return services.filter((service) => barberServiceIds.has(service.id));







  }, [selectedBarber, services]);















  const loadData = useCallback(async (idOrSlug: string) => {







    setIsLoadingData(true);







    try {







      const shopJson = await fetchJson<{ data: Barbershop | null }>(`/api/barbershops/${idOrSlug}`);







      const shop = shopJson.data || null;







      const effectiveId = shop?.id || idOrSlug;







      if (shop?.id && shop.id !== selectedBarbershopId) {







        setSelectedBarbershopId(shop.id);







      }















      const [servicesJson, barbersJson] = await Promise.all([







        fetchJson<{ data: Service[] }>(`/api/services?barbershopId=${encodeURIComponent(effectiveId)}`),







        fetchJson<{ data: Barber[] }>(`/api/barbers?barbershopId=${encodeURIComponent(effectiveId)}`),







      ]);















      setBarbershop(shop);







      setServices(servicesJson.data || []);







      setBarbers(barbersJson.data || []);







      // Ajusta barber selecionado se ainda nao definido







      setSelectedBarber((prev) => prev || barbersJson.data?.[0] || null);







    } catch (err: any) {







      setError(err);







      toast({ variant: "destructive", title: "Erro", description: err.message || "Falha ao carregar barbearia." });







    } finally {







      setIsLoadingData(false);







    }







  }, [selectedBarbershopId, toast]);















  useEffect(() => {







    if (selectedBarbershopId) {







      loadData(selectedBarbershopId);







    }







  }, [selectedBarbershopId, loadData]);















  useEffect(() => {







    const getTimes = async () => {







      if (!selectedBarbershopId || !barbershop || !selectedBarber || !selectedDate || totalDuration <= 0) {







        setAvailableTimeSlots([]);







        return;







      }















      setIsLoadingTimes(true);







      setError(null);







      setAvailableTimeSlots([]);















      try {







        const dayIndex = getDay(selectedDate);







        if (!Array.isArray(barbershop.operatingHours)) {
          setError(new Error("Horários da barbearia estão configurados de forma inválida."));
          setIsLoadingTimes(false);
          return;
        }

        const barbershopSchedule = findScheduleByDayIndex(barbershop.operatingHours, dayIndex);















        if (!barbershopSchedule || barbershopSchedule.open === "closed") {







          setError(new Error("A barbearia está fechada neste dia."));







          setIsLoadingTimes(false);







          return;







        }















        if (!Array.isArray(selectedBarber.schedule)) {
          setError(new Error("Horários do barbeiro estão configurados de forma inválida."));
          setIsLoadingTimes(false);
          return;
        }

        const barberSchedule = findScheduleByDayIndex(selectedBarber.schedule, dayIndex);







        if (!barberSchedule) {







          setError(new Error("O barbeiro não trabalha neste dia."));







          setIsLoadingTimes(false);







          return;







        }















        const fromIso = startOfDay(selectedDate).toISOString();







        const toIso = endOfDay(selectedDate).toISOString();







        const apptRes = await fetchJson<{ data: ApiAppointment[] }>(







          `/api/appointments?barbershopId=${encodeURIComponent(selectedBarbershopId)}&barberId=${encodeURIComponent(







            selectedBarber.id







          )}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`







        );















        const existingAppointments: AppointmentSlot[] =







          apptRes.data?.map((appt) => ({







            startTime: new Date(appt.startTime),







            endTime: new Date(appt.endTime),







          })) || [];















        const slots: string[] = [];















        const barbershopOpenTime = parse(barbershopSchedule.open, "HH:mm", selectedDate);
        const barbershopCloseTime = parse(barbershopSchedule.close, "HH:mm", selectedDate);
        const barberStartTime = parse(barberSchedule.start, "HH:mm", selectedDate);
        const barberEndTime = parse(barberSchedule.end, "HH:mm", selectedDate);

        const timeValues = [barbershopOpenTime, barbershopCloseTime, barberStartTime, barberEndTime];
        if (!timeValues.every(isValid)) {
          setError(new Error("Horários configurados de forma inválida para este dia."));
          setIsLoadingTimes(false);
          return;
        }

        const effectiveStartTime = barbershopOpenTime > barberStartTime ? barbershopOpenTime : barberStartTime;
        const effectiveEndTime = barbershopCloseTime < barberEndTime ? barbershopCloseTime : barberEndTime;

        const lunchStartRaw = barberSchedule.lunchTime?.start ? parse(barberSchedule.lunchTime.start, "HH:mm", selectedDate) : null;
        const lunchEndRaw = barberSchedule.lunchTime?.end ? parse(barberSchedule.lunchTime.end, "HH:mm", selectedDate) : null;
        const lunchStartTime = lunchStartRaw && isValid(lunchStartRaw) ? lunchStartRaw : null;
        const lunchEndTime = lunchEndRaw && isValid(lunchEndRaw) ? lunchEndRaw : null;

        let currentTime = effectiveStartTime;







        const now = new Date();















        while (currentTime < effectiveEndTime) {







          const slotStartTime = new Date(currentTime);















          if (isSameDay(selectedDate, now) && slotStartTime < now) {







            currentTime = addMinutes(currentTime, 15);







            continue;







          }















          const slotEndTime = addMinutes(slotStartTime, totalDuration);















          if (slotEndTime > effectiveEndTime) {







            break;







          }















          const overlapsWithLunch =







            lunchStartTime && lunchEndTime







              ? isWithinIntervalFns(slotStartTime, { start: lunchStartTime, end: addMinutes(lunchEndTime, -1) }) ||







                isWithinIntervalFns(addMinutes(slotEndTime, -1), { start: lunchStartTime, end: addMinutes(lunchEndTime, -1) }) ||







                (slotStartTime < lunchStartTime && slotEndTime > lunchEndTime)







              : false;















          const hasConflict = existingAppointments.some((appt) => slotStartTime < appt.endTime && slotEndTime > appt.startTime);















          if (!hasConflict && !overlapsWithLunch) {







            slots.push(
              slotStartTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
            );







          }







          currentTime = addMinutes(currentTime, 15);







        }







        setAvailableTimeSlots(slots);







        if (slots.length === 0) {







          setError(new Error("Nenhum horário disponível para esta data."));







        }







      } catch (err: any) {







        console.error("Erro no fetch de horários:", err);







        setError(new Error("Não foi possível carregar horários."));







      } finally {







        setIsLoadingTimes(false);







      }







    };















    getTimes();







  }, [selectedBarbershopId, barbershop, selectedBarber, selectedDate, totalDuration]);















  const handleBarberSelect = (barber: Barber) => {







    setSelectedBarber(barber);







    setSelectedServices([]);







    setSelectedTime(null);







  };















  const handleServiceSelect = (service: Service) => {







    setSelectedServices((prev) => {







      const isSelected = prev.some((s) => s.id === service.id);







      if (isSelected) {







        return prev.filter((s) => s.id !== service.id);







      } else {







        return [...prev, service];







      }







    });







    setSelectedTime(null);







  };















  const handleBook = () => {



    if (!selectedBarbershopId || !barbershop || !selectedBarber || !selectedDate || !selectedTime || totalDuration <= 0) {



      toast({ variant: "destructive", title: "Erro", description: "Preencha barbeiro, serviços e horário." });



      return;



    }







    const [hours, minutes] = selectedTime.split(":").map(Number);



    const startTime = new Date(selectedDate);



    startTime.setHours(hours, minutes, 0, 0);



    const endTime = new Date(startTime.getTime() + totalDuration * 60000);







    setConfirmedAppointment({



      startTime,



      endTime,



      serviceNames: selectedServices.map((s) => s.name).join(", "),



      barberName: selectedBarber.name,



      barbershopName: barbershop.name,



      barbershopAddress: getFullAddress(barbershop),



    });



    setIsConfirmationDialogOpen(true);



  };







  const createAppointment = async (



    startTime: Date,



    endTime: Date,



    clientInfo: { clientName: string; clientPhone: string; clientId?: string | null }



  ) => {



    if (!selectedBarbershopId || !selectedBarber) {



      throw new Error("Dados do agendamento incompletos.");



    }







    const res = await fetch("/api/appointments", {



      method: "POST",



      headers: { "Content-Type": "application/json" },



      body: JSON.stringify({



        barbershopId: selectedBarbershopId,



        barberId: selectedBarber.id,



        clientId: clientInfo.clientId ?? null,



        clientName: clientInfo.clientName,



        clientPhone: clientInfo.clientPhone,



        serviceIds: selectedServices.map((s) => s.id),



        startTime: startTime.toISOString(),



        endTime: endTime.toISOString(),



        status: "confirmed",



        totalDuration,



      }),



    });







    if (!res.ok) {



      const err = await res.text();



      throw new Error(err || "Falha ao criar agendamento.");



    }







    const cleanedNumber = clientInfo.clientPhone?.replace(/\D/g, "") || "";



    if (cleanedNumber.length >= 10 && selectedBarbershopId) {



      try {



        const templates = getTemplatesForBarbershop(barbershop);



        const message = buildTemplateMessage("Confirmação de Agendamento", templates, {



          clientName: clientInfo.clientName,



          barbershopName: barbershop?.name || "Barbearia",



          services: selectedServices.map((s) => s.name).join(", "),



          serviceValue: formatCurrency(totalPrice),



          startTime,



          barberName: selectedBarber?.name || "",



          barbershopAddress: getFullAddress(barbershop),



        });







        if (message) {



          await fetch("/api/bitsafira/message/send-message", {



            method: "POST",



            headers: { "Content-Type": "application/json" },



            body: JSON.stringify({



              barbershopId: selectedBarbershopId,



              number: cleanedNumber,



              message,



              clientName: clientInfo.clientName,



              messageType: "Confirmação de Agendamento",



            }),



          });



        }



      } catch (err) {



        console.error("Não foi possível enviar mensagem de confirmação:", err);



      }



    }



  };







  const confirmBooking = async () => {

    if (!confirmedAppointment) return;

    if (!user) {
      if (!guestName.trim()) {
        toast({ variant: "destructive", title: "Informe seu nome", description: "Precisamos do nome para confirmar o agendamento." });
        return;
      }
      if (guestPhoneDigits.length < 10) {
        toast({ variant: "destructive", title: "Informe o WhatsApp", description: "Digite um numero valido com DDD para confirmarmos o agendamento." });
        return;
      }
    }

    setIsConfirming(true);

    const clientName = user?.name || guestName || "Cliente";
    const clientPhone = user?.phone || guestPhoneDigits || "";
    const clientId = user?.id ?? null;

    try {
      await createAppointment(confirmedAppointment.startTime, confirmedAppointment.endTime, {
        clientName,
        clientPhone,
        clientId,
      });

      toast({ title: "Agendamento confirmado!", description: "Seu agendamento foi criado com sucesso." });
      setIsConfirmationDialogOpen(false);
      setConfirmedAppointment(null);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: (error as Error).message || "Nao foi possivel criar o agendamento." });
    } finally {
      setIsConfirming(false);
    }
  };








  const isReadyToBook = selectedServices.length > 0 && selectedBarber && selectedTime && !isLoadingTimes;



  const quickDates = useMemo(() => {



    const today = startOfDay(new Date());



    const tomorrow = startOfDay(addDays(today, 1));



    const dayOfWeek = today.getDay();



    const daysToSaturday = (6 - dayOfWeek + 7) % 7 || 7;



    const nextSaturday = startOfDay(addDays(today, daysToSaturday));



    return [



      { label: "Hoje", value: today },



      { label: "Amanhã", value: tomorrow },



      { label: "Próximo sábado", value: nextSaturday },



    ];



  }, []);















  return (







    <div className="space-y-6">







      <div className="flex items-center justify-between">







        <Button variant="ghost" asChild>







          <Link href="/client/dashboard">







            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar







          </Link>







        </Button>







        <div className="flex items-center gap-2 text-sm text-muted-foreground">







          <Info className="h-4 w-4" />







          Escolha serviços, barbeiro e horário para confirmar.







        </div>







      </div>















      <Card>



        <CardContent className="space-y-4 pt-2">



          <div className="space-y-2">
            <Label>Barbearia</Label>
            <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
              {barbershop?.logoUrl ? (
                <img
                  src={barbershop.logoUrl}
                  alt={barbershop.name || "Logo da barbearia"}
                  className="h-8 w-8 rounded-full object-cover bg-muted"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-semibold uppercase">
                  {(barbershop?.name || "?").slice(0, 2)}
                </div>
              )}
              <span className="truncate">{barbershop?.name || "Barbearia selecionada"}</span>
            </div>
          </div>



          {barbershop && (



            <div className="rounded-md border p-3 bg-muted/50 space-y-1">



              <p className="font-semibold flex items-center gap-2">



                <Store className="h-4 w-4" /> {barbershop.name}



              </p>



              <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">



                <MapPin className="h-3 w-3" /> {getFullAddress(barbershop)}



                <Button



                  size="sm"



                  className="ml-auto flex items-center gap-2 bg-[#1f8fff] hover:bg-[#083e96] text-white"



                  asChild



                >



                  <Link



                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getFullAddress(barbershop))}`}



                    target="_blank"



                  >



                    Ver no mapa <ExternalLink className="h-4 w-4" />



                  </Link>



                </Button>



              </div>



            </div>



          )}



        </CardContent>



      </Card>







      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">



        <Card>



          <CardHeader>



            <CardTitle className="flex items-center gap-2">



              <Users className="h-5 w-5" /> Etapa 1: Escolha o barbeiro



            </CardTitle>



          </CardHeader>



          <CardContent className="space-y-4">



            <div className="space-y-2">



              <Label>Barbeiro</Label>



              <Combobox



                options={barbers.map((b) => ({ label: b.name, value: b.id }))}



                value={selectedBarber?.id}



                onChange={(value) => {



                  const found = barbers.find((b) => b.id === value) || null;



                  if (found) handleBarberSelect(found);



                }}



                placeholder="Selecione o barbeiro"



              />



            </div>



          </CardContent>



        </Card>







        <Card>



          <CardHeader>



            <CardTitle className="flex items-center gap-2">



              <Scissors className="h-5 w-5" /> Etapa 2: Escolha os serviços



            </CardTitle>



          </CardHeader>



          <CardContent className="space-y-4">



            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">



              {availableServices.map((service) => {



                const selected = selectedServices.some((s) => s.id === service.id);



                return (



                  <Button



                    key={service.id}



                    variant={selected ? "default" : "outline"}



                    className="justify-between"



                    onClick={() => handleServiceSelect(service)}



                  >



                    <span>{service.name}</span>



                    <span className="text-xs">{formatCurrency(service.price)}</span>



                  </Button>



                );

              })}

            </div>



          </CardContent>



          <CardFooter className="flex justify-between text-sm text-muted-foreground">



            <span>Duração total: {totalDuration} min</span>



            <span>Preço estimado: {formatCurrency(totalPrice)}</span>



          </CardFooter>



        </Card>



      </div>















      <Card>



        <CardHeader>



          <CardTitle className="flex items-center gap-2">



            <CalendarIcon className="h-5 w-5" /> Etapa 3: Escolha a data e horário



          </CardTitle>



        </CardHeader>



        <CardContent className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">



          <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-[0_25px_80px_-45px_rgba(0,0,0,0.8)] p-4 space-y-4">



            <div className="flex flex-wrap gap-2">



              {quickDates.map((item) => (



                <Button



                  key={item.label}



                  size="sm"



                  variant={selectedDate && isSameDay(selectedDate, item.value) ? "default" : "outline"}



                  onClick={() => setSelectedDate(item.value)}



                  className="border border-slate-700/70"



                >



                  {item.label}



                </Button>



              ))}



            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.7)]">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => setSelectedDate(date || undefined)}
                showOutsideDays
                className="w-full"
                classNames={{
                  months: "w-full flex flex-col gap-4",
                  month: "space-y-3",
                  caption: "flex items-center justify-between px-2",
                  caption_label: "text-base font-semibold text-slate-100",
                  nav: "flex items-center gap-2",
                  nav_button:
                    "h-8 w-8 rounded-lg border border-slate-700/80 bg-slate-800 text-slate-200 hover:border-primary/40 hover:bg-primary/20 transition",
                  table: "w-full border-collapse",
                  head_row: "grid grid-cols-7 text-xs uppercase tracking-wide text-slate-400",
                  head_cell: "py-1 text-center",
                  row: "grid grid-cols-7 text-sm",
                  cell: "relative h-12",
                  day: "w-full h-full flex items-center justify-center rounded-xl border border-transparent text-slate-200 hover:border-primary/40 hover:bg-primary/15 transition",
                  day_selected:
                    "bg-primary text-primary-foreground font-semibold shadow-[0_10px_25px_-18px_rgba(0,0,0,0.8)]",
                  day_today:
                    "border border-primary/40 text-primary-foreground font-semibold bg-primary/15",
                  day_outside: "text-slate-500/60 opacity-70",
                  day_disabled: "text-slate-700 line-through cursor-not-allowed",
                }}
                disabled={(date) => {
                  const today = startOfDay(new Date());
                  // Bloqueia datas passadas
                  if (date < today) return true;
                  if (!barbershop?.operatingHours) return false;
                  const dayName = weekDaysMap[date.getDay()];
                  const hours = barbershop.operatingHours.find((h) => h.day === dayName);
                  if (!hours) return false;
                  return hours.open.toLowerCase() === "closed";
                }}
              />
            </div>



          </div>







          <div className="space-y-3">



            <Label>Horários disponíveis</Label>



            {isLoadingTimes ? (



              <div className="flex items-center gap-2 text-muted-foreground">



                <Loader2 className="h-4 w-4 animate-spin" /> Buscando horários...



              </div>



            ) : error ? (



              <p className="text-sm text-destructive">{error.message}</p>



            ) : availableTimeSlots.length === 0 ? (



              <p className="text-sm text-muted-foreground">Nenhum horário disponível.</p>



            ) : (



              <div className="grid grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2">



                {availableTimeSlots.map((slot) => (



                  <Button



                    key={slot}



                    variant={selectedTime === slot ? "default" : "outline"}



                    onClick={() => setSelectedTime(slot)}



                  >



                    {slot}



                  </Button>



                ))}



              </div>



            )}



          </div>



        </CardContent>







        <CardFooter className="flex justify-between">







          <div className="flex items-center gap-2 text-muted-foreground text-sm">







            <Clock className="h-4 w-4" />







            {selectedTime ? `horário escolhido: ${selectedTime}` : "Selecione um horário"}







          </div>







          <Button onClick={handleBook} disabled={!isReadyToBook}>







            {isLoadingTimes ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}







            Confirmar agendamento







          </Button>







        </CardFooter>







      </Card>















      <Dialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>



        <DialogContent>



          <DialogHeader>



            <DialogTitle>Confirmar agendamento</DialogTitle>



            <DialogDescription>Revise os detalhes antes de confirmar.</DialogDescription>



          </DialogHeader>







          {!user && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="guest-name">Nome completo</Label>
                <Input
                  id="guest-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="guest-phone">WhatsApp</Label>
                <Input
                  id="guest-phone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                />
                <p className="text-xs text-muted-foreground">Usaremos para confirmar e enviar lembretes.</p>
              </div>
            </div>
          )}

          {confirmedAppointment && (



            <div className="space-y-2 text-sm">



              <p>



                <strong>Barbearia:</strong> {confirmedAppointment.barbershopName}



              </p>



              <p>



                <strong>Endereço:</strong> {confirmedAppointment.barbershopAddress}



              </p>



              <p>



                <strong>Barbeiro:</strong> {confirmedAppointment.barberName}



              </p>



              <p>



                <strong>Serviços:</strong> {confirmedAppointment.serviceNames}



              </p>



              <p>



                <strong>Data:</strong> {confirmedAppointment.startTime.toLocaleDateString()}



              </p>



              <p>



                <strong>Horários:</strong>{" "}
                {confirmedAppointment.startTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}{" "}
                até{" "}
                {confirmedAppointment.endTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}



              </p>



            </div>



          )}







          <DialogFooter>



            <Button variant="outline" onClick={() => setIsConfirmationDialogOpen(false)}>



              Cancelar



            </Button>



            <Button onClick={confirmBooking} disabled={isConfirming || isGuestInfoMissing}>



              {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}



              Confirmar



            </Button>



          </DialogFooter>



        </DialogContent>



      </Dialog>







    </div>







  );







}

