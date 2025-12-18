
"use client";

import Image from "next/image";
import { PlusCircle, Upload, Clock, Edit, Trash2, Link as LinkIcon, Badge, AlertTriangle } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { capitalizeWords, formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Barber, Service, BarberService, BarberSchedule, Barbershop } from "@/lib/definitions";
import { WorkHoursDialog } from "@/components/work-hours-dialog";
import { useToast } from "@/hooks/use-toast";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { fetchJson } from "@/lib/fetcher";


export default function BarbersPage() {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { toast } = useToast();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbershopData, setBarbershopData] = useState<Barbershop | null>(null);
  const [isBarbersLoading, setIsBarbersLoading] = useState(false);
  const [isServicesLoading, setIsServicesLoading] = useState(false);
  const [isBarbershopLoading, setIsBarbershopLoading] = useState(false);

  const loadBarbershopDetails = useCallback(async () => {
    if (!barbershopId) return;
    setIsBarbershopLoading(true);
    try {
      const response = await fetchJson<{ data: Barbershop[] }>(`/api/barbershops?ownerId=${encodeURIComponent(barbershopId)}`);
      setBarbershopData(response.data?.[0] ?? null);
    } catch {
      setBarbershopData(null);
    } finally {
      setIsBarbershopLoading(false);
    }
  }, [barbershopId]);

  const loadBarbers = useCallback(async () => {
    if (!barbershopId) {
      setBarbers([]);
      return;
    }
    setIsBarbersLoading(true);
    try {
      const response = await fetchJson<{ data: Barber[] }>(`/api/barbers?barbershopId=${encodeURIComponent(barbershopId)}`);
      setBarbers(response.data || []);
    } catch {
      setBarbers([]);
    } finally {
      setIsBarbersLoading(false);
    }
  }, [barbershopId]);

  const loadServices = useCallback(async () => {
    if (!barbershopId) {
      setServices([]);
      return;
    }
    setIsServicesLoading(true);
    try {
      const response = await fetchJson<{ data: Service[] }>(`/api/services?barbershopId=${encodeURIComponent(barbershopId)}`);
      setServices(response.data || []);
    } catch {
      setServices([]);
    } finally {
      setIsServicesLoading(false);
    }
  }, [barbershopId]);

  const createBarberApi = async (payload: {
    name: string;
    phone: string;
    avatarUrl: string;
    services: BarberService[];
  }) => {
    if (!barbershopId) throw new Error("barbershopId não disponível");
    const response = await fetchJson<{ data: Barber }>("/api/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, barbershopId }),
    });
    return response.data;
  };

  const updateBarberApi = async (id: string, payload: Partial<Barber>) => {
    const response = await fetchJson<{ data: Barber }>(`/api/barbers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.data;
  };

  const deleteBarberApi = async (id: string) => {
    await fetchJson<{ success: boolean }>(`/api/barbers/${id}`, { method: "DELETE" });
  };

  useEffect(() => {
    if (!barbershopId) {
      setBarbers([]);
      setServices([]);
      setBarbershopData(null);
      setIsBarbershopLoading(false);
      return;
    }
    loadBarbershopDetails();
    loadBarbers();
    loadServices();
  }, [barbershopId, loadBarbershopDetails, loadBarbers, loadServices]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isWorkHoursDialogOpen, setIsWorkHoursDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLinkServicesDialogOpen, setIsLinkServicesDialogOpen] = useState(false);
  
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [barberToDelete, setBarberToDelete] = useState<Barber | null>(null);
  
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberPhone, setNewBarberPhone] = useState("");
  const [newBarberAvatar, setNewBarberAvatar] = useState<string | null>(null);
  const [newBarberServiceIds, setNewBarberServiceIds] = useState<Set<string>>(new Set());
  
  const [barberToLink, setBarberToLink] = useState<Barber | null>(null);
  const [linkedServiceIds, setLinkedServiceIds] = useState<Set<string>>(new Set());

  const isAddFormValid = useMemo(() => {
    return newBarberName.trim() !== '' && newBarberPhone.trim().length >= 14 && newBarberServiceIds.size > 0;
  }, [newBarberName, newBarberPhone, newBarberServiceIds]);

  const isEditFormValid = useMemo(() => {
    return newBarberName.trim() !== '' && newBarberPhone.trim().length >= 14;
  }, [newBarberName, newBarberPhone]);

  const handleEditClick = (barber: Barber) => {
    setEditingBarber(barber);
    setNewBarberName(barber.name);
    setNewBarberPhone(barber.phone);
    setNewBarberAvatar(barber.avatarUrl);
    setIsEditDialogOpen(true);
  };

  const replaceBarberInList = (updated: Barber) => {
    setBarbers((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleSaveEdit = async () => {
    if (!editingBarber || !isEditFormValid) return;
    try {
      const updated = await updateBarberApi(editingBarber.id, {
        name: capitalizeWords(newBarberName),
        phone: newBarberPhone,
        avatarUrl: newBarberAvatar || editingBarber.avatarUrl,
      });
      replaceBarberInList(updated);
      toast({ title: "Barbeiro Atualizado!", description: "Os dados foram salvos com sucesso." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar o barbeiro.",
      });
    } finally {
      setIsEditDialogOpen(false);
      setEditingBarber(null);
    }
  };

  const handleAddBarber = async () => {
    if (!isAddFormValid) {
      toast({ variant: "destructive", title: "Erro", description: "Por favor, preencha todos os campos obrigatórios." });
      return;
    }

    const barberServices: BarberService[] = Array.from(newBarberServiceIds).map((serviceId) => ({ serviceId }));
    const newBarberData = {
      name: capitalizeWords(newBarberName),
      phone: newBarberPhone,
      schedule: [],
      avatarUrl: newBarberAvatar || `https://picsum.photos/seed/${new Date().getTime()}/80/80`,
      services: barberServices,
    };

    try {
      const created = await createBarberApi(newBarberData);
      setBarbers((prev) => [...prev, created]);
      toast({ title: "Barbeiro Adicionado!", description: `${capitalizeWords(newBarberName)} foi adicionado à equipe.` });
      setIsAddDialogOpen(false);
      handleWorkHoursClick(created);
      setNewBarberName("");
      setNewBarberPhone("");
      setNewBarberAvatar(null);
      setNewBarberServiceIds(new Set());
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível adicionar o barbeiro.",
      });
    }
  };


  const handleDeleteClick = (barber: Barber) => {
    setBarberToDelete(barber);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteBarber = async () => {
    if (!barberToDelete) return;
    try {
      await deleteBarberApi(barberToDelete.id);
      setBarbers((prev) => prev.filter((b) => b.id !== barberToDelete.id));
      toast({ title: "Barbeiro Excluído!", description: `${barberToDelete.name} foi removido da equipe.` });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível remover este barbeiro.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setBarberToDelete(null);
    }
  };
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target) {
            setNewBarberAvatar(loadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    if (value.length > 15) {
      value = value.substring(0, 15);
    }
    setter(value);
  };

  const handleWorkHoursClick = (barber: Barber) => {
    setSelectedBarber(barber);
    setIsWorkHoursDialogOpen(true);
  };

  const handleSaveWorkHours = async (newSchedule: Barber['schedule']) => {
    if (!selectedBarber) return;
    try {
      const updated = await updateBarberApi(selectedBarber.id, { schedule: newSchedule });
      replaceBarberInList(updated);
      toast({ title: "Horários Salvos!", description: `A agenda de ${selectedBarber.name} foi atualizada.` });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar os horários.",
      });
    } finally {
      setIsWorkHoursDialogOpen(false);
      setSelectedBarber(null);
    }
  };
  
  const handleLinkServicesClick = (barber: Barber) => {
    setBarberToLink(barber);
    setLinkedServiceIds(new Set(barber.services?.map(s => s.serviceId) || []));
    setIsLinkServicesDialogOpen(true);
  };

  const handleSaveLinkedServices = async () => {
    if (!barberToLink) return;
    const newServices: BarberService[] = Array.from(linkedServiceIds).map((id) => {
      const existingService = barberToLink.services?.find((s) => s.serviceId === id);
      return existingService || { serviceId: id };
    });
    try {
      const updated = await updateBarberApi(barberToLink.id, { services: newServices });
      replaceBarberInList(updated);
      toast({
        title: "Serviços Atualizados",
        description: `Os serviços de ${barberToLink.name} foram atualizados.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível atualizar os serviços.",
      });
    } finally {
      setIsLinkServicesDialogOpen(false);
      setBarberToLink(null);
    }
  };

  const sortedSchedule = (schedule: BarberSchedule[] | undefined) => {
      if (!schedule) return [];
      const dayOrder: { [key: string]: number } = { "Domingo": 0, "Segunda-feira": 1, "Terça-feira": 2, "Quarta-feira": 3, "Quinta-feira": 4, "Sexta-feira": 5, "Sábado": 6 };
      return [...schedule].sort((a, b) => dayOrder[a.day] - dayOrder[b.day]);
  }

  const formatWorkHours = (barberSchedule: BarberSchedule[] | undefined, shopHours: Barbershop['operatingHours'] | undefined) => {
    if (!barberSchedule || barberSchedule.length === 0) {
      return <p className="text-xs text-muted-foreground font-medium">Nenhum horário definido.</p>;
    }
    const orderedSchedule = sortedSchedule(barberSchedule);
    const shopHoursMap = new Map(shopHours?.map(h => [h.day, h]));

    return (
      <div className="space-y-1 text-xs">
        {orderedSchedule.map(s => {
          const shopDay = shopHoursMap.get(s.day);
          const isConflict = shopDay?.open === 'closed';
          return (
            <TooltipProvider key={s.day}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("flex gap-2", isConflict && "text-destructive")}>
                    <span className="font-medium w-12 shrink-0">{s.day.substring(0, 3)}:</span>
                    <span>{s.start} - {s.end}</span>
                    {isConflict && <AlertTriangle className="h-4 w-4" />}
                  </div>
                </TooltipTrigger>
                {isConflict && (
                  <TooltipContent>
                    <p>A barbearia está fechada neste dia.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  };
  
  const formatLunchTime = (schedule: BarberSchedule[] | undefined) => {
    if (!schedule || schedule.length === 0) {
      return <p className="text-xs text-muted-foreground font-medium">-</p>;
    }
     const orderedSchedule = sortedSchedule(schedule);
     return (
      <div className="space-y-1 text-xs text-muted-foreground">
        {orderedSchedule.map(s => (
          <div key={s.day} className="flex gap-2 h-4 items-center">
            <span className="font-medium w-12 shrink-0">{s.day.substring(0, 3)}:</span>
            {s.lunchTime && s.lunchTime.start && s.lunchTime.end ? (
                <span>{s.lunchTime.start} - {s.lunchTime.end}</span>
            ) : (
                <span>-</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  const formatServices = (barber: Barber) => {
    if (!barber.services || barber.services.length === 0) {
        return <p className="text-xs text-muted-foreground font-medium">Nenhum serviço vinculado.</p>;
    }
    return (
        <ul className="space-y-1 mt-2 list-disc pl-4 text-xs text-muted-foreground">
            {barber.services.slice(0, 3).map(bs => {
                const service = services?.find(s => s.id === bs.serviceId);
                return service ? <li key={bs.serviceId}>{service.name}</li> : null;
            })}
            {barber.services.length > 3 && <li>e mais {barber.services.length - 3}...</li>}
        </ul>
    );
  };

  const getWhatsAppLink = (phone: string) => {
    if (!phone) return '#';
    const cleanedPhone = phone.replace(/\D/g, '');
    return `https://wa.me/55${cleanedPhone}`;
  }

  const isLoading = isBarbershopIdLoading || isBarbershopLoading || isBarbersLoading || isServicesLoading;

  if (isLoading) {
      return (
          <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline">Barbeiros</h1>
                <Button size="sm" className="gap-1" disabled>
                    <PlusCircle className="h-4 w-4" />
                    Adicionar Barbeiro
                </Button>
              </div>
              <Card>
                <CardHeader>
                    <CardTitle>Sua Equipe</CardTitle>
                    <CardDescription>Gerencie seus barbeiros, suas agendas e os serviços que eles oferecem.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="hidden w-[100px] sm:table-cell">
                                <span className="sr-only">Imagem</span>
                                </TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead className="hidden md:table-cell">Horários</TableHead>
                                <TableHead className="hidden md:table-cell">Intervalo</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    Carregando barbeiros...
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Barbeiros</h1>
         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1 transition-transform duration-300 hover:scale-105 hover:shadow-lg" onClick={() => { setNewBarberName(""); setNewBarberPhone(""); setNewBarberAvatar(null); setNewBarberServiceIds(new Set()); setIsAddDialogOpen(true); }}>
                    <PlusCircle className="h-4 w-4" />
                    Adicionar Barbeiro
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Barbeiro</DialogTitle>
                  <DialogDescription>
                      Preencha os detalhes para adicionar um novo barbeiro à sua equipe.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                    <div className="space-y-2">
                        <Label htmlFor="add-name">Nome *</Label>
                        <Input id="add-name" value={newBarberName} onChange={(e) => setNewBarberName(e.target.value)} placeholder="Nome do Barbeiro" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="add-phone">WhatsApp *</Label>
                        <Input id="add-phone" value={newBarberPhone} onChange={(e) => handlePhoneChange(e, setNewBarberPhone)} placeholder="(XX) 9XXXX-XXXX" maxLength={15} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="add-picture">Foto</Label>
                        <Input id="add-picture" type="file" onChange={handleAvatarChange} accept="image/*" />
                    </div>
                    {newBarberAvatar && (
                        <div className="flex justify-center">
                            <Image src={newBarberAvatar} alt="Preview" width={128} height={128} className="rounded-full aspect-square object-cover" />
                        </div>
                    )}
                    <div className="space-y-2">
                      <Label>Serviços *</Label>
                      <p className="text-xs text-muted-foreground">Selecione pelo menos um serviço.</p>
                      <div className="space-y-2 rounded-md border p-4 max-h-40 overflow-y-auto">
                        {services?.map(service => (
                          <div key={service.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`add-service-${service.id}`}
                              checked={newBarberServiceIds.has(service.id)}
                              onCheckedChange={(checked) => {
                                setNewBarberServiceIds(prev => {
                                  const newSet = new Set(prev);
                                  if (checked) newSet.add(service.id);
                                  else newSet.delete(service.id);
                                  return newSet;
                                });
                              }}
                            />
                            <Label htmlFor={`add-service-${service.id}`} className="font-normal cursor-pointer">{service.name}</Label>
                          </div>
                        ))}
                        {services?.length === 0 && <p className="text-sm text-muted-foreground text-center">Nenhum serviço cadastrado.</p>}
                      </div>
                    </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" onClick={handleAddBarber} className="transition-transform duration-300 hover:scale-105 hover:shadow-lg" disabled={!isAddFormValid}>Salvar Barbeiro</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sua Equipe</CardTitle>
          <CardDescription>
            Gerencie seus barbeiros, suas agendas e os serviços que eles oferecem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Imagem</span>
                </TableHead>
                <TableHead>Nome e Serviços</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="hidden md:table-cell">Horários</TableHead>
                <TableHead className="hidden md:table-cell">Intervalo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barbers && barbers.length > 0 ? barbers.map((barber) => (
                <TableRow key={barber.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      alt="Avatar do barbeiro"
                      className="aspect-square rounded-full object-cover"
                      height="80"
                      src={barber.avatarUrl}
                      width="80"
                      data-ai-hint="person portrait"
                    />
                  </TableCell>
                  <TableCell className="font-medium align-top">
                    <div>{barber.name}</div>
                    {formatServices(barber)}
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="text-sm text-muted-foreground">{barber.phone}</p>
                    <Button variant="outline" size="sm" asChild className="mt-2 text-green-500 border-green-500 hover:bg-green-500/10 hover:text-green-500">
                        <Link href={getWhatsAppLink(barber.phone)} target="_blank">
                            <WhatsAppIcon className="mr-2 h-4 w-4"/>
                            Contatar
                        </Link>
                    </Button>
                  </TableCell>
                  <TableCell className="hidden md:table-cell align-top">
                    {formatWorkHours(barber.schedule, barbershopData?.operatingHours)}
                  </TableCell>
                   <TableCell className="hidden md:table-cell align-top">
                    {formatLunchTime(barber.schedule)}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <TooltipProvider>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" onClick={() => handleLinkServicesClick(barber)} className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                                <LinkIcon className="h-4 w-4" />
                                <span className="sr-only">Gerenciar Serviços</span>
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Gerenciar Serviços</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" onClick={() => handleWorkHoursClick(barber)} className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                                <Clock className="h-4 w-4" />
                                <span className="sr-only">Horários de Trabalho</span>
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Horários de Trabalho</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(barber)} className="text-primary hover:text-primary transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>Editar Barbeiro</p>
                          </TooltipContent>
                        </Tooltip>

                         <Tooltip>
                          <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive transition-transform duration-300 hover:scale-105 hover:shadow-lg" onClick={() => handleDeleteClick(barber)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Excluir</span>
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Excluir Barbeiro</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum barbeiro cadastrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Barbeiro</DialogTitle>
            <DialogDescription>
              Altere a foto, nome e contato do barbeiro.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-center">
              <div className="relative group">
                <Image
                  alt="Avatar do barbeiro"
                  className="aspect-square rounded-full object-cover"
                  height="128"
                  width="128"
                  src={newBarberAvatar || editingBarber?.avatarUrl || `https://picsum.photos/seed/${editingBarber?.id}/128/128`}
                />
                <label htmlFor={`picture-edit-${editingBarber?.id}`} className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="h-6 w-6" />
                </label>
                <Input id={`picture-edit-${editingBarber?.id}`} type="file" onChange={handleAvatarChange} className="sr-only" accept="image/*" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name-edit">Nome *</Label>
              <Input id="name-edit" value={newBarberName} onChange={(e) => setNewBarberName(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="edit-phone">WhatsApp *</Label>
                <Input id="edit-phone" value={newBarberPhone} onChange={(e) => handlePhoneChange(e, setNewBarberPhone)} placeholder="(XX) 9XXXX-XXXX" maxLength={15} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Cancelar</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveEdit} className="transition-transform duration-300 hover:scale-105 hover:shadow-lg" disabled={!isEditFormValid}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Link Services Dialog */}
      <Dialog open={isLinkServicesDialogOpen} onOpenChange={setIsLinkServicesDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Vincular Serviços a {barberToLink?.name}</DialogTitle>
                <DialogDescription>
                    Selecione os serviços que este barbeiro pode realizar.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                {services?.map(service => (
                    <div key={service.id} className="flex items-center justify-between p-3 rounded-md border">
                        <Label htmlFor={`service-link-${service.id}`} className="font-medium cursor-pointer">
                           {service.name}
                        </Label>
                        <Checkbox
                            id={`service-link-${service.id}`}
                            checked={linkedServiceIds.has(service.id)}
                            onCheckedChange={(checked) => {
                                setLinkedServiceIds(prev => {
                                    const newSet = new Set(prev);
                                    if(checked) {
                                        newSet.add(service.id);
                                    } else {
                                        newSet.delete(service.id);
                                    }
                                    return newSet;
                                })
                            }}
                        />
                    </div>
                ))}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline" className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSaveLinkedServices} className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Salvar Vínculos</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      

      {selectedBarber && (
        <WorkHoursDialog
          barber={selectedBarber}
          isOpen={isWorkHoursDialogOpen}
          onOpenChange={setIsWorkHoursDialogOpen}
          onSave={handleSaveWorkHours}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              barbeiro <span className='font-bold'>{barberToDelete?.name}</span> e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBarber} className="bg-destructive hover:bg-destructive/90 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
