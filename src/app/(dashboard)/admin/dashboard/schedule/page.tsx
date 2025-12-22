'use client';

import { useEffect, useMemo, useState, useCallback } from "react";
import { capitalizeWords, formatCurrency, cn } from "@/lib/utils";
import { fetchJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Search, Trash2, PlusCircle, MessageSquare, Clock, UserPlus, Loader2, Check, Calendar as CalendarIcon, FilterX, AlertTriangle } from "lucide-react";
import type { Appointment, Client, Service, Barber, Barbershop, MessageTemplate, MessageTemplateType } from "@/lib/definitions";
import { Combobox } from "@/components/ui/combobox";
import { isSameDay, format } from 'date-fns';
import { useMessageTemplates } from "@/context/MessageTemplatesContext";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ptBR } from 'date-fns/locale';

type FetchState = {
  barbershop: Barbershop | null;
  barbers: Barber[];
  clients: Client[];
  services: Service[];
  appointments: Appointment[];
};

type FullAppointment = Omit<Appointment, 'serviceIds' | 'startTime' | 'endTime'> & {
  services: Service[];
  barberName: string;
  isRegistered: boolean;
  startTime: Date;
  endTime: Date;
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

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const PHONE_MAX_DIGITS = 11;

const calendarClassNames = {
  months: "w-full flex flex-col sm:flex-row gap-4",
  month: "w-full space-y-3",
  caption: "flex justify-between items-center px-2 py-3 text-sm font-semibold text-slate-100",
  caption_label: "capitalize tracking-wide",
  nav: "flex items-center gap-2",
  nav_button:
    "inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-700/70 bg-slate-800/70 text-slate-100 hover:bg-emerald-500/90 hover:border-emerald-400 transition-colors shadow-sm p-0",
  nav_button_previous: "",
  nav_button_next: "",
  table: "w-full border-separate border-spacing-y-1 text-slate-200",
  head_row: "flex justify-between px-1 text-xs uppercase tracking-wide text-slate-400",
  head_cell: "w-9 h-8 grid place-items-center font-medium",
  row: "flex justify-between px-1",
  cell: "w-9 h-9",
  day: "w-9 h-9 rounded-full grid place-items-center text-sm hover:bg-slate-700/60 transition-colors",
  day_selected:
    "bg-emerald-500 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/30 font-semibold",
  day_today: "border border-emerald-400 text-white",
  day_outside: "text-slate-500 opacity-70",
  day_disabled: "text-slate-500 opacity-40 line-through",
};


const extractPhoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, PHONE_MAX_DIGITS);

const formatBrazilPhone = (value: string) => {
  const digits = extractPhoneDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const formatTimeRange = (start: Date, end?: Date | null) => {
  const startLabel = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (!end) return startLabel;
  const endLabel = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${startLabel} às ${endLabel}`;
};

const formatClientLabel = (client: Client) =>
  `${capitalizeWords(client.name.trim().toLowerCase())} - ${formatBrazilPhone(client.phone)}`;

const formatBarbershopAddress = (barbershop?: Barbershop | null) => {
  const address = barbershop?.address;
  if (!address) return "";

  const street = address.street?.trim();
  const number = address.number?.trim();
  const complement = address.complement?.trim();
  const neighborhood = address.neighborhood?.trim();
  const city = address.city?.trim();
  const state = address.state?.trim();

  const line = [street, number].filter(Boolean).join(", " );
  const rest = [neighborhood, city, state].filter(Boolean).join(" - " );
  const extra = complement ? ` ${complement}` : "";

  return [line + extra, rest].filter(Boolean).join(" - " );
};

const getTemplatesForBarbershop = (
  templatesFromContext: MessageTemplate[],
  barbershop?: Barbershop | null
) => {
  if (barbershop?.messageTemplates && barbershop.messageTemplates.length > 0) {
    return barbershop.messageTemplates;
  }
  return templatesFromContext;
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

export default function SchedulePage() {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { toast } = useToast();
  const { messageTemplates } = useMessageTemplates();

  const [data, setData] = useState<FetchState>({
    barbershop: null,
    barbers: [],
    clients: [],
    services: [],
    appointments: [],
  });

  const [fullAppointments, setFullAppointments] = useState<FullAppointment[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);
const [appointmentToEdit, setAppointmentToEdit] = useState<FullAppointment | null>(null);
const [editStep, setEditStep] = useState<1 | 2>(1);
const [appointmentToDelete, setAppointmentToDelete] = useState<FullAppointment | null>(null);
const [appointmentToMessage, setAppointmentToMessage] = useState<FullAppointment | null>(null);
const [manualMessage, setManualMessage] = useState("");
const [searchTerm, setSearchTerm] = useState("");

  const [registeringClientId, setRegisteringClientId] = useState<string | null>(null);

const [selectedClientId, setSelectedClientId] = useState<string>("");
const [newClientName, setNewClientName] = useState("");
const [newClientPhone, setNewClientPhone] = useState("");
const [clientWithDuplicatePhone, setClientWithDuplicatePhone] = useState<Client | null>(null);
const [pendingNewClient, setPendingNewClient] = useState<{ name: string; phone: string } | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customDuration, setCustomDuration] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [editBarberId, setEditBarberId] = useState<string>("");
  const [editServiceIds, setEditServiceIds] = useState<Set<string>>(new Set());
  const [editDate, setEditDate] = useState<Date | undefined>(new Date());
  const [editTime, setEditTime] = useState<string>("");
  const [editCustomDuration, setEditCustomDuration] = useState<string>("");

  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterBarberId, setFilterBarberId] = useState<string>("");

  const isBaseLoading = isBarbershopIdLoading;

  const loadData = useCallback(async (shopId: string) => {
    setIsLoadingDetails(true);
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
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message || "Tente novamente.",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  }, [toast]);

  useEffect(() => {
    if (barbershopId) loadData(barbershopId);
  }, [barbershopId, loadData]);

  useEffect(() => {
    const { appointments, clients, barbers, services } = data;
    if (!appointments || !clients || !barbers || !services) {
      setFullAppointments([]);
      return;
    }
    const processed = appointments
      .map((appt: Appointment) => {
        const client = appt.clientId ? clients.find((c: Client) => c.id === appt.clientId) : null;
        const servicesAppt = services.filter((s: Service) => appt.serviceIds.includes(s.id));
        const barber = barbers.find((b: Barber) => b.id === appt.barberId);
        const mapped: FullAppointment = {
          ...appt,
          clientName: client?.name || appt.clientName,
          clientPhone: client?.phone || appt.clientPhone,
          startTime: new Date(appt.startTime),
          endTime: new Date(appt.endTime),
          services: servicesAppt,
          barberName: barber?.name || "Barbeiro desconhecido",
          isRegistered: !!client,
        };
        return mapped;
      })
      .sort((a: FullAppointment, b: FullAppointment) => a.startTime.getTime() - b.startTime.getTime());
    setFullAppointments(processed);
  }, [data]);

  const availableServices = useMemo(() => {
    if (!selectedBarberId || !data.barbers || !data.services) {
      return [];
    }
    const barber = data.barbers.find((b: Barber) => b.id === selectedBarberId);
    if (!barber || !barber.services || barber.services.length === 0) return [];
    const barberServiceIds = new Set(barber.services.map((s) => s.serviceId));
    return data.services.filter((s: Service) => barberServiceIds.has(s.id));
  }, [selectedBarberId, data.barbers, data.services]);

  useEffect(() => {
    if (selectedClientId && selectedClientId !== "new" && data.clients) {
      const client = data.clients.find((c: Client) => c.id === selectedClientId);
      if (client) {
        setNewClientPhone(formatBrazilPhone(client.phone));
        setNewClientName(client.name);
      }
    } else {
      setNewClientName("");
      setNewClientPhone("");
    }
  }, [selectedClientId, data.clients]);

  useEffect(() => {
    if (data.services && selectedServiceIds.size > 0) {
      const services = data.services.filter((s: Service) => selectedServiceIds.has(s.id));
      const totalDuration = services.reduce((acc: number, s: Service) => acc + s.duration, 0);
      setCustomDuration(String(totalDuration));
    } else {
      setCustomDuration("");
    }
    setSelectedTime("");
  }, [selectedServiceIds, data.services]);

  // Ao trocar o barbeiro, zerar serviços e horário selecionados para evitar inconsistência
  useEffect(() => {
    setSelectedServiceIds(new Set());
    setSelectedTime("");
  }, [selectedBarberId]);

  useEffect(() => {
    if (data.services && editServiceIds.size > 0) {
      const services = data.services.filter((s: Service) => editServiceIds.has(s.id));
      const totalDuration = services.reduce((acc: number, s: Service) => acc + s.duration, 0);
      setEditCustomDuration(String(totalDuration));
    } else {
      setEditCustomDuration("");
    }
  }, [editServiceIds, data.services]);

  const resetForm = () => {
    setSelectedClientId("");
    setNewClientName("");
    setNewClientPhone("");
    setSelectedBarberId("");
    setSelectedServiceIds(new Set());
    setSelectedDate(undefined);
    setSelectedTime("");
    setCustomDuration("");
    setAppointmentToEdit(null);
    setCurrentStep(1);
  };

  const canCompleteStep1 = useMemo(() => {
    if (!selectedClientId) return false;
    if (selectedClientId !== "new") return true;
    const hasName = newClientName.trim().length > 0;
    const digits = extractPhoneDigits(newClientPhone);
    return hasName && digits.length >= 10;
  }, [newClientName, newClientPhone, selectedClientId]);

  const canCompleteStep2 = useMemo(() => {
    return canCompleteStep1 && !!selectedBarberId && selectedServiceIds.size > 0;
  }, [canCompleteStep1, selectedBarberId, selectedServiceIds]);

  const canCompleteStep3 = useMemo(() => {
    return canCompleteStep2 && !!selectedDate && !!selectedTime;
  }, [canCompleteStep2, selectedDate, selectedTime]);

  const guardedSetStep = (next: 1 | 2 | 3) => {
    if (next === 1) {
      setCurrentStep(1);
      return;
    }
    if (next === 2 && canCompleteStep1) {
      setCurrentStep(2);
      return;
    }
    if (next === 3 && canCompleteStep2) {
      setCurrentStep(3);
      return;
    }
  };

  const sendConfirmationMessage = useCallback(
    async (payload: {
      clientName: string;
      clientPhone: string;
      services: Service[];
      startTime: Date;
      barberName: string;
    }) => {
      if (!barbershopId) return;

      const cleanedNumber = extractPhoneDigits(payload.clientPhone);
      if (cleanedNumber.length < 10) return;
      const normalizedNumber = cleanedNumber.startsWith("55")
        ? cleanedNumber
        : `55${cleanedNumber}`;

      const templates = getTemplatesForBarbershop(messageTemplates, data.barbershop);
      const totalPrice = payload.services.reduce((acc, service) => acc + service.price, 0);
      const message = buildTemplateMessage("Confirmação de Agendamento", templates, {
        clientName: payload.clientName,
        services: payload.services.map((s) => s.name).join(", "),
        serviceValue: formatCurrency(totalPrice),
        barbershopAddress: formatBarbershopAddress(data.barbershop),
        startTime: payload.startTime,
        barberName: payload.barberName,
        barbershopName: data.barbershop?.name || "sua barbearia",
      });

      if (!message) return;

      try {
        const response = await fetch("/api/bitsafira/message/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barbershopId,
            number: normalizedNumber,
            message,
            envioImediato: 1,
            clientName: payload.clientName,
            messageType: "Confirmação de Agendamento",
          }),
        });
        const result = await response.json();
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Falha ao enviar confirmação automática.");
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Não foi possível enviar a confirmação automática",
          description: error?.message || "Verifique a conexão do WhatsApp e tente novamente.",
        });
      }
    },
    [barbershopId, data.barbershop, messageTemplates, toast]
  );

  const createClient = async (payload: Partial<Client> & { barbershopId: string }) => {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = (json as any)?.error || "Não foi possível criar cliente";
      throw new Error(message);
    }
    return (json as any)?.data as Client;
  };

const createAppt = async (payload: any) => {
  const res = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Não foi possível criar agendamento");
  const json = await res.json();
  return json.data as Appointment;
};

const updateAppt = async (id: string, payload: any) => {
  const res = await fetch(`/api/appointments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Não foi possível atualizar agendamento");
  const json = await res.json();
  return json.data as Appointment;
};

const deleteAppt = async (id: string) => {
  const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Não foi possível remover agendamento");
};

  const finishAppointment = async (finalClientId: string | null, finalClientName: string, finalClientPhone: string) => {
    const totalDuration = parseInt(customDuration, 10) || 0;
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = new Date(selectedDate as Date);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);

    const createdAppt = await createAppt({
      barbershopId,
      barberId: selectedBarberId,
      clientId: finalClientId,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      serviceIds: Array.from(selectedServiceIds),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: "confirmed",
      totalDuration,
    });

    setData((prev: FetchState) => ({ ...prev, appointments: [...prev.appointments, createdAppt] }));

    const selectedServices = data.services.filter((s) => selectedServiceIds.has(s.id));
    const barberName = data.barbers.find((b) => b.id === selectedBarberId)?.name || "Barbeiro";

    await sendConfirmationMessage({
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      services: selectedServices,
      startTime,
      barberName,
    });

    toast({ title: "Agendamento Criado!", description: "O agendamento foi confirmado." });
    resetForm();
    setCurrentStep(1);
  };

  const handleCreateAppointment = async () => {
    if (!barbershopId || !data.services || !data.clients) return;
    const isNewClient = selectedClientId === "new";
    const phoneDigits = extractPhoneDigits(newClientPhone);
    const trimmedName = newClientName.trim();

    if (isNewClient && (!newClientName || phoneDigits.length < 10)) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha nome e um WhatsApp v\u00e1lido (10-11 d\u00edgitos)." });
      return;
    }
    if (!selectedClientId) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um cliente." });
      return;
    }
    if (!selectedBarberId || selectedServiceIds.size === 0 || !selectedDate) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha barbeiro, serviços e data." });
      return;
    }
    if (!selectedTime) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhum horário selecionado. Verifique horários disponíveis.",
      });
      return;
    }

    if (!canCompleteStep3 || currentStep !== 3) {
      // Direciona para o passo correto se ainda não estiver concluído
      guardedSetStep(!canCompleteStep1 ? 1 : !canCompleteStep2 ? 2 : 3);
      return;
    }

    let finalClientId: string | null = null;
    let finalClientName: string;
    let finalClientPhone: string;

    try {
      if (isNewClient) {
        finalClientName = capitalizeWords(trimmedName);
        finalClientPhone = phoneDigits;
        const duplicate = data.clients.find((c) => extractPhoneDigits(c.phone) === finalClientPhone);
        const sameName = duplicate
          ? duplicate.name.trim().toLowerCase() === finalClientName.toLowerCase()
          : false;

        if (duplicate && sameName) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Já existe um cliente com o mesmo nome e WhatsApp.",
          });
          return;
        }

        if (duplicate && !sameName) {
          setPendingNewClient({ name: finalClientName, phone: finalClientPhone });
          setClientWithDuplicatePhone(duplicate);
          setIsDuplicateWarningOpen(true);
          return;
        }
        const created = await createClient({ barbershopId, name: finalClientName, phone: finalClientPhone });
        finalClientId = created.id;
        setData((prev: FetchState) => ({ ...prev, clients: [...prev.clients, created] }));
      } else {
        const client = data.clients.find((c) => c.id === selectedClientId);
        if (!client) {
          toast({ variant: "destructive", title: "Erro", description: "Cliente não encontrado." });
          return;
        }
        finalClientId = client.id;
        finalClientName = client.name;
        finalClientPhone = client.phone;
      }

      await finishAppointment(finalClientId, finalClientName, finalClientPhone);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao criar agendamento." });
    }
  };

  const handleCancelDuplicateClient = () => {
    setIsDuplicateWarningOpen(false);
    setPendingNewClient(null);
    setClientWithDuplicatePhone(null);
  };

  const handleConfirmDuplicateClient = async () => {
    if (!pendingNewClient || !barbershopId) {
      handleCancelDuplicateClient();
      return;
    }
    try {
      const created = await createClient({
        barbershopId,
        name: pendingNewClient.name,
        phone: pendingNewClient.phone,
      });
      setData((prev: FetchState) => ({ ...prev, clients: [...prev.clients, created] }));
      handleCancelDuplicateClient();
      await finishAppointment(created.id, created.name, created.phone);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao criar cliente." });
      handleCancelDuplicateClient();
    }
  };

  const handleEditClick = (appointment: FullAppointment) => {
    setAppointmentToEdit(appointment);
    setEditStep(1);
    setEditBarberId(appointment.barberId);
    setEditServiceIds(new Set(appointment.services.map((s) => s.id)));
    setEditDate(appointment.startTime);
    setEditTime(appointment.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    const duration = appointment.totalDuration || appointment.services.reduce((acc, s) => acc + s.duration, 0);
    setEditCustomDuration(String(duration));
    setIsEditDialogOpen(true);
  };

  const handleUpdateAppointment = async () => {
    if (!appointmentToEdit || !editBarberId || !editDate || !editTime || !barbershopId || editServiceIds.size === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos." });
      return;
    }
    const [hours, minutes] = editTime.split(":").map(Number);
    const newStartTime = new Date(editDate);
    newStartTime.setHours(hours, minutes, 0, 0);
    const totalDuration = parseInt(editCustomDuration, 10) || 0;
    const newEndTime = new Date(newStartTime.getTime() + totalDuration * 60000);

    try {
      const updated = await updateAppt(appointmentToEdit.id, {
        barberId: editBarberId,
        serviceIds: Array.from(editServiceIds),
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        totalDuration,
      });
      setData((prev: FetchState) => ({
        ...prev,
        appointments: prev.appointments.map((a) => (a.id === updated.id ? updated : a)),
      }));
      const updatedServices = data.services.filter((s) => editServiceIds.has(s.id));
      const barberName = data.barbers.find((b) => b.id === editBarberId)?.name || "Barbeiro";
      await sendConfirmationMessage({
        clientName: appointmentToEdit.clientName,
        clientPhone: appointmentToEdit.clientPhone,
        services: updatedServices,
        startTime: newStartTime,
        barberName,
      });
      toast({ title: "Agendamento Atualizado!", description: "O agendamento foi alterado." });
      setAppointmentToEdit(null);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível atualizar." });
    }
  };

  const handleDeleteClick = (appointment: FullAppointment) => {
    setAppointmentToDelete(appointment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAppointment = async () => {
    if (appointmentToDelete && barbershopId) {
      try {
        await deleteAppt(appointmentToDelete.id);
        setData((prev: FetchState) => ({
          ...prev,
          appointments: prev.appointments.filter((a) => a.id !== appointmentToDelete.id),
        }));
        toast({ title: "Agendamento Excluído", description: "O horário foi removido da agenda." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível remover." });
      }
    }
    setAppointmentToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const generateMessage = (appointment: FullAppointment) => {
    if (!appointment) return "";
    const templates = getTemplatesForBarbershop(messageTemplates, data.barbershop);
    return (
      buildTemplateMessage("Confirmação Manual", templates, {
        clientName: appointment.clientName,
        services: appointment.services.map((s) => s.name).join(", "),
        serviceValue: formatCurrency(appointment.services.reduce((acc, service) => acc + service.price, 0)),
        barbershopAddress: formatBarbershopAddress(data.barbershop),
        startTime: appointment.startTime,
        barberName: appointment.barberName,
        barbershopName: data.barbershop?.name || "sua barbearia",
      }) || "Modelo de mensagem não encontrado ou desativado."
    );
  };

  const handleMessageClick = (appointment: FullAppointment) => {
    setAppointmentToMessage(appointment);
    setManualMessage(generateMessage(appointment));
    setIsMessageDialogOpen(true);
  };

  const handleSendWhatsAppMessage = () => {
    if (!appointmentToMessage || !manualMessage || !appointmentToMessage.clientPhone) {
      return;
    }

    const phone = appointmentToMessage.clientPhone.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(manualMessage);
    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    window.open(url, "_blank");
    toast({
      title: "WhatsApp aberto",
      description: "A conversa foi aberta no WhatsApp Web.",
    });
    setIsMessageDialogOpen(false);
  };

  const handleRegisterGuest = async (appointment: FullAppointment) => {
    if (!barbershopId || !appointment.clientPhone || !appointment.clientName) return;
    if (appointment.isRegistered) return;
    setRegisteringClientId(appointment.id);
    try {
      const created = await createClient({ barbershopId, name: appointment.clientName, phone: appointment.clientPhone });
      setData((prev: FetchState) => ({ ...prev, clients: [...prev.clients, created] }));
      const updated = await updateAppt(appointment.id, { clientId: created.id });
      setData((prev: FetchState) => ({
        ...prev,
        appointments: prev.appointments.map((a) => (a.id === updated.id ? updated : a)),
      }));
      toast({ title: "Cliente cadastrado", description: "Convidado vinculado à barbearia." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível cadastrar." });
    } finally {
      setRegisteringClientId(null);
    }
  };

  const isDayDisabled = (date?: Date) => {
    if (!date || !data.barbershop?.operatingHours) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    const dayName = weekDaysMap[date.getDay()];
    const hours = data.barbershop.operatingHours.find((h) => h.day === dayName);
    if (!hours) return false;
    if (hours.open.toLowerCase() === "closed") return true;
    return false;
  };

  const getAvailableTimeSlots = useMemo(() => {
    return (barberId: string, date?: Date, totalDuration?: number) => {
      if (!date || !totalDuration || !data.barbershop || !data.barbers || !data.appointments) return [];
      const barber = data.barbers.find((b) => b.id === barberId);
      if (!barber || !barber.schedule) return [];
      const now = new Date();
      const isToday = isSameDay(date, now);
      const dayName = weekDaysMap[date.getDay()];
      const shopHours = data.barbershop.operatingHours?.find((h) => h.day === dayName);
      const barberHours = barber.schedule.find((s) => s.day === dayName);
      if (!shopHours || !barberHours) return [];
      if (shopHours.open.toLowerCase() === "closed") return [];
      const openMinutes = Math.max(toMinutes(shopHours.open), toMinutes(barberHours.start));
      const closeMinutes = Math.min(toMinutes(shopHours.close), toMinutes(barberHours.end));
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const existing = data.appointments
        .filter((a) => a.barberId === barberId && isSameDay(new Date(a.startTime), date))
        .map((a) => ({ start: new Date(a.startTime), end: new Date(a.endTime) }));
      const slots: string[] = [];
      for (let t = openMinutes; t + totalDuration <= closeMinutes; t += 10) {
        const start = new Date(dayStart.getTime() + t * 60000);
        const end = new Date(start.getTime() + totalDuration * 60000);
        if (isToday && start < now) continue;
        const overlaps = existing.some(
          (appt) =>
            isWithinInterval(start, { start: appt.start, end: appt.end }) ||
            isWithinInterval(appt.start, { start, end })
        );
        if (!overlaps) {
          slots.push(start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }
      }
      return slots;
    };
  }, [data.barbershop, data.barbers, data.appointments]);

  const availableTimeSlots = useMemo(() => {
    const totalDuration = Math.max(parseInt(customDuration || "0", 10) || 0, 15);
    return getAvailableTimeSlots(selectedBarberId, selectedDate, totalDuration);
  }, [selectedBarberId, selectedDate, customDuration, getAvailableTimeSlots]);

  const availableTimeSlotsEdit = useMemo(() => {
    const totalDuration = Math.max(parseInt(editCustomDuration || "0", 10) || 0, 15);
    return getAvailableTimeSlots(editBarberId, editDate, totalDuration);
  }, [editBarberId, editDate, editCustomDuration, getAvailableTimeSlots]);

  const filteredAppointments = useMemo(() => {
    let list = [...fullAppointments];
    if (filterDate) list = list.filter((a) => isSameDay(a.startTime, filterDate));
    if (filterBarberId && filterBarberId !== "all") list = list.filter((a) => a.barberId === filterBarberId);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          a.clientName.toLowerCase().includes(term) ||
          a.clientPhone.toLowerCase().includes(term) ||
          a.barberName.toLowerCase().includes(term)
      );
    }
    return list;
  }, [fullAppointments, filterDate, filterBarberId, searchTerm]);

  const groupedAppointments = useMemo(() => {
    return filteredAppointments.reduce((acc: Record<string, FullAppointment[]>, appt: FullAppointment) => {
      const barberName = appt.barberName || "Sem barbeiro";
      if (!acc[barberName]) acc[barberName] = [];
      acc[barberName].push(appt);
      return acc;
    }, {});
  }, [filteredAppointments]);

  const clearFilters = () => {
    setFilterDate(undefined);
    setFilterBarberId("");
    setSearchTerm("");
  };

  const isLoading = isBaseLoading || isLoadingDetails;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Carregando...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Aguarde enquanto carregamos os dados.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Novo Agendamento
                  </CardTitle>
                  <CardDescription>Cadastre um novo horário para um cliente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {[
                      { step: 1, label: "Cliente", done: currentStep > 1 },
                      { step: 2, label: "Barbeiro & Serviços", done: currentStep > 2 },
                      { step: 3, label: "Data & Horário", done: false },
                    ].map(({ step, label, done }, idx, arr) => {
                      const isActive = currentStep === step;
                      const clickable = step < currentStep; // só permite voltar para passos já concluídos
                      const canEnter =
                        step === 1 ? true : step === 2 ? canCompleteStep1 : canCompleteStep2;
                      const circleClasses = cn(
                        "h-9 w-9 rounded-full grid place-items-center border text-sm font-semibold transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : done
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-slate-700 bg-slate-800 text-muted-foreground"
                      );
                      const line =
                        idx < arr.length - 1 ? (
                          <div
                            className={cn(
                              "flex-1 h-0.5",
                              currentStep > step ? "bg-emerald-500" : "bg-slate-700"
                            )}
                          />
                        ) : null;

                      const handleStepClick = () => {
                        if (!clickable || !canEnter) return;
                        guardedSetStep(step as 1 | 2 | 3);
                      };

                      return (
                        <div key={step} className="flex items-center gap-3 flex-1">
                          <button
                            type="button"
                            onClick={handleStepClick}
                            disabled={!clickable || !canEnter}
                            className="flex items-center gap-2 group w-full text-left"
                          >
                            <div className={circleClasses}>{step}</div>
                            <div className="text-sm text-slate-200 group-disabled:text-muted-foreground">
                              {label}
                            </div>
                          </button>
                          {line}
                        </div>
                      );
                    })}
                  </div>

                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Cliente</Label>
                        <Combobox
                          options={[
                            { label: "Cadastrar novo cliente", value: "new" },
                            ...(data.clients || []).map((client) => ({
                              label: formatClientLabel(client),
                              value: client.id,
                            })),
                          ]}
                          value={selectedClientId}
                          onChange={setSelectedClientId}
                          placeholder="Selecione ou cadastre um cliente"
                        />
                        {selectedClientId === "new" && (
                          <div className="space-y-2 mt-2">
                            <Input
                              placeholder="Nome do cliente"
                              value={newClientName}
                              onChange={(e) => setNewClientName(e.target.value)}
                            />
                            <Input
                              placeholder="WhatsApp"
                              value={newClientPhone}
                              onChange={(e) => setNewClientPhone(formatBrazilPhone(e.target.value))}
                              inputMode="tel"
                              maxLength={16}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Barbeiro</Label>
                        <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o barbeiro" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.barbers?.map((barber) => (
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
                          {!selectedBarberId && (
                            <div className="text-sm text-muted-foreground">
                              Selecione um barbeiro para ver os serviços disponíveis.
                            </div>
                          )}
                          {selectedBarberId && availableServices.length === 0 && (
                            <div className="text-sm text-muted-foreground">
                              Nenhum serviço habilitado para este barbeiro.
                            </div>
                          )}
                          {availableServices?.map((service) => (
                            <div key={service.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`service-${service.id}`}
                                checked={selectedServiceIds.has(service.id)}
                                disabled={!selectedBarberId}
                                onCheckedChange={(checked) => {
                                  setSelectedServiceIds((prev) => {
                                    const newSet = new Set(prev);
                                    if (checked) newSet.add(service.id);
                                    else newSet.delete(service.id);
                                    return newSet;
                                  });
                                }}
                              />
                              <Label htmlFor={`service-${service.id}`} className="flex justify-between w-full cursor-pointer">
                                <span>{service.name}</span>
                                <span className="text-muted-foreground">
                                  {service.duration} min · {formatCurrency(service.price)}
                                </span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="custom-duration">Duração Total (minutos)</Label>
                        <Input
                          id="custom-duration"
                          type="number"
                          value={customDuration}
                          onChange={(e) => setCustomDuration(e.target.value)}
                          placeholder="Ex: 60"
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-2">
                      <Label>Data & Horário</Label>
                      <div className="flex flex-col gap-3">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          showOutsideDays
                          className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 shadow-xl text-slate-100 [--rdp-accent-color:#10b981]"
                          classNames={calendarClassNames}
                          disabled={isDayDisabled}
                        />
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-2 w-full max-h-96 overflow-y-auto">
                          {selectedBarberId ? (
                            availableTimeSlots.length > 0 ? (
                              availableTimeSlots.map((time) => (
                                <Button
                                  key={time}
                                  variant={selectedTime === time ? "default" : "outline"}
                                  onClick={() => setSelectedTime(time)}
                                  className="transition-colors"
                                >
                                  {time}
                                </Button>
                              ))
                            ) : (
                              <div className="col-span-full flex items-center justify-center h-full text-center text-muted-foreground text-sm p-4 bg-muted/50 rounded-md">
                                Nenhum horário disponível para o dia selecionado.
                              </div>
                            )
                          ) : (
                            <div className="col-span-full flex items-center justify-center h-full text-center text-muted-foreground text-sm p-4 bg-muted/50 rounded-md">
                              Selecione um barbeiro para ver os horários.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <div className="flex justify-between w-full">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))}
                      disabled={currentStep === 1}
                      className="transition-transform duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      Voltar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev))}
                      disabled={
                        (currentStep === 1 && (!selectedClientId || (selectedClientId === "new" && (!newClientName.trim() || extractPhoneDigits(newClientPhone).length < 10)))) ||
                        (currentStep === 2 && (!selectedBarberId || selectedServiceIds.size === 0))
                      }
                      className="transition-transform duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      {currentStep === 3 ? "Pronto" : "Próximo"}
                    </Button>
                  </div>
                  {currentStep === 3 && (
                    <Button onClick={handleCreateAppointment} className="w-full transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                      Cadastrar Agendamento
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="space-y-4">
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Buscar Agendamento
                  </CardTitle>
                  <Input
                    placeholder="Nome, telefone ou barbeiro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full sm:w-[240px] justify-start text-left font-normal",
                            !filterDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filterDate ? format(filterDate, "PPP", { locale: ptBR }) : <span>Filtrar por data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <Select value={filterBarberId} onValueChange={setFilterBarberId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por barbeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os barbeiros</SelectItem>
                        {data.barbers?.map((barber) => (
                          <SelectItem key={barber.id} value={barber.id}>
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" onClick={clearFilters} className="gap-2">
                      <FilterX className="h-4 w-4" />
                      Limpar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="text-center p-8">Carregando...</div>
                  ) : Object.keys(groupedAppointments).length > 0 ? (
                    Object.entries(groupedAppointments).map(([barberName, appts]) => (
                      <div key={barberName}>
                        <div className="px-4 py-3 border-t border-b border-slate-800 bg-slate-900/60">
                          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-4 py-2 shadow-sm">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100">Barbeiro</span>
                            <span className="text-sm font-bold text-emerald-50">{barberName}</span>
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Horário</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Serviços</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {appts.map((appointment) => (
                              <TableRow key={appointment.id}>
                                <TableCell>
                                  <p className="font-medium">
                                    {formatTimeRange(appointment.startTime, appointment.endTime)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {appointment.startTime.toLocaleDateString()}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <p>{appointment.clientName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {appointment.clientPhone ? formatBrazilPhone(appointment.clientPhone) : "—"}
                                  </p>
                                  {appointment.isRegistered ? (
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                      <Check className="h-4 w-4 mr-1 text-primary" />
                                      Cadastrado
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-1 h-6 px-1.5 py-0.5 text-xs"
                                      onClick={() => handleRegisterGuest(appointment)}
                                      disabled={registeringClientId === appointment.id}
                                    >
                                      {registeringClientId === appointment.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <UserPlus className="h-3 w-3" />
                                      )}
                                      <span className="ml-1">Cadastrar</span>
                                    </Button>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <ul className="text-xs list-disc pl-4 text-muted-foreground">
                                    {appointment.services.map((s) => (
                                      <li key={s.id}>{s.name}</li>
                                    ))}
                                  </ul>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {appointment.services.length
                                    ? formatCurrency(
                                        appointment.services.reduce((acc, service) => acc + service.price, 0)
                                      )
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleMessageClick(appointment)}
                                      className="text-green-500 hover:text-green-500 h-8 w-8"
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditClick(appointment)}
                                      className="text-primary hover:text-primary h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive h-8 w-8"
                                      onClick={() => handleDeleteClick(appointment)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground p-8">
                      Nenhum agendamento encontrado para os filtros selecionados.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Editar Agendamento</DialogTitle>
                <DialogDescription>Altere serviços, barbeiro, data ou horário.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-6">
                {editStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Input value={appointmentToEdit?.clientName || ""} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Serviços</Label>
                      <div className="space-y-2 rounded-md border p-4 max-h-56 overflow-y-auto">
                        {data.services
                          ?.filter((service) => {
                            const barber = data.barbers?.find((b) => b.id === editBarberId);
                            return barber?.services?.some((s) => s.serviceId === service.id);
                          })
                          .map((service) => (
                            <div key={service.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-service-${service.id}`}
                                checked={editServiceIds.has(service.id)}
                                onCheckedChange={(checked) => {
                                  setEditServiceIds((prev) => {
                                    const newSet = new Set(prev);
                                    if (checked) newSet.add(service.id);
                                    else newSet.delete(service.id);
                                    return newSet;
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
                      <Label htmlFor="edit-custom-duration">Duração Total (minutos)</Label>
                      <Input
                        id="edit-custom-duration"
                        type="number"
                        value={editCustomDuration}
                        onChange={(e) => setEditCustomDuration(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-barber">Barbeiro</Label>
                      <Select value={editBarberId} onValueChange={setEditBarberId}>
                        <SelectTrigger id="edit-barber">
                          <SelectValue placeholder="Selecione o barbeiro" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.barbers?.map((barber) => (
                            <SelectItem key={barber.id} value={barber.id}>
                              {barber.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {editStep === 2 && (
                  <div className="grid gap-4 md:grid-cols-[1fr,1fr]">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={setEditDate}
                      showOutsideDays
                      className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 shadow-xl text-slate-100 [--rdp-accent-color:#10b981]"
                      classNames={calendarClassNames}
                      disabled={isDayDisabled}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-h-[320px] overflow-y-auto">
                      {availableTimeSlotsEdit.map((time) => (
                        <Button
                          key={time}
                          variant={editTime === time ? "default" : "outline"}
                          onClick={() => setEditTime(time)}
                          className="transition-colors w-full justify-center text-sm leading-tight py-2 min-w-[90px]"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {editStep === 1 ? "Etapa 1/2: Serviços e barbeiro" : "Etapa 2/2: Data e horário"}
                </div>
                <div className="flex gap-2">
                  {editStep === 2 && (
                    <Button
                      variant="outline"
                      className="transition-transform duration-300 hover:scale-105 hover:shadow-lg"
                      onClick={() => setEditStep(1)}
                    >
                      Voltar
                    </Button>
                  )}
                  {editStep === 1 ? (
                    <Button
                      className="transition-transform duration-300 hover:scale-105 hover:shadow-lg"
                      onClick={() => setEditStep(2)}
                    >
                      Próximo
                    </Button>
                  ) : (
                    <>
                      <DialogClose asChild>
                        <Button variant="outline" className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button onClick={handleUpdateAppointment} className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                        Salvar Alterações
                      </Button>
                    </>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      {/* Duplicate Phone Warning Dialog */}
      <AlertDialog open={isDuplicateWarningOpen} onOpenChange={setIsDuplicateWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500 h-6 w-6" />
              Número de WhatsApp Duplicado
            </AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um cliente chamado{" "}
              <span className="font-bold">{clientWithDuplicatePhone?.name}</span> com este número. Deseja cadastrar
              mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDuplicateClient}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicateClient}>Sim, Cadastrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o agendamento do cliente{" "}
                  <span className="font-bold">{appointmentToDelete?.clientName}</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteAppointment}
                  className="bg-destructive hover:bg-destructive/90 transition-transform duration-300 hover:scale-105 hover:shadow-lg"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar Mensagem Manual</DialogTitle>
              <DialogDescription>
                A mensagem abaixo será enviada para{" "}
                <span className="font-bold">{appointmentToMessage?.clientName}</span> no número{" "}
                {appointmentToMessage?.clientPhone ? formatBrazilPhone(appointmentToMessage.clientPhone) : "—"}.
              </DialogDescription>
            </DialogHeader>
              <div className="py-4">
                <div className="p-4 border rounded-md bg-muted/50 text-sm">{manualMessage}</div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button
                  onClick={handleSendWhatsAppMessage}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Enviar via WhatsApp
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function isWithinInterval(date: Date, interval: { start: Date; end: Date }) {
  return date >= interval.start && date <= interval.end;
}



