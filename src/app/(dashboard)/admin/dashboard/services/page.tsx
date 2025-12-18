"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, Edit, PlusCircle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@/lib/definitions";
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { fetchJson } from "@/lib/fetcher";

export default function ServicesPage() {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { toast } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");

  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  
  const resetForm = () => {
    setNewServiceName("");
    setNewServiceDuration("");
    setNewServicePrice("");
    setServiceToEdit(null);
  };

  const loadServices = useCallback(async (shopId: string) => {
    setIsLoadingServices(true);
    try {
      const response = await fetchJson<{ data: Service[] }>(`/api/services?barbershopId=${encodeURIComponent(shopId)}`);
      setServices(response.data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar serviços",
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsLoadingServices(false);
    }
  }, [toast]);

  useEffect(() => {
    if (barbershopId) {
      loadServices(barbershopId);
    }
  }, [barbershopId, loadServices]);

  const handleAddService = async () => {
    if (newServiceName && newServiceDuration && newServicePrice && barbershopId) {
      const newService: Omit<Service, 'id'> = {
        name: capitalizeWords(newServiceName),
        duration: parseInt(newServiceDuration, 10),
        price: parseFloat(newServicePrice),
        barbershopId: barbershopId,
      };
      try {
      const response = await fetchJson<{ data: Service }>("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newService, barbershopId }),
      });
      setServices((prev) => [...prev, response.data]);
        toast({
          title: "Serviço Adicionado!",
          description: `${newService.name} foi adicionado ao seu menu.`,
        });
        setIsAddDialogOpen(false);
        resetForm();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || "Não foi possível criar o serviço.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
      });
    }
  };

  const handleEditClick = (service: Service) => {
    setServiceToEdit(service);
    setNewServiceName(service.name);
    setNewServiceDuration(service.duration.toString());
    setNewServicePrice(service.price.toString());
    setIsEditDialogOpen(true);
  };

  const handleUpdateService = async () => {
    if (serviceToEdit && newServiceName && newServiceDuration && newServicePrice && barbershopId) {
      const updatedService = {
        ...serviceToEdit,
        name: capitalizeWords(newServiceName),
        duration: parseInt(newServiceDuration, 10),
        price: parseFloat(newServicePrice),
      };
      try {
        const response = await fetchJson<{ data: Service }>(`/api/services/${serviceToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedService),
        });
        setServices((prev) => prev.map((s) => (s.id === serviceToEdit.id ? response.data : s)));
        toast({
          title: "Serviço Atualizado!",
          description: `As informações de ${updatedService.name} foram salvas.`,
        });
        setIsEditDialogOpen(false);
        resetForm();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || "Não foi possível atualizar o serviço.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
      });
    }
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteService = async () => {
    if (serviceToDelete && barbershopId) {
      try {
        await fetchJson<{ success: boolean }>(`/api/services/${serviceToDelete.id}`, { method: "DELETE" });
        setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
        toast({
          title: "Serviço Excluído",
          description: `${serviceToDelete.name} foi removido do seu menu.`,
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || "Não foi possível remover o serviço.",
        });
      }
    }
    setIsDeleteDialogOpen(false);
    setServiceToDelete(null);
  };
  
  const isLoading = isBarbershopIdLoading || isLoadingServices;

  if (isLoading) {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline">Serviços</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Carregando...</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Aguarde enquanto carregamos os dados.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Serviços</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) resetForm(); setIsAddDialogOpen(isOpen); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
              <PlusCircle className="h-4 w-4" />
              Adicionar Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Serviço</DialogTitle>
              <DialogDescription>
                Preencha os detalhes para adicionar um novo serviço à barbearia.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input id="name" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="ex: Corte Clássico" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">
                  Duração (min)
                </Label>
                <Input id="duration" type="number" value={newServiceDuration} onChange={(e) => setNewServiceDuration(e.target.value)} placeholder="30" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Preço (R$)
                </Label>
                <Input id="price" type="number" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} placeholder="50.00" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
               <DialogClose asChild>
                <Button variant="outline" className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleAddService} className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Salvar Serviço</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

        <Card>
            <CardHeader>
            <CardTitle>Menu Geral de Serviços</CardTitle>
            <CardDescription>
                Gerencie todos os serviços que sua barbearia oferece. Para vincular serviços a um profissional, acesse a página de Barbeiros.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">
                      Ações
                    </TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingServices ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Carregando serviços...</TableCell>
                    </TableRow>
                  ) : services && services.length > 0 ? (
                    services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>{service.duration} min</TableCell>
                        <TableCell className="text-right">
                            {formatCurrency(service.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(service)} className="text-blue-500 hover:text-blue-500/90 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-500/90 transition-transform duration-300 hover:scale-105 hover:shadow-lg" onClick={() => handleDeleteClick(service)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Excluir</span>
                            </Button>
                            </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum serviço cadastrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>

      {/* Edit Service Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) resetForm(); setIsEditDialogOpen(isOpen); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Serviço</DialogTitle>
              <DialogDescription>
                Altere as informações do serviço abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Nome
                </Label>
                <Input id="edit-name" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-duration" className="text-right">
                  Duração (min)
                </Label>
                <Input id="edit-duration" type="number" value={newServiceDuration} onChange={(e) => setNewServiceDuration(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  Preço (R$)
                </Label>
                <Input id="edit-price" type="number" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleUpdateService} className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o serviço <span className="font-bold">{serviceToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteService} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
