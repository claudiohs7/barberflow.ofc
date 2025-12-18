"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LifeBuoy, Send, Loader2, MessageSquare, Trash2, X, RefreshCw } from "lucide-react";
import type { SupportTicket, SupportTicketResponse } from "@/lib/definitions";
import { useAuth } from "@/context/AuthContext";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/fetcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

const ticketSubjects = ["Dúvida Geral", "Problema Técnico", "Financeiro/Assinatura", "Sugestão"];

const statusLabels: Record<SupportTicket["status"], string> = {
  open: "Aberto",
  in_progress: "Em progresso",
  closed: "Fechado",
};

export default function SupportPage() {
  const { user } = useAuth();
  const { barbershopId } = useBarbershopId();
  const { toast } = useToast();

  const isSuperAdmin = user?.email === "claudiohs@hotmail.com";

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responses, setResponses] = useState<SupportTicketResponse[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      const query = barbershopId ? `?barbershopId=${encodeURIComponent(barbershopId)}` : "";
      const response = await fetchJson<{ data: SupportTicket[] }>(`/api/tickets${query}`);
      setTickets(response.data || []);
    } catch (error: any) {
      console.error("Erro ao carregar tickets:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar tickets." });
    } finally {
      setIsLoadingTickets(false);
    }
  }, [barbershopId, toast]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadResponses = async (ticketId: string) => {
    try {
      const response = await fetchJson<{ data: SupportTicketResponse[] }>(`/api/tickets/${ticketId}/responses`);
      setResponses(response.data || []);
    } catch (error: any) {
      console.error("Erro ao carregar respostas:", error);
    }
  };

  const handleSubmit = async () => {
    if (!subject || !title || !description) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos obrigatórios." });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetchJson<{ data: SupportTicket }>("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbershopId,
          title,
          description,
          category: subject as SupportTicket["category"],
          createdBy: user?.id || "anonymous",
          clientEmail: user?.email || "Não informado",
          clientName: user?.name || "Não informado",
          status: "open",
          priority: "medium",
        }),
      });
      setTickets((prev) => [response.data, ...prev]);
      setSubject("");
      setTitle("");
      setDescription("");
      toast({ title: "Ticket enviado!", description: "Sua solicitação foi registrada." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao enviar", description: error.message || "Tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChat = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsChatOpen(true);
    await loadResponses(ticket.id);
  };

  const handleSendResponse = async () => {
    if (!responseMessage.trim() || !selectedTicket) return;
    try {
      const response = await fetchJson<{ data: SupportTicketResponse }>(`/api/tickets/${selectedTicket.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: responseMessage, createdBy: user?.id || "anonymous", isAdmin: isSuperAdmin }),
      });
      setResponses((prev) => [...prev, response.data]);
      setResponseMessage("");
      if (selectedTicket.status === "open" && isSuperAdmin) {
        await handleStatusChange(selectedTicket.id, "in_progress");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível enviar a resposta." });
    }
  };

  const handleStatusChange = async (ticketId: string, status: SupportTicket["status"]) => {
    try {
      const response = await fetchJson<{ data: SupportTicket }>(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? response.data : t)));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(response.data);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível atualizar o status." });
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    try {
      await fetchJson<{ success: boolean }>(`/api/tickets/${selectedTicket.id}`, { method: "DELETE" });
      setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id));
      setIsChatOpen(false);
      toast({ title: "Ticket excluído", description: "O ticket foi removido." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível excluir o ticket." });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const isFormValid = useMemo(() => subject && title && description, [subject, title, description]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" /> Abrir Ticket
            </CardTitle>
            <CardDescription>Envie uma solicitação para nossa equipe de suporte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um assunto" />
                </SelectTrigger>
                <SelectContent>
                  {ticketSubjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resumo do problema" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhe sua solicitação" rows={4} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Tickets
              </CardTitle>
              <CardDescription>Visualize e responda às solicitações.</CardDescription>
            </div>
            <Button variant="ghost" onClick={loadTickets} disabled={isLoadingTickets}>
              <RefreshCw className={cn("h-4 w-4", isLoadingTickets && "animate-spin")} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
            {isLoadingTickets ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando tickets...
              </div>
            ) : tickets.length === 0 ? (
              <p className="text-muted-foreground">Nenhum ticket encontrado.</p>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-3 border rounded-md hover:border-primary transition cursor-pointer"
                  onClick={() => handleOpenChat(ticket)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{ticket.category}</p>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-muted">
                      {statusLabels[ticket.status]}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{ticket.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> {selectedTicket?.title}
            </DialogTitle>
            <DialogDescription>{selectedTicket?.description}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Status:</span>
              <Select
                value={selectedTicket?.status}
                onValueChange={(value) => selectedTicket && handleStatusChange(selectedTicket.id, value as SupportTicket["status"])}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em progresso</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="h-64 rounded-md border p-3" id="chat-scroll">
              {selectedTicket && (
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{selectedTicket.clientName?.charAt(0) || "C"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedTicket.clientName}</p>
                      <p className="text-xs text-muted-foreground">{selectedTicket.clientEmail}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{selectedTicket.description}</p>
                </div>
              )}
              {responses.map((res) => (
                <div key={res.id} className={cn("mb-3 flex flex-col", res.isAdmin ? "items-end" : "items-start")}>
                  <div className="max-w-[80%] rounded-md border bg-muted p-2 text-sm">
                    <p>{res.message}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <div className="space-y-2">
              <Label>Responder</Label>
              <Textarea value={responseMessage} onChange={(e) => setResponseMessage(e.target.value)} placeholder="Escreva uma resposta..." rows={3} />
              <div className="flex justify-between">
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir ticket
                </Button>
                <Button onClick={handleSendResponse} disabled={!responseMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" /> Enviar resposta
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ticket?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação removerá o ticket e o histórico de respostas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTicket} className="bg-destructive text-white">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
