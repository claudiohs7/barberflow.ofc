'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Youtube } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { fetchJson } from '@/lib/fetcher';

type TutorialVideo = {
  id: string;
  title: string;
  description: string | null;
  youtubeUrl: string;
  youtubeId: string | null;
  targetEmail: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function SuperAdminTutorialsPage() {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tutorials, setTutorials] = useState<TutorialVideo[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [enabled, setEnabled] = useState(true);

  const hasForm = useMemo(() => {
    return Boolean(title.trim() || description.trim() || youtubeUrl.trim() || targetEmail.trim());
  }, [title, description, youtubeUrl, targetEmail]);

  const loadTutorials = async () => {
    try {
      const res = await fetchJson<{ data: TutorialVideo[] }>('/api/tutorials');
      setTutorials(res.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tutoriais:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error?.message || 'Não foi possível carregar os tutoriais.',
      });
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadTutorials().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setYoutubeUrl('');
    setTargetEmail('');
    setEnabled(true);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O título é obrigatório.' });
      return;
    }
    if (!youtubeUrl.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O link do YouTube é obrigatório.' });
      return;
    }

    setIsSaving(true);
    try {
      await fetchJson('/api/tutorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          youtubeUrl: youtubeUrl.trim(),
          targetEmail: targetEmail.trim() ? targetEmail.trim() : null,
          enabled,
        }),
      });

      toast({
        title: 'Tutorial criado!',
        description: 'O tutorial foi salvo e já pode aparecer no painel da barbearia.',
      });
      resetForm();
      await loadTutorials();
    } catch (error: any) {
      console.error('Erro ao criar tutorial:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error?.message || 'Não foi possível criar o tutorial.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (id: string, nextEnabled: boolean) => {
    setTutorials((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: nextEnabled } : t)));
    try {
      await fetchJson(`/api/tutorials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
    } catch (error: any) {
      console.error('Erro ao atualizar tutorial:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error?.message || 'Não foi possível atualizar o tutorial.',
      });
      await loadTutorials();
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      await fetchJson(`/api/tutorials/${id}`, { method: 'DELETE' });
      setTutorials((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Tutorial removido', description: 'O tutorial foi excluído com sucesso.' });
    } catch (error: any) {
      console.error('Erro ao excluir tutorial:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error?.message || 'Não foi possível excluir o tutorial.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Youtube className="h-7 w-7 text-primary" />
          Tutoriais
        </h2>
        <p className="text-muted-foreground">
          Cadastre links do YouTube. Se informar o e-mail de login da barbearia, o vídeo aparece somente para ela.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo tutorial</CardTitle>
          <CardDescription>Crie um novo vídeo de tutorial para a plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Dominando a Agenda" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="youtubeUrl">Link do YouTube</Label>
            <Input
              id="youtubeUrl"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="targetEmail">Login (e-mail) da barbearia (opcional)</Label>
            <Input
              id="targetEmail"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="Ex: barbearia@email.com"
              inputMode="email"
              autoComplete="email"
            />
            <p className="text-sm text-muted-foreground">Se deixar vazio, o tutorial será global (todas as barbearias).</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Escreva uma breve descrição para o vídeo..."
              className="min-h-24"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Ativo</div>
              <div className="text-sm text-muted-foreground">Se desativado, não aparece para a barbearia.</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={resetForm}
            disabled={!hasForm || isSaving}
          >
            Limpar
          </Button>
          <Button onClick={handleCreate} disabled={isSaving || isLoading}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Salvar tutorial
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Tutoriais cadastrados</h3>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {!isLoading && tutorials.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Nenhum tutorial cadastrado ainda.</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tutorials.map((t) => (
            <Card key={t.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    {t.description ? <CardDescription>{t.description}</CardDescription> : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(t.id)}
                    disabled={isSaving}
                    title="Excluir tutorial"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{t.targetEmail ? `Login: ${t.targetEmail}` : 'Global'}</Badge>
                  <Badge variant={t.enabled ? 'default' : 'outline'}>{t.enabled ? 'Ativo' : 'Inativo'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
                  {t.youtubeId ? (
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${t.youtubeId}`}
                      title={t.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                      Link inválido ou ID não encontrado.
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="text-sm">Ativo</div>
                  <Switch checked={t.enabled} onCheckedChange={(val) => handleToggleEnabled(t.id, val)} />
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground break-all">
                {t.youtubeUrl}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

