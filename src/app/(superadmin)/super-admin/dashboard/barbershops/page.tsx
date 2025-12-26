
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
  DialogDescription
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Mail, Smartphone, Calendar, Edit, Search, ExternalLink, Trash2, AlertCircleIcon, FilterX, KeyRound, RefreshCw, Copy } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parse, isValid, isBefore, startOfDay, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/context/AuthContext";
import Link from 'next/link';
import { formatCurrency, cn, capitalizeWords } from "@/lib/utils";
import { fetchJson } from "@/lib/fetcher";

type SuperAdminBarbershop = {
    id: string;
    name: string;
    legalName?: string;
    cpfCnpj?: string;
    ownerId: string;
    email: string;
    phone: string;
    plan: 'Basico' | 'Premium';
    status: 'Ativa' | 'Inativa';
    expiryDate: string;
    registeredDate: string;
    operatingHours: any[];
    address: {
        street: string;
        number: string;
        complement: string;
        neighborhood: string;
        city: string;
        state: string;
        cep: string;
    };
    fullAddressString: string;
    whatsappStatus?: string;
    qrCodeBase64?: string | null;
    bitsafiraInstanceId?: string | null;
    bitSafiraToken?: string | null;
    whatsAppInstanceId?: string | null;
    bitsafiraInstanceData?: any;
};

const planPrices = {
    'Basico': 49.90,
    'Premium': 119.90
};

const normalizePlan = (plan?: string) =>
    plan?.toLowerCase().includes("prem") ? "Premium" : "Basico";

export default function BarbershopsPage() {
    const { toast } = useToast();
    const { isLoading: isUserLoading } = useAuth();
    const [rawBarbershops, setRawBarbershops] = useState<any[]>([]);
    const [isLoadingBarbershops, setIsLoadingBarbershops] = useState(true);
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [isLoadingTickets, setIsLoadingTickets] = useState(true);
    const [displayedBarbershops, setDisplayedBarbershops] = useState<SuperAdminBarbershop[]>([]);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [shopToDelete, setShopToDelete] = useState<SuperAdminBarbershop | null>(null);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
    const [isUpdatingAll, setIsUpdatingAll] = useState(false);
    const [editingShop, setEditingShop] = useState<SuperAdminBarbershop | null>(null);
    const [formState, setFormState] = useState<Partial<SuperAdminBarbershop & { password?: string }>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPlan, setFilterPlan] = useState('all');
    const [isDeletingInstanceId, setIsDeletingInstanceId] = useState<string | null>(null);
    const [isCreatingInstanceId, setIsCreatingInstanceId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoadingBarbershops(true);
        setIsLoadingTickets(true);
        try {
            const [barbershopsResponse, ticketsResponse] = await Promise.all([
                fetchJson<{ data: any[] }>("/api/barbershops"),
                fetchJson<{ data: any[] }>("/api/tickets"),
            ]);
            setRawBarbershops(barbershopsResponse.data ?? []);
            setSupportTickets(ticketsResponse.data ?? []);
        } catch (error: any) {
            console.error("Erro ao carregar barbearias:", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar dados",
                description: error.message || "No foi possvel carregar as barbearias.",
            });
        } finally {
            setIsLoadingBarbershops(false);
            setIsLoadingTickets(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const allBarbershops = useMemo(() => {
        if (!rawBarbershops) return [];
        return rawBarbershops.map((shop) => {
            let addressObj: SuperAdminBarbershop['address'] = { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', cep: '' };
            let fullAddressString = '';

            if (typeof shop.address === 'object' && shop.address !== null) {
                addressObj = { ...addressObj, ...shop.address };
                fullAddressString = `${addressObj.street || ''}, ${addressObj.number || ''}${addressObj.complement ? `, ${addressObj.complement}` : ''} - ${addressObj.neighborhood || ''}, ${addressObj.city || ''} - ${addressObj.state || ''}, ${addressObj.cep || ''}`;
            }

            const expiryDate = shop.expiryDate ? new Date(shop.expiryDate) : null;
            let status: SuperAdminBarbershop['status'] = shop.status || 'Inativa';

            // Regra: se o status estiver salvo como Inativa, mantém inativa mesmo com data futura.
            // Caso contrário, usa a data de vencimento para marcar como Inativa quando já venceu.
            if (status !== 'Inativa' && expiryDate && isBefore(expiryDate, startOfDay(new Date()))) {
                status = 'Inativa';
            } else if (status !== 'Inativa') {
                status = 'Ativa';
            }

            return {
                id: shop.id,
                name: shop.name || 'Nome no definido',
                legalName: shop.legalName,
                cpfCnpj: shop.cpfCnpj,
                ownerId: shop.ownerId,
                email: shop.email || 'E-mail no informado',
                phone: shop.phone || '(00) 00000-0000',
                plan: normalizePlan(shop.plan),
                status,
                expiryDate: expiryDate ? format(expiryDate, 'dd/MM/yyyy') : 'N/A',
                registeredDate: shop.createdAt ? format(new Date(shop.createdAt), 'dd/MM/yyyy') : 'N/A',
                operatingHours: shop.operatingHours || [],
                address: addressObj,
                fullAddressString,
                whatsappStatus: shop.whatsappStatus,
                qrCodeBase64: shop.qrCodeBase64,
                bitsafiraInstanceId: shop.bitsafiraInstanceId,
                bitSafiraToken: shop.bitSafiraToken,
                whatsAppInstanceId: shop.whatsAppInstanceId,
                bitsafiraInstanceData: shop.bitsafiraInstanceData,
            };
        });
    }, [rawBarbershops]);


    useEffect(() => {
        let filtered = allBarbershops;

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(shop => 
                shop.name.toLowerCase().includes(lowercasedTerm) ||
                (shop.ownerId && shop.ownerId.toLowerCase().includes(lowercasedTerm)) ||
                shop.email.toLowerCase().includes(lowercasedTerm)
            );
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(shop => shop.status === filterStatus);
        }

        if (filterPlan !== 'all') {
            filtered = filtered.filter(shop => shop.plan === filterPlan);
        }
        
        setDisplayedBarbershops(filtered);
    }, [searchTerm, filterStatus, filterPlan, allBarbershops]);
    
    const watchedCep = formState.address?.cep;

    useEffect(() => {
      const fetchAddress = async () => {
        if (!isEditDialogOpen && !isAddDialogOpen) return;
        if (!watchedCep) return;
        const cleanedCep = watchedCep.replace(/\D/g, "");
        if (cleanedCep.length === 8) {
          try {
            const response = await fetch(`/api/cep/${cleanedCep}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (!data.error) {
              setFormState((prev) => {
                  const newAddress = { 
                      ...(prev.address || {}), 
                      street: data.street, 
                      neighborhood: data.neighborhood, 
                      city: data.city, 
                      state: data.state 
                  };
                  return { ...prev, address: newAddress as SuperAdminBarbershop['address'] };
              });
            } else {
                throw new Error(data.error || 'CEP no encontrado.');
            }
          } catch (error) {
            console.error("Failed to fetch address:", error);
            toast({ variant: "destructive", title: "Erro de CEP", description: "No foi possvel buscar o endereo." });
          }
        }
      };
      fetchAddress();
    }, [watchedCep, toast, isEditDialogOpen, isAddDialogOpen]);
    
    const watchedCnpj = formState.cpfCnpj;
     useEffect(() => {
        const fetchCompanyData = async () => {
            if (!isAddDialogOpen && !isEditDialogOpen) return;
            if(!watchedCnpj) return;
            const cleanedCnpj = watchedCnpj.replace(/\D/g, "");
            if (cleanedCnpj.length === 14) {
                try {
                    const response = await fetch(`/api/cnpj/${cleanedCnpj}`);
                    const data = await response.json();
                    if (!data.error) {
                       setFormState(prev => ({
                           ...prev,
                           legalName: data.razao_social || prev.legalName,
                           name: data.nome_fantasia || prev.name
                       }));
                    }
                } catch (error) {
                    console.error("Failed to fetch CNPJ data:", error);
                }
            }
        };
        fetchCompanyData();
    }, [watchedCnpj, isAddDialogOpen, isEditDialogOpen]);

    // Atualiza a lista ao receber eventos de sincronização (outra aba / outro usuário)
    useEffect(() => {
        const syncHandler = () => {
            void loadData();
        };

        // CustomEvent emitido localmente
        window.addEventListener("barbershop-updated", syncHandler as EventListener);
        // storage usado entre abas
        const storageHandler = (event: StorageEvent) => {
            if (event.key === "barbershop-updated") {
                syncHandler();
            }
        };
        window.addEventListener("storage", storageHandler);

        return () => {
            window.removeEventListener("barbershop-updated", syncHandler as EventListener);
            window.removeEventListener("storage", storageHandler);
        };
    }, [loadData]);

    const handleEditClick = (shop: Barbershop) => {
        setEditingShop(shop);
        setFormState({ ...shop, plan: normalizePlan(shop.plan) });
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (shop: Barbershop) => {
        setShopToDelete(shop);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!shopToDelete) {
            toast({ variant: "destructive", title: "Erro", description: "Nenhuma barbearia selecionada para excluso." });
            return;
        }

        try {
            await fetchJson(`/api/barbershops/${shopToDelete.id}`, { method: "DELETE" });
            setRawBarbershops(prev => prev!.filter(s => s.id !== shopToDelete.id));
            toast({ title: "Barbearia Excluda!", description: `${shopToDelete.name} foi removida do banco de dados.` });
            await loadData();
        } catch (error: any) {
            console.error("Erro ao excluir barbearia:", error);
            toast({ variant: "destructive", title: "Erro ao Excluir", description: error.message || "No foi possvel remover a barbearia do banco de dados." });
        } finally {
            setIsDeleteDialogOpen(false);
            setShopToDelete(null);
            setDeleteConfirmationInput('');
        }
    };


    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        value = value.replace(/\D/g, "");
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        if (value.length > 15) {
            value = value.substring(0, 15);
        }
        setFormState(prev => ({ ...prev, phone: value }));
    };

    const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (!value) {
            setFormState(prev => ({ ...prev, cpfCnpj: '' }));
            return;
        }
        value = value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            value = value.substring(0, 14);
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        setFormState(prev => ({ ...prev, cpfCnpj: value }));
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let processedValue = value;
        if (name === 'cep') {
            processedValue = value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2");
        }
        setFormState(prev => ({
            ...prev,
            address: {
                ...prev.address!,
                [name]: processedValue,
            }
        }));
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
         setFormState(prev => ({ ...prev, [name]: capitalizeWords(value) }));
    };

    const handleSelectChange = (name: keyof Barbershop, value: string) => {
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date: Date | undefined) => {
        if (date) {
            setFormState(prev => ({ ...prev, expiryDate: format(date, 'dd/MM/yyyy') }));
        }
    };

    const handleSave = async () => {
        if (!editingShop) {
            toast({ variant: "destructive", title: "Erro", description: "Nenhuma barbearia selecionada." });
            return;
        }

        try {
            const updateData: Record<string, unknown> = {
                name: formState.name,
                legalName: formState.legalName,
                cpfCnpj: formState.cpfCnpj,
                address: formState.address,
                phone: formState.phone,
                plan: formState.plan,
                status: formState.status,
            };

            if (formState.email) {
                updateData.email = formState.email;
            }

            if (formState.expiryDate) {
                const parsedDate = parse(formState.expiryDate, 'dd/MM/yyyy', new Date());
                if (isValid(parsedDate)) {
                    updateData.expiryDate = parsedDate.toISOString();
                }
            }

            const response = await fetchJson<{ data: any }>(`/api/barbershops/${editingShop.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });

            const updatedShop = response.data;
            setRawBarbershops(prev => prev!.map(s => (s.id === updatedShop.id ? updatedShop : s)));

            toast({ title: "Dados da barbearia salvos!", description: "As informações no banco de dados foram atualizadas." });
            if (typeof window !== "undefined") {
                const barbershopUpdatePayload = { ...updatedShop, ownerId: updatedShop.ownerId };
                window.dispatchEvent(new CustomEvent("barbershop-updated", { detail: barbershopUpdatePayload }));
                try {
                    window.localStorage.setItem(
                        "barbershop-updated",
                        JSON.stringify({ ...barbershopUpdatePayload, timestamp: Date.now() })
                    );
                } catch (error) {
                    console.warn("No foi possvel sincronizar a atualizao entre abas:", error);
                }
            }
            // Garante que os dados renderizados reflitam o estado mais recente vindo da API
            await loadData();
        } catch (error: any) {
            console.error("Erro ao atualizar barbearia:", error);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: error.message || "No foi possvel atualizar os dados da barbearia.",
            });
        } finally {
            setIsEditDialogOpen(false);
            setEditingShop(null);
        }
    };
    
    const handleCreate = async () => {
        if (!formState.email || !formState.password || !formState.name) {
            toast({ variant: "destructive", title: "Erro", description: "Email, senha e nome da barbearia so obrigatrios." });
            return;
        }
        setIsSubmitting(true);

        try {
            const registerResponse = await fetchJson<{ data: { id: string } }>("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formState.email,
                    password: formState.password,
                    name: formState.name,
                    phone: formState.phone,
                    role: "ADMIN",
                }),
            });

            const ownerId = registerResponse.data.id;
            const trialEndDate = addDays(new Date(), 7);
            const createResponse = await fetchJson<{ data: any }>("/api/barbershops", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formState.name,
                    legalName: formState.legalName,
                    email: formState.email,
                    address: formState.address,
                    phone: formState.phone,
                    cpfCnpj: formState.cpfCnpj,
                    ownerId,
                    plan: formState.plan || "Basico",
                    status: "Ativa",
                    expiryDate: trialEndDate.toISOString(),
                }),
            });

            const createdShop = createResponse.data;
            setRawBarbershops(prev => [...(prev || []), createdShop]);
            toast({ title: "Barbearia Criada!", description: `${formState.name} foi adicionada com sucesso.` });
            setIsAddDialogOpen(false);
            setFormState({});
            await loadData();
        } catch (error: any) {
            console.error("Erro ao criar barbearia:", error);
            const baseDescription = error.message?.includes("in use")
                ? "Este e-mail j est em uso por outro proprierio."
                : "Ocorreu um erro ao criar a barbearia.";
            toast({ variant: "destructive", title: "Erro no Cadastro", description: baseDescription });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterStatus('all');
        setFilterPlan('all');
    };

    const handleUpdateAllBarbershops = useCallback(async () => {
        setIsUpdatingAll(true);
        try {
            // Sincroniza status/instância do WhatsApp (BitSafira) de cada barbearia
            for (const shop of rawBarbershops || []) {
                if (!shop?.id) continue;
                try {
                    await fetchJson("/api/bitsafira/validate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ barbershopId: shop.id }),
                    });
                } catch (err) {
                    console.warn("Falha ao validar barbearia", shop.id, err);
                }
            }
            await loadData();
            toast({ title: "Barbearias atualizadas", description: "Status e instâncias sincronizados." });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar",
                description: error?.message || "Não foi possível sincronizar as barbearias.",
            });
        } finally {
            setIsUpdatingAll(false);
        }
    }, [rawBarbershops, loadData, toast]);

    const getGoogleMapsLink = (address: Barbershop['address']) => {
        const fullAddress = `${address.street}, ${address.number}, ${address.city}, ${address.state}`;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    }

    const getWhatsAppLink = (phone: string) => {
        const cleanedPhone = phone.replace(/\D/g, '');
        return `https://wa.me/55${cleanedPhone}`;
    }
    
    if (isUserLoading || isLoadingBarbershops) {
        return <div className="p-8">Carregando dados...</div>
    }
    
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Gerenciar Barbearias</CardTitle>
                            <CardDescription>Visualize e edite todos os dados das barbearias cadastradas ({displayedBarbershops.length} de {allBarbershops.length})</CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={handleUpdateAllBarbershops}
                          disabled={isUpdatingAll}
                        >
                            <RefreshCw className={`h-4 w-4 ${isUpdatingAll ? "animate-spin" : ""}`} /> Atualizar
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 pt-4">
                        <div className="relative flex-grow min-w-[200px]">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                           <Input placeholder="Buscar por nome, ID ou email..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Todos os Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="Ativa">Ativa</SelectItem>
                                <SelectItem value="Inativa">Inativa</SelectItem>
                            </SelectContent>
                        </Select>
                         <Select value={filterPlan} onValueChange={setFilterPlan}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Todos os Planos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Planos</SelectItem>
                                <SelectItem value="Basico">Basico</SelectItem>
                                <SelectItem value="Premium">Premium</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                           <Button variant="ghost" onClick={handleClearFilters}><FilterX className="mr-2 h-4 w-4"/>Limpar</Button>
                        </div>
                    </div>
                </CardHeader>
                                <CardContent className="space-y-4">
                    {displayedBarbershops.map(shop => (
                        <div
                            key={shop.id}
                            className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-slate-900/70 via-slate-900/55 to-slate-900/80 p-5 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur"
                        >
                            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.12),transparent_35%),linear-gradient(135deg,rgba(16,185,129,0.08),transparent)]" />
                            <div className="flex items-start justify-between gap-4 relative z-10">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-bold text-lg text-foreground">{shop.name}</h3>
                                        <Badge
                                            variant="outline"
                                            className="text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                                        >
                                            {shop.plan && shop.plan.toLowerCase().startsWith("b") ? "Basico" : shop.plan}
                                        </Badge>
                                        <Badge
                                            variant={shop.status === "Ativa" ? "default" : "destructive"}
                                            className={
                                                shop.status === "Ativa"
                                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                                                    : "bg-red-500/15 text-red-300 border-red-500/40"
                                            }
                                        >
                                            {shop.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{shop.legalName} - {shop.cpfCnpj}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        {shop.phone}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="h-7 px-2 text-emerald-300 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                                        >
                                            <Link href={getWhatsAppLink(shop.phone)} target="_blank" rel="noopener noreferrer">
                                                WhatsApp
                                            </Link>
                                        </Button>
                                    </p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Barbershop ID</p>
                                    <div className="flex items-center justify-end gap-2">
                                        <Badge variant="outline" className="font-mono text-xs border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                                            {shop.id}
                                        </Badge>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard?.writeText(shop.id)}>
                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">Endereco</p>
                                    <p className="text-sm text-muted-foreground">{shop.fullAddressString}</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="h-7 px-2 text-sky-300 border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20"
                                    >
                                        <Link href={getGoogleMapsLink(shop.address)} target="_blank" rel="noopener noreferrer">
                                            Ver no mapa
                                        </Link>
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => navigator.clipboard?.writeText(shop.fullAddressString || "")}
                                        >
                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">E-mail do proprietario</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-muted-foreground">{shop.email}</p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => navigator.clipboard?.writeText(shop.email || "")}
                                        >
                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Plano</p>
                                            <p className="text-sm text-muted-foreground">
                                                {shop.plan && shop.plan.toLowerCase().startsWith("b") ? "Basico" : shop.plan}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Data de Vencimento</p>
                                            <p className="text-sm text-muted-foreground">{shop.expiryDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Cadastrado em</p>
                                            <p className="text-sm text-muted-foreground">{shop.registeredDate}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <KeyRound className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <p className="text-sm font-medium">Instancia BitSafira</p>
                                                {shop.bitsafiraPhone && (
                                                    <p className="text-xs text-muted-foreground">Numero: {shop.bitsafiraPhone}</p>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {shop.plan.toLowerCase().startsWith("prem") ? (
                                                    <>
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {shop.bitsafiraInstanceId ?? "Nao conectada"}
                                                        </Badge>
                                                        {shop.bitsafiraInstanceId && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => navigator.clipboard?.writeText(shop.bitsafiraInstanceId || "")}
                                                            >
                                                                <Copy className="h-4 w-4 text-muted-foreground" />
                                                            </Button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Badge variant="outline" className="font-mono text-xs text-yellow-500 border-yellow-500/50">
                                                        Plano Básico
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {!shop.bitsafiraInstanceId && shop.plan.toLowerCase().startsWith("prem") && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() => handleCreateInstance(shop)}
                                                        disabled={isCreatingInstanceId === shop.id}
                                                    >
                                                        {isCreatingInstanceId === shop.id ? "Gerando..." : "Gerar nova instancia"}
                                                    </Button>
                                                )}
                                                {shop.bitsafiraInstanceId && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() => handleDeleteInstance(shop)}
                                                        disabled={isDeletingInstanceId === shop.id}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {isDeletingInstanceId === shop.id ? "Removendo..." : "Excluir instancia"}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <CardFooter className="p-0 pt-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => handleEditClick(shop)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                                <Button variant="destructive" onClick={() => handleDeleteClick(shop)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
                            </CardFooter>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Editar Barbearia</DialogTitle>
                        <DialogDescription>
                            Atualize os dados da barbearia {editingShop?.name} (Cdigo: {editingShop?.ownerId})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Barbearia</Label>
                                <Input id="name" name="name" value={formState.name || ''} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="legalName">Nome/Empresa (Razo Social)</Label>
                                <Input id="legalName" name="legalName" value={formState.legalName || ''} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                                <Input id="cpfCnpj" name="cpfCnpj" value={formState.cpfCnpj || ''} onChange={handleCpfCnpjChange} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                               <div className="space-y-2 col-span-1">
                                    <Label htmlFor="cep">CEP</Label>
                                    <Input id="cep" name="cep" value={formState.address?.cep || ''} onChange={handleAddressChange} maxLength={9} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="street">Rua</Label>
                                    <Input id="street" name="street" value={formState.address?.street || ''} onChange={handleAddressChange} />
                                </div>
                            </div>
                             <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="number">Nmero</Label>
                                    <Input id="number" name="number" value={formState.address?.number || ''} onChange={handleAddressChange} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="neighborhood">Bairro</Label>
                                    <Input id="neighborhood" name="neighborhood" value={formState.address?.neighborhood || ''} onChange={handleAddressChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">Cidade</Label>
                                    <Input id="city" name="city" value={formState.address?.city || ''} onChange={handleAddressChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state">Estado (UF)</Label>
                                    <Input id="state" name="state" value={formState.address?.state || ''} onChange={handleAddressChange} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="complement">Complemento</Label>
                                <Input id="complement" name="complement" value={formState.address?.complement || ''} onChange={handleAddressChange} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email do Proprietrio</Label>
                                    <Input id="email" name="email" type="email" value={formState.email || ''} onChange={handleFormChange} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">WhatsApp do Propriio</Label>
                                    <Input id="phone" name="phone" value={formState.phone || ''} onChange={handlePhoneChange} maxLength={15} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Status da Assinatura</Label>
                                    <Select value={formState.status} onValueChange={(value) => handleSelectChange('status' as keyof Barbershop, value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ativa">Ativa</SelectItem>
                                            <SelectItem value="Inativa">Inativa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Plano</Label>
                    <Select 
                        value={normalizePlan(formState.plan)}
                        onValueChange={(value) => handleSelectChange('plan' as keyof Barbershop, value as 'Basico' | 'Premium')}
                        disabled={formState.status === 'Inativa'}
                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o plano" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Basico">Basico</SelectItem>
                                            <SelectItem value="Premium">Premium</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {formState.plan && formState.status === 'Ativa' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Valor do Plano (R$)</Label>
                                    <Input value={formatCurrency(planPrices[formState.plan as keyof typeof planPrices])} readOnly disabled />
                                </div>
                                <div className="space-y-2">
                                <Label>Data de Vencimento do Plano</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal bg-gradient-to-r from-slate-800/70 via-slate-900/70 to-slate-800/70 border-slate-700 hover:border-emerald-400/60 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.25)] transition-all duration-200"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formState.expiryDate ? formState.expiryDate : <span>Selecione uma data</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border border-emerald-500/30 bg-slate-900/95 backdrop-blur-md shadow-2xl rounded-xl">
                                        <CalendarComponent
                                            mode="single"
                                            showOutsideDays
                                            numberOfMonths={2}
                                            selected={formState.expiryDate ? parse(formState.expiryDate, 'dd/MM/yyyy', new Date()) : undefined}
                                            onSelect={handleDateChange}
                                            initialFocus
                                            className="rounded-xl border border-emerald-500/20 bg-slate-900/80"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleSave}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setDeleteConfirmationInput(''); setIsDeleteDialogOpen(isOpen);}}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Voc tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ao  <span className="font-bold text-destructive">irreversvel</span> e excluir permanentemente a barbearia <span className='font-bold'>{shopToDelete?.name}</span> do banco de dados, mas o usurio de autenticao permanecer.
                        </AlertDialogDescription>
                        <div className="space-y-2 pt-2">
                            <Label htmlFor="delete-confirm">Para confirmar, digite "<span className="font-bold">excluir</span>" abaixo:</Label>
                            <Input
                                id="delete-confirm"
                                value={deleteConfirmationInput}
                                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                            />
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDelete} 
                            disabled={deleteConfirmationInput !== 'excluir'}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Sim, Excluir do Banco de Dados
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}






