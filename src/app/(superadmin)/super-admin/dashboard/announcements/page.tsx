'use client';

'use client';

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchJson } from "@/lib/fetcher";

export default function AnnouncementsPage() {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSendAnnouncement = async () => {
        if (!message.trim()) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'A mensagem não pode estar vazia.',
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
                title: 'Aviso Enviado!',
                description: 'A mensagem foi enviada para todas as barbearias.',
            });
            setMessage('');
        } catch (error: any) {
            console.error("Erro ao enviar aviso:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Enviar',
                description: error.message || 'Não foi possível enviar o aviso.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

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
                    <CardDescription>Esta mensagem será exibida como uma notificação no painel de todas as barbearias.</CardDescription>
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
                        <p className="text-sm text-muted-foreground">
                            A mensagem será enviada para todos os usuários ativos.
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSendAnnouncement} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Bell className="mr-2 h-4 w-4" />
                        )}
                        {isSubmitting ? 'Enviando...' : 'Enviar Aviso Global'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
