'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { capitalizeWords, formatCurrency, cn } from "@/lib/utils";
import type { Client, Appointment, Service, Barber, Barbershop, MessageTemplate } from "@/lib/definitions";
import { fetchJson } from "@/lib/fetcher";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { PlusCircle, Trash2, Edit, Search, Mail, Loader2, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { useMessageTemplates } from "@/context/MessageTemplatesContext";
import { isSameDay, format, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

type FetchState = {
  barbershop: Barbershop | null;
  barbers: Barber[];
  services: Service[];
  clients: Client[];
  appointments: Appointment[];
};

type FullAppointment = Appointment & {
  barberName?: string;
  servicesDetailed?: Service[];
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

const extractPhoneDigits = (value: string) => value.replace(/\D/g, "");

const getTemplatesForBarbershop = (
  templatesFromContext: MessageTemplate[],
  barbershop?: Barbershop | null
) => {
  if (barbershop?.messageTemplates && barbershop.messageTemplates.length > 0) {
    return barbershop.messageTemplates;
  }
  return templatesFromContext;
};

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

const buildTemplateMessage = (
  templateType: "Confirmação de Agendamento",
  templates: MessageTemplate[],
  context: {
    clientName: string;
    barbershopName: string;
    services: string;
    serviceValue: string;
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

function isWithinInterval(date: Date, interval: { start: Date; end: Date }) {
  return date >= interval.start && date <= interval.end;
}

export default function ClientsPage() {
  const { barbershopId } = useBarbershopId();
  const { toast } = useToast();
  const { messageTemplates } = useMessageTemplates();

  const [data, setData] = useState<FetchState>({
    barbershop: null,
    barbers: [],
    services: [],
    clients: [],
    appointments: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // dialogs/controls
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);

  // client form
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientWithDuplicatePhone, setClientWithDuplicatePhone] = useState<Client | null>(null);

  // appointment form
  const [clientToSchedule, setClientToSchedule] = useState<Client | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customDuration, setCustomDuration] = useState<string>("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  // fetch data
  useEffect(() => {
    const load = async () => {
      if (!barbershopId) return;
      setIsLoading(true);
      try {
      const [shopJson, barbersJson, servicesJson, clientsJson, apptsJson] = await Promise.all([
        fetchJson<{ data: Barbershop[] }>(`/api/barbershops?ownerId=${encodeURIComponent(barbershopId)}`),
        fetchJson<{ data: Barber[] }>(`/api/barbers?barbershopId=${encodeURIComponent(barbershopId)}`),
        fetchJson<{ data: Service[] }>(`/api/services?barbershopId=${encodeURIComponent(barbershopId)}`),
        fetchJson<{ data: Client[] }>(`/api/clients?barbershopId=${encodeURIComponent(barbershopId)}`),
        fetchJson<{ data: Appointment[] }>(`/api/appointments?barbershopId=${encodeURIComponent(barbershopId)}`),
      ]);
      setData({
        barbershop: shopJson.data?.[0] || null,
        barbers: barbersJson.data || [],
        services: servicesJson.data || [],
        clients: clientsJson.data || [],
        appointments: apptsJson.data || [],
      });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao carregar dados." });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [barbershopId, toast]);

  // available services based on barber
  const availableServices = useMemo(() => {
    if (!selectedBarberId) return data.services;
    const barber = data.barbers.find((b) => b.id === selectedBarberId);
    if (!barber || !barber.services) return [];
    const ids = new Set(barber.services.map((s) => s.serviceId));
    return data.services.filter((s) => ids.has(s.id));
  }, [selectedBarberId, data.services, data.barbers]);

  // update total duration
  useEffect(() => {
    if (data.services && selectedServiceIds.size > 0) {
      const services = data.services.filter((s) => selectedServiceIds.has(s.id));
      const total = services.reduce((acc, s) => acc + s.duration, 0);
      setCustomDuration(String(total));
    } else {
      setCustomDuration("");
    }
  }, [selectedServiceIds, data.services]);

  const handlePhoneChange = (value: string) => {
    let v = value.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    if (v.length > 15) v = v.substring(0, 15);
    setNewClientPhone(v);
  };

  const phoneDigits = (phone: string) => phone.replace(/\D/g, "");
  const isValidPhone = (phone: string) => {
    const digits = phoneDigits(phone);
    return digits.length >= 10 && digits.length <= 11;
  };

  const formatPhone = (phone: string) => {
    const digits = phoneDigits(phone);
    if (digits.length < 10) return phone;
    const normalized = digits.slice(0, 11);
    const ddd = normalized.slice(0, 2);
    const hasEleven = normalized.length === 11;
    const nine = hasEleven ? normalized.slice(2, 3) : "";
    const middle = hasEleven ? normalized.slice(3, 7) : normalized.slice(2, 6);
    const end = hasEleven ? normalized.slice(7) : normalized.slice(6);
    return hasEleven ? `(${ddd}) ${nine} ${middle}-${end}` : `(${ddd}) ${middle}-${end}`;
  };

  const resetClientForms = () => {
    setNewClientName("");
    setNewClientPhone("");
    setNewClientEmail("");
    setClientToEdit(null);
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
  };

  const createClient = async (payload: Partial<Client> & { barbershopId: string }) => {
    const json = await fetchJson<{ data: Client }>("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return json.data;
  };

  const updateClient = async (id: string, payload: Partial<Client>) => {
    const json = await fetchJson<{ data: Client }>(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return json.data;
  };

  const deleteClient = async (id: string) => {
    await fetchJson<{ success: boolean }>(`/api/clients/${id}`, { method: "DELETE" });
  };

  const createAppointment = async (payload: any) => {
    const json = await fetchJson<{ data: Appointment }>("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return json.data;
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
      const normalizedNumber = cleanedNumber.startsWith("55") ? cleanedNumber : `55${cleanedNumber}`;

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

  const handleAddOrUpdateClient = async () => {
    if (!newClientName || !newClientPhone || !barbershopId) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha nome e WhatsApp." });
      return;
    }
    const trimmedName = newClientName.trim();
    if (!/^[A-Za-zÁ-ÿ]/.test(trimmedName)) {
      toast({ variant: "destructive", title: "Erro", description: "O nome deve começar com uma letra." });
      return;
    }
    if (!isValidPhone(newClientPhone)) {
      toast({ variant: "destructive", title: "Erro", description: "Informe um WhatsApp válido (DDD + número)." });
      return;
    }
    const isEditing = !!clientToEdit;
    const normalizedDigits = phoneDigits(newClientPhone);
    const normalizedName = trimmedName.toLowerCase();

    if (isEditing && clientToEdit) {
      const duplicates = (data.clients || []).filter(
        (c) => c.id !== clientToEdit.id && phoneDigits(c.phone) === normalizedDigits
      );
      const sameName = duplicates.find((c) => c.name.trim().toLowerCase() === normalizedName);
      if (sameName) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Já existe um cliente com o mesmo nome e WhatsApp.",
        });
        return;
      }
    } else {
      const duplicates = (data.clients || []).filter((c) => phoneDigits(c.phone) === normalizedDigits);
      if (duplicates.length > 0) {
        const sameName = duplicates.find((c) => c.name.trim().toLowerCase() === normalizedName);
        if (sameName) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Já existe um cliente com o mesmo nome e WhatsApp.",
          });
          return;
        }
        setClientWithDuplicatePhone(duplicates[0]);
        setIsDuplicateWarningOpen(true);
        return;
      }
    }

    const clientData = {
      name: capitalizeWords(newClientName),
      phone: newClientPhone,
      email: newClientEmail || "",
      barbershopId,
    };

    if (isEditing && clientToEdit) {
      try {
        const updated = await updateClient(clientToEdit.id, clientData);
        setData((prev) => ({
          ...prev,
          clients: prev.clients.map((c) => (c.id === updated.id ? updated : c)),
        }));
        toast({ title: "Cliente Atualizado!", description: `Os dados de ${clientData.name} foram salvos.` });
        resetClientForms();
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao atualizar." });
      }
    } else {
      const existingClient = data.clients.find((c) => c.phone === newClientPhone);
      if (existingClient) {
        setClientWithDuplicatePhone(existingClient);
        setIsDuplicateWarningOpen(true);
        return;
      }
      try {
        const created = await createClient(clientData);
        setData((prev) => ({ ...prev, clients: [...prev.clients, created] }));
        toast({ title: "Cliente Adicionado!", description: `${clientData.name} foi adicionado.` });
        resetClientForms();
        setIsDuplicateWarningOpen(false);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao criar cliente." });
      }
    }
  };

  const proceedWithClientCreation = async () => {
    if (!barbershopId) return;
    const normalizedDigits = phoneDigits(newClientPhone);
    const normalizedName = newClientName.trim().toLowerCase();
    const duplicates = (data.clients || []).filter((c) => phoneDigits(c.phone) === normalizedDigits);
    const sameName = duplicates.find((c) => c.name.trim().toLowerCase() === normalizedName);
    if (sameName) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Já existe um cliente com o mesmo nome e WhatsApp.",
      });
      setIsDuplicateWarningOpen(false);
      return;
    }
    if (!isValidPhone(newClientPhone)) {
      toast({ variant: "destructive", title: "Erro", description: "Informe um WhatsApp válido (DDD + número)." });
      return;
    }
    try {
      const created = await createClient({
        barbershopId,
        name: capitalizeWords(newClientName),
        phone: newClientPhone,
        email: newClientEmail || "",
      });
      setData((prev) => ({ ...prev, clients: [...prev.clients, created] }));
      toast({ title: "Cliente Adicionado!", description: `${created.name} foi adicionado.` });
      resetClientForms();
      setIsDuplicateWarningOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao criar cliente." });
    }
  };

  const handleEditClick = (client: Client) => {
    setClientToEdit(client);
    setNewClientName(client.name);
    setNewClientPhone(client.phone);
    setNewClientEmail(client.email || "");
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (clientToDelete) {
      try {
        await deleteClient(clientToDelete.id);
        setData((prev) => ({
          ...prev,
          clients: prev.clients.filter((c) => c.id !== clientToDelete.id),
        }));
        toast({ title: "Cliente Removido", description: `${clientToDelete.name} foi removido.` });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao remover cliente." });
      }
    }
    setClientToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const getWhatsAppLink = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, "")}`;

  // appointment helpers
  const resetAppointmentForm = () => {
    setClientToSchedule(null);
    setSelectedBarberId("");
    setSelectedServiceIds(new Set());
    setSelectedDate(undefined);
    setSelectedTime("");
    setCustomDuration("");
    setAvailableTimeSlots([]);
  };

  const handleScheduleClick = (client: Client) => {
    setClientToSchedule(client);
    resetAppointmentForm();
    setIsAppointmentDialogOpen(true);
  };

  useEffect(() => {
    if (!selectedBarberId || !selectedDate || !customDuration || !data.barbershop) {
      setAvailableTimeSlots([]);
      return;
    }
    const duration = parseInt(customDuration, 10);
    if (Number.isNaN(duration) || duration <= 0) {
      setAvailableTimeSlots([]);
      return;
    }
    const barber = data.barbers.find((b) => b.id === selectedBarberId);
    if (!barber) {
      setAvailableTimeSlots([]);
      return;
    }
    setIsLoadingTimes(true);
    const dayName = weekDaysMap[selectedDate.getDay()];
    const barberDay = barber.schedule?.find((s) => s.day === dayName);
    const shopDay = data.barbershop?.operatingHours?.find((h) => h.day === dayName);
    if (!barberDay || !shopDay || shopDay.open.toLowerCase() === "closed") {
      setAvailableTimeSlots([]);
      setIsLoadingTimes(false);
      return;
    }
    const openMinutes = Math.max(toMinutes(shopDay.open), toMinutes(barberDay.start));
    const closeMinutes = Math.min(toMinutes(shopDay.close), toMinutes(barberDay.end));
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const existing = data.appointments
      .filter((a) => a.barberId === barber.id && isSameDay(new Date(a.startTime), selectedDate))
      .map((a) => ({ start: new Date(a.startTime), end: new Date(a.endTime) }));

    const slots: string[] = [];
    for (let t = openMinutes; t + duration <= closeMinutes; t += 15) {
      const start = new Date(dayStart.getTime() + t * 60000);
      const end = new Date(start.getTime() + duration * 60000);
      const overlaps = existing.some(
        (appt) => isWithinInterval(start, { start: appt.start, end: appt.end }) || isWithinInterval(appt.start, { start, end })
      );
      if (!overlaps)
        slots.push(start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    }
    setAvailableTimeSlots(slots);
    setIsLoadingTimes(false);
  }, [selectedBarberId, selectedDate, customDuration, data.appointments, data.barbers, data.barbershop]);

  const handleCreateAppointment = async () => {
    if (!clientToSchedule || !selectedBarberId || selectedServiceIds.size === 0 || !selectedDate || !selectedTime || !barbershopId) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos do agendamento." });
      return;
    }
    const totalDuration = parseInt(customDuration, 10) || 0;
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);

    try {
      const created = await createAppointment({
        barbershopId,
        clientId: clientToSchedule.id,
        clientName: clientToSchedule.name,
        clientPhone: clientToSchedule.phone,
        barberId: selectedBarberId,
        serviceIds: Array.from(selectedServiceIds),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: "confirmed",
        totalDuration,
      });
      setData((prev) => ({ ...prev, appointments: [...prev.appointments, created] }));
      const selectedServicesDetailed = data.services.filter((s) => selectedServiceIds.has(s.id));
      const barberName = data.barbers.find((b) => b.id === selectedBarberId)?.name || "Barbeiro";
      await sendConfirmationMessage({
        clientName: clientToSchedule.name,
        clientPhone: clientToSchedule.phone,
        services: selectedServicesDetailed,
        startTime,
        barberName,
      });
      toast({ title: "Agendamento Criado!", description: `Agendamento para ${clientToSchedule.name} confirmado.` });
      setIsAppointmentDialogOpen(false);
      resetAppointmentForm();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Falha ao criar agendamento." });
    }
  };

  const filteredClients = useMemo(() => {
    if (!data.clients) return [];
    if (!searchTerm.trim()) return data.clients;
    const normalized = searchTerm.toLowerCase().replace(/\s+/g, "");
    const digits = searchTerm.replace(/\D/g, "");
    return data.clients.filter((c) => {
      const nameMatch = (c.name || "").toLowerCase().includes(normalized);
      const phoneDigits = (c.phone || "").replace(/\D/g, "");
      const phoneMatch = digits ? phoneDigits.includes(digits) : false;
      return nameMatch || phoneMatch;
    });
  }, [data.clients, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Clientes</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetClientForms(); setIsAddDialogOpen(isOpen); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
              <PlusCircle className="h-4 w-4" />
              Adicionar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              <DialogDescription>Preencha os dados abaixo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-client-name">Nome *</Label>
                <Input id="add-client-name" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-client-phone">WhatsApp *</Label>
                <Input id="add-client-phone" value={newClientPhone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="(XX) 9XXXX-XXXX" maxLength={15} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-client-email">Email (Opcional)</Label>
                <Input id="add-client-email" type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
              <Button onClick={handleAddOrUpdateClient}>Salvar Cliente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sua Lista de Clientes</CardTitle>
          <CardDescription>Gerencie as informações dos seus clientes.</CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              className="pl-10"
              value={searchTerm}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>
          ) : filteredClients && filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <Card key={client.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`https://picsum.photos/seed/${client.id}/128/128`} alt={client.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-base">{client.name}</CardTitle>
                      {client.email && (
                        <CardDescription className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </CardDescription>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-muted-foreground">{formatPhone(client.phone)}</p>
                  </CardContent>
                  <CardFooter className="grid grid-cols-3 gap-2 p-2 bg-muted/50">
                    <Button variant="outline" size="sm" asChild className="text-green-500 border-green-500 hover:bg-green-500/10 hover:text-green-500">
                      <Link href={getWhatsAppLink(client.phone)} target="_blank">
                        <WhatsAppIcon className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(client)}
                      className="text-primary hover:text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Edit className="h-4 w-4 group-hover:text-primary-foreground" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(client)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <p>Nenhum cliente encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetClientForms(); setIsEditDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Altere os dados do cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-name">Nome</Label>
              <Input id="edit-client-name" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-phone">WhatsApp</Label>
              <Input id="edit-client-phone" value={newClientPhone} onChange={(e) => handlePhoneChange(e.target.value)} maxLength={15} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-email">Email</Label>
              <Input id="edit-client-email" type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleAddOrUpdateClient}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto removerá <span className="font-bold">{clientToDelete?.name}</span> da sua lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClient} className="bg-destructive hover:bg-destructive/90">
              Remover da Lista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Phone Warning Dialog */}
      <AlertDialog open={isDuplicateWarningOpen} onOpenChange={setIsDuplicateWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500 h-6 w-6" />
              Número de WhatsApp Duplicado
            </AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um cliente chamado <span className="font-bold">{clientWithDuplicatePhone?.name}</span> com este número.
              Deseja cadastrar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDuplicateWarningOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithClientCreation}>Sim, Cadastrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Appointment Dialog */}
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Agendamento para {clientToSchedule?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Barbeiro *</Label>
              <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {data.barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Serviços *</Label>
              <div className="space-y-2 rounded-md border p-4 max-h-40 overflow-y-auto">
                {availableServices.map((s) => (
                  <div key={s.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${s.id}`}
                      checked={selectedServiceIds.has(s.id)}
                      onCheckedChange={(checked) =>
                        setSelectedServiceIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(s.id);
                          else next.delete(s.id);
                          return next;
                        })
                      }
                    />
                    <Label htmlFor={`service-${s.id}`} className="flex justify-between w-full cursor-pointer">
                      <span>{s.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(s.price)}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duração Total (minutos)</Label>
              <Input type="number" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Data & Horário *</Label>
              <div className="flex flex-col md:flex-row gap-4">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
                <div className="grid grid-cols-3 gap-2 w-full max-h-60 overflow-y-auto">
                  {isLoadingTimes ? (
                    <p className="col-span-3 text-center">Carregando...</p>
                  ) : availableTimeSlots.length > 0 ? (
                    availableTimeSlots.map((t) => (
                      <Button key={t} variant={selectedTime === t ? "default" : "outline"} onClick={() => setSelectedTime(t)}>
                        {t}
                      </Button>
                    ))
                  ) : (
                    <p className="col-span-3 text-center">Nenhum horário disponível.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreateAppointment}>Confirmar Agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
