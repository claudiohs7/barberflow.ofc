
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
import { MapPin, Mail, Smartphone, Calendar, Edit, Search, ExternalLink, Trash2, AlertCircleIcon, PlusCircle, FilterX, KeyRound, RefreshCw } from 'lucide-react';
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
    plan: 'Básico' | 'Premium';
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
};

const planPrices = {
    'Básico': 49.90,
    'Premium': 119.90
};

export default function BarbershopsPage() {
    const { toast } = useToast();
    const { isLoading: isUserLoading } = useAuth();
    const [rawBarbershops, setRawBarbershops] = useState<any[]>([]);
    const [isLoadingBarbershops, setIsLoadingBarbershops] = useState(true);
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [isLoadingTickets, setIsLoadingTickets] = useState(true);

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
                description: error.message || "Não foi possível carregar as barbearias.",
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
            let status = shop.status || 'Inativa';

            if (expiryDate && !isBefore(expiryDate, startOfDay(new Date()))) {
                status = 'Ativa';
            } else if (expiryDate && isBefore(expiryDate, startOfDay(new Date()))) {
                status = 'Inativa';
            }

            return {
                id: shop.id,
                name: shop.name || 'Nome não definido',
                legalName: shop.legalName,
                cpfCnpj: shop.cpfCnpj,
                ownerId: shop.ownerId,
                email: shop.email || 'E-mail não informado',
                phone: shop.phone || '(00) 00000-0000',
                plan: shop.plan || 'Básico',
                status,
                expiryDate: expiryDate ? format(expiryDate, 'dd/MM/yyyy') : 'N/A',
                registeredDate: shop.createdAt ? format(new Date(shop.createdAt), 'dd/MM/yyyy') : 'N/A',
                operatingHours: shop.operatingHours || [],
                address: addressObj,
                fullAddressString,
            };
        });
    }, [rawBarbershops]);


    const [displayedBarbershops, setDisplayedBarbershops] = useState<SuperAdminBarbershop[]>([]);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [shopToDelete, setShopToDelete] = useState<SuperAdminBarbershop | null>(null);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
    const [isUpdatingAll, setIsUpdatingAll] = useState(false);

    const [editingShop, setEditingShop] = useState<SuperAdminBarbershop | null>(null);

    const [formState, setFormState] = useState<Partial<SuperAdminBarbershop & {password?: string}>>({});
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPlan, setFilterPlan] = useState('all');

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
                throw new Error(data.error || 'CEP não encontrado.');
            }
          } catch (error) {
            console.error("Failed to fetch address:", error);
            toast({ variant: "destructive", title: "Erro de CEP", description: "Não foi possível buscar o endereço." });
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

    const handleEditClick = (shop: Barbershop) => {
        setEditingShop(shop);
        setFormState({ ...shop });
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (shop: Barbershop) => {
        setShopToDelete(shop);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!shopToDelete) {
            toast({ variant: "destructive", title: "Erro", description: "Nenhuma barbearia selecionada para exclusão." });
            return;
        }

        try {
            await fetchJson(`/api/barbershops/${shopToDelete.id}`, { method: "DELETE" });
            setRawBarbershops(prev => prev!.filter(s => s.id !== shopToDelete.id));
            toast({ title: "Barbearia Excluída!", description: `${shopToDelete.name} foi removida do banco de dados.` });
        } catch (error: any) {
            console.error("Erro ao excluir barbearia:", error);
            toast({ variant: "destructive", title: "Erro ao Excluir", description: error.message || "Não foi possível remover a barbearia do banco de dados." });
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

            if (barbershopDocRef) {
                await updateDoc(barbershopDocRef, updateData as Record<string, any>);
            }

            toast({ title: "Dados da Barbearia Salvos!", description: "As informações no banco de dados foram atualizadas." });
            if (typeof window !== "undefined") {
                const barbershopUpdatePayload = { ...updatedShop, ownerId: updatedShop.ownerId };
                window.dispatchEvent(new CustomEvent("barbershop-updated", { detail: barbershopUpdatePayload }));
                try {
                    window.localStorage.setItem(
                        "barbershop-updated",
                        JSON.stringify({ ...barbershopUpdatePayload, timestamp: Date.now() })
                    );
                } catch (error) {
                    console.warn("Não foi possível sincronizar a atualização entre abas:", error);
                }
            }
        } catch (error: any) {
            console.error("Erro ao atualizar barbearia:", error);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: error.message || "Não foi possível atualizar os dados da barbearia.",
            });
        } finally {
            setIsEditDialogOpen(false);
            setEditingShop(null);
        }
    };
    
    const handleCreate = async () => {
        if (!formState.email || !formState.password || !formState.name) {
            toast({ variant: "destructive", title: "Erro", description: "Email, senha e nome da barbearia são obrigatórios." });
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
                    plan: formState.plan || "Básico",
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
                ? "Este e-mail já está em uso por outro proprietário."
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
    
    // const handleUpdateAllBarbershops = async () => {
    //     // This function is no longer needed with the removal of API keys from the barbershop doc.
    //     toast({ title: "Ação Descontinuada", description: "Esta função não é mais necessária." });
    // };

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
                         <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setFormState({}); setIsAddDialogOpen(isOpen); }}>
                            <DialogTrigger asChild>
                                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Nova Barbearia</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Cadastrar Nova Barbearia</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                                    <div className="grid gap-4">
                                         <div className="space-y-2">
                                            <Label htmlFor="add-email">Email do Proprietário</Label>
                                            <Input id="add-email" name="email" type="email" value={formState.email || ''} onChange={(e) => setFormState(prev => ({...prev, email: e.target.value}))} />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="add-password">Senha Provisória</Label>
                                            <Input id="add-password" name="password" type="password" value={formState.password || ''} onChange={(e) => setFormState(prev => ({...prev, password: e.target.value}))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="add-name">Nome da Barbearia</Label>
                                            <Input id="add-name" name="name" value={formState.name || ''} onChange={handleFormChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="add-cpfCnpj">CPF/CNPJ</Label>
                                            <Input id="add-cpfCnpj" name="cpfCnpj" value={formState.cpfCnpj || ''} onChange={handleCpfCnpjChange} />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="add-legalName">Nome/Empresa (Razão Social)</Label>
                                            <Input id="add-legalName" name="legalName" value={formState.legalName || ''} onChange={handleFormChange} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2 col-span-1">
                                                <Label htmlFor="add-cep">CEP</Label>
                                                <Input id="add-cep" name="cep" value={formState.address?.cep || ''} onChange={handleAddressChange} maxLength={9} />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <Label htmlFor="add-street">Rua</Label>
                                                <Input id="add-street" name="street" value={formState.address?.street || ''} onChange={handleAddressChange} />
                                            </div>
                                        </div>
                                         <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="add-number">Número</Label>
                                                <Input id="add-number" name="number" value={formState.address?.number || ''} onChange={handleAddressChange} />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <Label htmlFor="add-neighborhood">Bairro</Label>
                                                <Input id="add-neighborhood" name="neighborhood" value={formState.address?.neighborhood || ''} onChange={handleAddressChange} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="add-city">Cidade</Label>
                                                <Input id="add-city" name="city" value={formState.address?.city || ''} onChange={handleAddressChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="add-state">Estado (UF)</Label>
                                                <Input id="add-state" name="state" value={formState.address?.state || ''} onChange={handleAddressChange} />
                                            </div>
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="add-phone">WhatsApp do Proprietário</Label>
                                            <Input id="add-phone" name="phone" value={formState.phone || ''} onChange={handlePhoneChange} maxLength={15} />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancelar</Button>
                                    </DialogClose>
                                    <Button onClick={handleCreate} disabled={isSubmitting}>
                                        {isSubmitting ? 'Cadastrando...' : 'Salvar Barbearia'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
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
                                <SelectItem value="Básico">Básico</SelectItem>
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
                        <div key={shop.id} className="border border-primary/50 rounded-lg p-4 space-y-4">
                             <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <span className="font-mono text-sm text-muted-foreground pt-1">{shop.ownerId?.substring(0, 6)}...</span>
                                    <div>
                                      <h3 className="font-bold text-lg">{shop.name}</h3>
                                      <p className="text-sm text-muted-foreground">{shop.legalName} - {shop.cpfCnpj}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground"/>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">Endereço</p>
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-muted-foreground">{shop.fullAddressString}</p>
                                                <Button variant="link" size="sm" asChild className="p-0 h-auto">
                                                    <Link href={getGoogleMapsLink(shop.address)} target="_blank" rel="noopener noreferrer">
                                                        Ver
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Mail className="h-4 w-4 mt-1 text-muted-foreground"/>
                                        <div>
                                            <p className="text-sm font-medium">Email do Proprietário</p>
                                            <p className="text-sm text-muted-foreground">{shop.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Smartphone className="h-4 w-4 mt-1 text-muted-foreground"/>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">WhatsApp do Proprietário</p>
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm text-muted-foreground">{shop.phone}</p>
                                                <Button variant="link" size="sm" asChild className="p-0 h-auto text-green-500 hover:text-green-500/90">
                                                    <Link href={getWhatsAppLink(shop.phone)} target="_blank" rel="noopener noreferrer">
                                                        WhatsApp
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                     <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground"/>
                                        <div>
                                            <p className="text-sm font-medium">Plano</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-muted-foreground font-semibold">
                                                  {shop.plan}
                                                </p>
                                                <Badge variant={shop.status === 'Ativa' ? 'default' : 'destructive'} className={shop.status === 'Ativa' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}>{shop.status}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground"/>
                                        <div>
                                            <p className="text-sm font-medium">Data de Vencimento</p>
                                            <p className="text-sm text-muted-foreground">{shop.expiryDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground"/>
                                        <div>
                                            <p className="text-sm font-medium">Cadastrado em</p>
                                            <p className="text-sm text-muted-foreground">{shop.registeredDate}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <CardFooter className="p-0 pt-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => handleEditClick(shop)}><Edit className="mr-2 h-4 w-4"/> Editar</Button>
                                <Button variant="destructive" onClick={() => handleDeleteClick(shop)}><Trash2 className="mr-2 h-4 w-4"/> Excluir</Button>
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
                            Atualize os dados da barbearia {editingShop?.name} (Código: {editingShop?.ownerId})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Barbearia</Label>
                                <Input id="name" name="name" value={formState.name || ''} onChange={handleFormChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="legalName">Nome/Empresa (Razão Social)</Label>
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
                                    <Label htmlFor="number">Número</Label>
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
                                    <Label htmlFor="email">Email do Proprietário</Label>
                                    <Input id="email" name="email" type="email" value={formState.email || ''} onChange={handleFormChange} disabled />
                                    <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
                                        <AlertCircleIcon className="h-4 w-4 mt-0.5 shrink-0" />
                                        <div className='text-xs'>
                                            <p>A alteração do e-mail de login deve ser feita diretamente no Firebase Console para garantir a segurança.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">WhatsApp do Proprietário</Label>
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
                                        value={formState.plan} 
                                        onValueChange={(value) => handleSelectChange('plan' as keyof Barbershop, value as 'Básico' | 'Premium')}
                                        disabled={formState.status === 'Inativa'}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o plano" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Básico">Básico</SelectItem>
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
                                            variant={"outline"}
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formState.expiryDate ? formState.expiryDate : <span>Selecione uma data</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={formState.expiryDate ? parse(formState.expiryDate, 'dd/MM/yyyy', new Date()) : undefined}
                                            onSelect={handleDateChange}
                                            initialFocus
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
                        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação é <span className="font-bold text-destructive">irreversível</span> e excluirá permanentemente a barbearia <span className='font-bold'>{shopToDelete?.name}</span> do banco de dados, mas o usuário de autenticação permanecerá.
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
