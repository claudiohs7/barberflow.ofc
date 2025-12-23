'use client';

import { useState, useEffect, useCallback } from "react";
import { Bell, Loader2, Edit, Trash2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchJson } from "@/lib/fetcher";
import type { SystemMessage } from "@/lib/definitions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AnnouncementsPage() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [announcements, setAnnouncements] = useState<SystemMessage[]>([]);
  const [editing, setEditing] = useState<SystemMessage | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const loadAnnouncements = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const response = await fetchJson<{ data: SystemMessage[] }>("/api/announcements?limit=all");
      setAnnouncements(response.data ?? []);
    } catch (error: any) {
      console.error("Erro ao buscar avisos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar avisos",
        description: error?.message || "Nao foi possivel carregar os avisos enviados.",
      });
    } finally {
      setIsLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const handleSendAnnouncement = async () => {
    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A mensagem nao pode estar vazia.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchJson("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Aviso do Super Admin",
          content: message,
        }),
      });

      toast({
        title: "Aviso enviado!",
        description: "A mensagem foi enviada para todas as barbearias.",
      });
      setMessage("");
      await loadAnnouncements();
    } catch (error: any) {
      console.error("Erro ao enviar aviso:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: error?.message || "Nao foi possivel enviar o aviso.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (announcement: SystemMessage) => {
    setEditing(announcement);
    setEditValue(announcement.content);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editValue.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O aviso nao pode ficar vazio.",
      });
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetchJson<{ data: SystemMessage }>(`/api/announcements/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editValue.trim() }),
      });
      setAnnouncements((prev) => prev.map((item) => (item.id === editing.id ? response.data : item)));
      toast({ title: "Aviso atualizado!", description: "A mensagem foi alterada com sucesso." });
      setEditing(null);
      setEditValue("");
    } catch (error: any) {
      console.error("Erro ao editar aviso:", error);
      toast({
        variant: "destructive",
        title: "Erro ao editar",
        description: error?.message || "Nao foi possivel atualizar o aviso.",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await fetchJson(`/api/announcements/${deleteTargetId}`, { method: "DELETE" });
      setAnnouncements((prev) => prev.filter((item) => item.id !== deleteTargetId));
      toast({ title: "Aviso excluido", description: "O aviso foi removido." });
    } catch (error: any) {
      console.error("Erro ao excluir aviso:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error?.message || "Nao foi possivel excluir o aviso.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Avisos do Sistema</h2>
          <p className="text-muted-foreground">Envie mensagens e avisos para todas as barbearias.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Aviso</CardTitle>
          <CardDescription>
            Esta mensagem sera exibida como uma notificacao no painel de todas as barbearias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full gap-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem aqui..."
              className="min-h-32"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">A mensagem sera enviada para todos os usuarios ativos.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSendAnnouncement} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            {isSubmitting ? "Enviando..." : "Enviar Aviso Global"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avisos Enviados</CardTitle>
          <CardDescription>Visualize, edite ou exclua os avisos que ja foram enviados.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingList ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando avisos...</span>
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aviso enviado ainda.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex flex-col gap-3 rounded-md border border-border/60 bg-card/40 p-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(announcement.createdAt).toLocaleString("pt-BR")}
                    </p>
                    <p className="whitespace-pre-wrap">{announcement.content}</p>
                  </div>
                  <div className="flex gap-2 md:mt-1">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(announcement)} title="Editar aviso">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={deleteTargetId === announcement.id} onOpenChange={(open) => setDeleteTargetId(open ? announcement.id : null)}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" title="Excluir aviso">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir aviso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Essa acao removera o aviso para todas as barbearias. Deseja continuar?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? "Removendo..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (open ? null : setEditing(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar aviso</DialogTitle>
            <DialogDescription>Atualize o conteudo do aviso e salve para que apareca para todos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-message">Mensagem</Label>
            <Textarea
              id="edit-message"
              className="min-h-28"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={isSavingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSavingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

