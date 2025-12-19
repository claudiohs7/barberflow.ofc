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

import { Calendar } from "@/components/ui/calendar";

import { Check, User, Users, Scissors, Calendar as CalendarIcon, Clock, Store, MapPin, Search, Loader2, Info, ArrowLeft } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

import { useToast } from "@/hooks/use-toast";

import { useRouter } from "next/navigation";

import { formatCurrency } from "@/lib/utils";

import type { Service, Barber, Barbershop, MessageTemplate, MessageTemplateType } from "@/lib/definitions";

import { Combobox } from "@/components/ui/combobox";

import { addMinutes, getDay, parse, startOfDay, endOfDay, isSameDay, isWithinInterval as isWithinIntervalFns } from "date-fns";

import { Separator } from "./ui/separator";

import { Input } from "./ui/input";

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



function GuestModal({

  isOpen,

  onOpenChange,

  onConfirm,

}: {

  isOpen: boolean;

  onOpenChange: (open: boolean) => void;

  onConfirm: (guestName: string, guestPhone: string) => void;

}) {

  const [name, setName] = useState("");

  const [phone, setPhone] = useState("");

  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");



  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    let value = e.target.value;

    value = value.replace(/\D/g, "");

    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");

    value = value.replace(/(\d{5})(\d)/, "$1-$2");

    if (value.length > 15) {

      value = value.substring(0, 15);

    }

    setPhone(value);



    const cleanedPhone = value.replace(/\D/g, "");

    const regexWhatsApp = /^[1-9]{2}9[0-9]{8}$/;

    const isValid = regexWhatsApp.test(cleanedPhone);

    setIsPhoneValid(isValid);

    if (!isValid && cleanedPhone.length >= 11) {

      setErrorMessage("NÃºmero de WhatsApp invÃ¡lido.");

    } else {

      setErrorMessage("");

    }

  };



  const handleConfirm = async () => {

    if (!name || !isPhoneValid) {

      setErrorMessage("Por favor, preencha seu nome e um WhatsApp vÃ¡lido.");

      return;

    }

    onConfirm(name, phone);

  };



  return (

    <Dialog open={isOpen} onOpenChange={onOpenChange}>

      <DialogContent>

        <DialogHeader>

          <DialogTitle>Quase lÃ¡! Faltam sÃ³ alguns dados.</DialogTitle>

          <DialogDescription>Informe nome e WhatsApp para concluir o agendamento.</DialogDescription>

        </DialogHeader>

        <div className="space-y-4 py-4">

          <div className="space-y-2">

            <Label htmlFor="guest-name">Nome Completo</Label>

            <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />

          </div>

          <div className="space-y-2">

            <Label htmlFor="guest-phone">WhatsApp</Label>

            <Input id="guest-phone" value={phone} onChange={handlePhoneChange} placeholder="(XX) 9XXXX-XXXX" />

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          </div>

        </div>

        <DialogFooter>

          <DialogClose asChild>

            <Button variant="outline">Cancelar</Button>

          </DialogClose>

          <Button onClick={handleConfirm} disabled={!name || !isPhoneValid}>

            Confirmar Agendamento

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  );

}



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

  if (!shop?.address) return "EndereÃ§o nÃ£o informado";

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

    context.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

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

  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);

  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  const [confirmedAppointment, setConfirmedAppointment] = useState<ConfirmedAppointmentDetails | null>(null);

  const [guestName, setGuestName] = useState("");

  const [guestPhone, setGuestPhone] = useState("");



  const { toast } = useToast();

  const router = useRouter();

  const { user } = useAuth();



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

        const barbershopSchedule = findScheduleByDayIndex(barbershop.operatingHours, dayIndex);



        if (!barbershopSchedule || barbershopSchedule.open === "closed") {

          setError(new Error("A barbearia est? fechada neste dia."));

          setIsLoadingTimes(false);

          return;

        }



        const barberSchedule = findScheduleByDayIndex(selectedBarber.schedule, dayIndex);

        if (!barberSchedule) {

          setError(new Error("O barbeiro n?o trabalha neste dia."));

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



        const effectiveStartTime = barbershopOpenTime > barberStartTime ? barbershopOpenTime : barberStartTime;

        const effectiveEndTime = barbershopCloseTime < barberEndTime ? barbershopCloseTime : barberEndTime;



        const lunchStartTime = barberSchedule.lunchTime?.start ? parse(barberSchedule.lunchTime.start, "HH:mm", selectedDate) : null;

        const lunchEndTime = barberSchedule.lunchTime?.end ? parse(barberSchedule.lunchTime.end, "HH:mm", selectedDate) : null;



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

            slots.push(slotStartTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

          }

          currentTime = addMinutes(currentTime, 15);

        }

        setAvailableTimeSlots(slots);

        if (slots.length === 0) {

          setError(new Error("Nenhum horários disponí­vel para esta data."));

        }

      } catch (err: any) {

        console.error("Erro no fetch de horários:", err);

        setError(new Error("NÃ£o foi possÃ­vel carregar horários."));

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



  const showConfirmationDialog = (startTime: Date, endTime: Date) => {

    if (!barbershop || !selectedBarber) return;

    setConfirmedAppointment({

      startTime: startTime,

      endTime: endTime,

      serviceNames: selectedServices.map((s) => s.name).join(", "),

      barberName: selectedBarber.name,

      barbershopName: barbershop.name,

      barbershopAddress: getFullAddress(barbershop),

    });

    setIsConfirmationDialogOpen(true);

  };



  const handleBook = async () => {

    if (!selectedBarbershopId || !barbershop || !selectedBarber || !selectedDate || !selectedTime || totalDuration <= 0) {

      toast({ variant: "destructive", title: "Erro", description: "Preencha barbeiro, serviços e horário." });

      return;

    }



    setGuestName(user?.name || "");

    setGuestPhone("");

    setIsGuestModalOpen(true);

  };



  const createAppointment = async (

    startTime: Date,

    endTime: Date,

    clientInfo: { clientName: string; clientPhone: string; clientId?: string | null }

  ) => {

    if (!selectedBarbershopId || !selectedBarber) return;

    try {

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

      showConfirmationDialog(startTime, endTime);

      // Dispara confirmação automática para o cliente (quando houver número)

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

                messageType: "ConfirmaÇõÇœo de Agendamento",

              }),

            });

          }

        } catch (err) {

          console.error("Não foi possível enviar mensagem de confirmação:", err);

        }

      }

      toast({ title: "Agendamento confirmado!", description: "Enviamos sua reserva." });

    } catch (error: any) {

      console.error(error);

      toast({ variant: "destructive", title: "Erro", description: error.message || "NÃ£o foi possÃ­vel criar o agendamento." });

    }

  };



  const handleGuestConfirm = async (name: string, phone: string) => {

    setGuestName(name);

    setGuestPhone(phone);

    setIsGuestModalOpen(false);



    if (!selectedTime || !selectedDate || !selectedBarber || !selectedBarbershopId) return;



    const [hours, minutes] = selectedTime.split(":").map(Number);

    const startTime = new Date(selectedDate);

    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime.getTime() + totalDuration * 60000);



    await createAppointment(startTime, endTime, { clientName: name, clientPhone: phone, clientId: user?.id ?? null });

  };



  const handleConfirmationClose = () => {

    setIsConfirmationDialogOpen(false);

    router.push("/client/dashboard/my-appointments");

  };



  const isReadyToBook = selectedServices.length > 0 && selectedBarber && selectedTime && !isLoadingTimes;



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



      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        <Card className="lg:col-span-1">

          <CardHeader>

            <CardTitle className="flex items-center gap-2">

              <Search className="h-5 w-5" /> Escolha a barbearia

            </CardTitle>

            <CardDescription>Use o ID atual ou altere se quiser agendar em outra unidade.</CardDescription>

          </CardHeader>

          <CardContent className="space-y-4">

            <div className="space-y-2">

              <Label>Barbearia</Label>

              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">

                {barbershop?.name || "Barbearia selecionada"}

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



        <Card className="lg:col-span-1">

          <CardHeader>

            <CardTitle className="flex items-center gap-2">

              <Scissors className="h-5 w-5" /> Escolha serviços e barbeiro

            </CardTitle>

          </CardHeader>

          <CardContent className="space-y-4">

            <div className="space-y-2">

              <Label>Serviços</Label>

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

            </div>



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

          <CardFooter className="flex justify-between text-sm text-muted-foreground">

            <span>Duração total: {totalDuration} min</span>

            <span>Preço estimado: {formatCurrency(totalPrice)}</span>

          </CardFooter>

        </Card>

      </div>



      <Card>

        <CardHeader>

          <CardTitle className="flex items-center gap-2">

            <CalendarIcon className="h-5 w-5" /> Escolha a data e horário

          </CardTitle>

        </CardHeader>

        <CardContent className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

          <div>

            <Calendar

              mode="single"

              selected={selectedDate}

              onSelect={(date) => setSelectedDate(date || undefined)}

              className="rounded-md border"

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

          <div className="space-y-3">

            <Label>horários disponí­vel</Label>

            {isLoadingTimes ? (

              <div className="flex items-center gap-2 text-muted-foreground">

                <Loader2 className="h-4 w-4 animate-spin" /> Buscando horários...

              </div>

            ) : error ? (

              <p className="text-sm text-destructive">{error.message}</p>

            ) : availableTimeSlots.length === 0 ? (

              <p className="text-sm text-muted-foreground">Nenhum horários disponí­vel.</p>

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

            {selectedTime ? `horários escolhido: ${selectedTime}` : "Selecione um horários"}

          </div>

          <Button onClick={handleBook} disabled={!isReadyToBook}>

            {isLoadingTimes ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}

            Confirmar agendamento

          </Button>

        </CardFooter>

      </Card>



      <GuestModal isOpen={isGuestModalOpen} onOpenChange={setIsGuestModalOpen} onConfirm={handleGuestConfirm} />



      <Dialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>

        <DialogContent>

          <DialogHeader>

            <DialogTitle>Agendamento Confirmado</DialogTitle>

            <DialogDescription>Revise os detalhes abaixo.</DialogDescription>

          </DialogHeader>

          {confirmedAppointment && (

            <div className="space-y-2">

              <p>

                <strong>Barbearia:</strong> {confirmedAppointment.barbershopName}

              </p>

              <p>

                <strong>EndereÃ§o:</strong> {confirmedAppointment.barbershopAddress}

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

                <strong>horários:</strong> {confirmedAppointment.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}

                {confirmedAppointment.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}

              </p>

            </div>

          )}

          <DialogFooter>

            <DialogClose asChild>

              <Button variant="outline">Fechar</Button>

            </DialogClose>

            <Button onClick={handleConfirmationClose}>Ver meus agendamentos</Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>

  );

}
