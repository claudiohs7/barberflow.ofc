"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Trash2, Send, Lock, MessageSquare, RefreshCw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { fetchJson } from "@/lib/fetcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { SupportTicket, SupportTicketResponse, Barbershop } from "@/lib/definitions";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortOrder = "desc" | "asc";

type RawSupportTicket = Omit<SupportTicket, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type RawSupportTicketResponse = Omit<SupportTicketResponse, "createdAt"> & {
  createdAt: string;
};

const normalizeTicket = (ticket: RawSupportTicket): SupportTicket => ({
  ...ticket,
  createdAt: new Date(ticket.createdAt),
  updatedAt: new Date(ticket.updatedAt),
});

const normalizeResponse = (response: RawSupportTicketResponse): SupportTicketResponse => ({
  ...response,
  createdAt: new Date(response.createdAt),
});

export default function TicketsPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [ticketResponses, setTicketResponses] = useState<SupportTicketResponse[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isLoadingBarbershops, setIsLoadingBarbershops] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [ticketResponse, setTicketResponse] = useState("");
  const [ticketToDelete, setTicketToDelete] = useState<SupportTicket | null>(null);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [isTicketDeleteDialogOpen, setIsTicketDeleteDialogOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      const response = await fetchJson<{ data: RawSupportTicket[] }>("/api/tickets");
      const normalized = response.data.map(normalizeTicket);
      setSupportTickets(normalized);
      return normalized;
    } catch (error) {
      console.error("Erro ao carregar tickets:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os tickets." });
      return [];
    } finally {
      setIsLoadingTickets(false);
    }
  }, [toast]);

  const loadBarbershops = useCallback(async () => {
    setIsLoadingBarbershops(true);
    try {
      const response = await fetchJson<{ data: Barbershop[] }>("/api/barbershops");
      setBarbershops(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar barbearias:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as barbearias." });
    } finally {
      setIsLoadingBarbershops(false);
    }
  }, [toast]);

  const loadTicketResponses = useCallback(
    async (ticketId: string) => {
      try {
        const response = await fetchJson<{ data: RawSupportTicketResponse[] }>(`/api/tickets/${ticketId}/responses`);
        const normalized = response.data.map(normalizeResponse);
        setTicketResponses(normalized);
      } catch (error) {
        console.error("Erro ao carregar respostas:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar o histórico do ticket." });
        setTicketResponses([]);
      }
    },
    [toast]
  );

  useEffect(() => {
    void loadTickets();
    void loadBarbershops();
  }, [loadTickets, loadBarbershops]);

  useEffect(() => {
    if (editingTicket) {
      void loadTicketResponses(editingTicket.id);
    } else {
      setTicketResponses([]);
    }
  }, [editingTicket, loadTicketResponses]);

  useEffect(() => {
    if (isTicketDialogOpen && scrollAreaRef.current) {
      const timer = setTimeout(() => {
        scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ticketResponses, isTicketDialogOpen]);

  const barbershopMap = useMemo(() => new Map(barbershops.map((shop) => [shop.id, shop.name])), [barbershops]);

  const filteredTickets = useMemo(() => {
    const normalizedSearchTerm = searchTerm.toLowerCase();
    return supportTickets.filter((ticket) => {
      if (!searchTerm) return true;
      const barbershopName = ticket.barbershopId ? barbershopMap.get(ticket.barbershopId) ?? "" : "";
      return (
        ticket.title?.toLowerCase().includes(normalizedSearchTerm) ||
        ticket.clientName?.toLowerCase().includes(normalizedSearchTerm) ||
        ticket.clientEmail?.toLowerCase().includes(normalizedSearchTerm) ||
        ticket.barbershopId?.toLowerCase().includes(normalizedSearchTerm) ||
        barbershopName.toLowerCase().includes(normalizedSearchTerm)
      );
    });
  }, [searchTerm, supportTickets, barbershopMap]);

  const sortedTickets = useMemo(() => {
    const copy = [...filteredTickets];
    return copy.sort((a, b) =>
      sortOrder === "desc"
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime()
    );
  }, [filteredTickets, sortOrder]);

  const { openTickets, closedTickets } = useMemo(() => {
    const open: SupportTicket[] = [];
    const closed: SupportTicket[] = [];
    for (const ticket of sortedTickets) {
      if (ticket.status === "closed") {
        closed.push(ticket);
      } else {
        open.push(ticket);
      }
    }
    return { openTickets: open, closedTickets: closed };
  }, [sortedTickets]);

  const initialMessage = useMemo(() => {
    if (!editingTicket) return null;
    return {
      id: "initial",
      message: editingTicket.description,
      createdAt: editingTicket.createdAt,
      createdBy: editingTicket.createdBy,
      isAdmin: false,
    };
  }, [editingTicket]);

  const combinedMessages = useMemo(() => {
    if (!initialMessage) return [];
    return [initialMessage, ...ticketResponses];
  }, [initialMessage, ticketResponses]);

  const refreshTickets = useCallback(
    async (currentTicketId?: string) => {
      const updatedTickets = await loadTickets();
      if (currentTicketId) {
        setEditingTicket(updatedTickets.find((ticket) => ticket.id === currentTicketId) ?? null);
      }
      return updatedTickets;
    },
    [loadTickets]
  );

  const handleOpenTicketDialog = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    setIsTicketDialogOpen(true);
  };

  const handleOpenTicketDeleteDialog = (ticket: SupportTicket) => {
    setTicketToDelete(ticket);
    setIsTicketDeleteDialogOpen(true);
  };

  const confirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      await fetchJson(`/api/tickets/${ticketToDelete.id}`, { method: "DELETE" });
      await refreshTickets();
      toast({ title: "Ticket Excluído!", description: "O ticket foi removido com sucesso." });
    } catch (error) {
      console.error("Erro ao excluir ticket:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o ticket." });
    } finally {
      setIsTicketDeleteDialogOpen(false);
    }
  };

  const handleTicketResponse = async () => {
    if (!editingTicket || !user?.id) return;
    if (!ticketResponse.trim()) {
      toast({ variant: "destructive", title: "Erro", description: "A resposta não pode ficar em branco." });
      return;
    }
    try {
      await fetchJson(`/api/tickets/${editingTicket.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: ticketResponse,
          createdBy: user.id,
          isAdmin: true,
        }),
      });

      if (editingTicket.status === "open") {
        await fetchJson(`/api/tickets/${editingTicket.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in_progress" }),
        });
      }

      await refreshTickets(editingTicket.id);
      await loadTicketResponses(editingTicket.id);
      setTicketResponse("");
      toast({ title: "Ticket Atualizado!", description: "Sua resposta foi salva." });
    } catch (error) {
      console.error("Erro ao atualizar ticket:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o ticket." });
    }
  };

  const handleCloseTicket = async (ticket: SupportTicket) => {
    try {
      await fetchJson(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      await refreshTickets(ticket.id);
      toast({ title: "Ticket Fechado!", description: "O ticket foi marcado como resolvido." });
    } catch (error) {
      console.error("Erro ao fechar ticket:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível fechar o ticket." });
    }
  };

  const handleReopenTicket = async (ticket: SupportTicket) => {
    try {
      await fetchJson(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      await refreshTickets(ticket.id);
      toast({ title: "Ticket Reaberto!", description: "O ticket está em andamento." });
    } catch (error) {
      console.error("Erro ao reabrir ticket:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível reabrir o ticket." });
    }
  };

  const getWhatsAppLink = (phone?: string) => {
    if (!phone) return "#";
    const cleanedPhone = phone.replace(/\D/g, "");
    return `https://wa.me/55${cleanedPhone}`;
  };

  const renderTicketCard = (ticket: SupportTicket) => {
    const barbershop = barbershops.find((shop) => shop.id === ticket.barbershopId);
    const barbershopName = barbershop?.name || "N/D";
    const barbershopPhone = barbershop?.phone;
    return (
      <div key={ticket.id} className="border rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="font-semibold">{ticket.title}</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{barbershopName}</span> - {ticket.category}
            </p>
          </div>
          <Badge
            variant={ticket.status === "open" ? "default" : "outline"}
            className={cn({
              "bg-green-500/20 text-green-700 border-green-500/30 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20":
                ticket.status === "closed",
              "bg-amber-500/20 text-amber-700 border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20":
                ticket.status === "in_progress",
            })}
          >
            {ticket.status === "open" ? "Aberto" : ticket.status === "closed" ? "Fechado" : "Em Andamento"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground pt-1 whitespace-pre-wrap">{ticket.description}</p>
        <div className="flex justify-between items-center border-t pt-2 gap-4">
          <p className="text-xs text-muted-foreground">{ticket.createdAt.toLocaleDateString("pt-BR")}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8" onClick={() => handleOpenTicketDialog(ticket)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Abrir e Responder
            </Button>
            <Button size="sm" variant="outline" className="h-8 bg-green-500 hover:bg-green-600 border-green-500 text-white" asChild>
              <Link href={getWhatsAppLink(barbershopPhone || "")} target="_blank">
                <WhatsAppIcon className="h-4 w-4" />
              </Link>
            </Button>
            {ticket.status !== "closed" && (
              <Button size="sm" variant="destructive" className="h-8" onClick={() => handleCloseTicket(ticket)}>
                Fechar Ticket
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleOpenTicketDeleteDialog(ticket)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const isLoading = isAuthLoading || isLoadingTickets || isLoadingBarbershops;

  if (isLoading) {
    return <div className="p-8">Carregando tickets...</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Tickets em Aberto</CardTitle>
          <CardDescription>Gerencie as solicitações de suporte que precisam de atenção.</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, nome, email, ID da barbearia..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mais Recentes</SelectItem>
                <SelectItem value="asc">Mais Antigos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {openTickets.length > 0 ? (
            openTickets.map(renderTicketCard)
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm ? `Nenhum ticket aberto encontrado para "${searchTerm}".` : "Nenhum ticket de suporte aberto."}
            </div>
          )}
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>
            <h3 className="text-lg font-semibold">Histórico de Tickets ({closedTickets.length})</h3>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Tickets Fechados</CardTitle>
                <CardDescription>Consulte o histórico de solicitações já resolvidas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {closedTickets.length > 0 ? (
                  closedTickets.map(renderTicketCard)
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    {searchTerm ? `Nenhum ticket fechado encontrado para "${searchTerm}".` : "Nenhum ticket fechado ainda."}
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} className="overflow-visible">
        <DialogContent className="sm:max-w-xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingTicket?.title}</DialogTitle>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="font-medium text-sm">{barbershops.find((shop) => shop.id === editingTicket?.barbershopId)?.name}</p>
                <p className="text-xs text-muted-foreground">{editingTicket?.clientEmail}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={getWhatsAppLink(barbershops.find((shop) => shop.id === editingTicket?.barbershopId)?.phone || "")} target="_blank">
                  <WhatsAppIcon className="mr-2 h-4 w-4" />
                  Contato
                </Link>
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6" ref={scrollAreaRef}>
            <div className="py-4 space-y-4">
              {combinedMessages.map((res, index) => (
                <div key={`${res.id}-${index}`} className={cn("flex items-end gap-2", res.isAdmin ? "justify-start" : "justify-end")}>
                  {res.isAdmin && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>S</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("max-w-xs rounded-lg p-3 text-sm", res.isAdmin ? "bg-slate-700" : "bg-primary text-primary-foreground")}>
                    <p className="whitespace-pre-wrap">{res.message}</p>
                    <p className="text-xs mt-2 text-right opacity-70">
                      {res.createdAt instanceof Date
                        ? res.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : new Date(res.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-auto border-t pt-4 flex-col gap-4">
            {editingTicket?.status === "closed" ? (
              <div className="flex w-full items-center justify-center gap-2 p-3 rounded-md bg-muted text-muted-foreground text-sm">
                <Lock className="h-4 w-4" />
                <span>Este ticket está fechado.</span>
                <Button size="sm" onClick={() => handleReopenTicket(editingTicket)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reabrir Ticket
                </Button>
              </div>
            ) : (
              <>
                <Textarea
                  placeholder="Digite sua resposta aqui..."
                  value={ticketResponse}
                  onChange={(e) => setTicketResponse(e.target.value)}
                  className="min-h-0 resize-none"
                  rows={2}
                />
                <div className="flex justify-end items-center w-full">
                  <div className="flex gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleTicketResponse}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar e Atualizar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isTicketDeleteDialogOpen} onOpenChange={setIsTicketDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir o ticket "{ticketToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTicket} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
