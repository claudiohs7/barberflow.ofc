'use client';

import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Loader2, Save } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { fetchJson } from '@/lib/fetcher';
import Image from 'next/image';

type SiteAppearance = {
  homeHeroDesktopPath: string | null;
  homeHeroMobilePath: string | null;
  updatedAt: string | null;
};

const HERO_API = '/api/site-appearance/home-hero';
const HERO_ASSET_DESKTOP = '/api/site-assets/home-hero?variant=desktop';
const HERO_ASSET_MOBILE = '/api/site-assets/home-hero?variant=mobile';

export default function SuperAdminAppearancePage() {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<SiteAppearance | null>(null);

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);

  const desktopPreview = useMemo(() => (desktopFile ? URL.createObjectURL(desktopFile) : null), [desktopFile]);
  const mobilePreview = useMemo(() => (mobileFile ? URL.createObjectURL(mobileFile) : null), [mobileFile]);

  useEffect(() => {
    return () => {
      if (desktopPreview) URL.revokeObjectURL(desktopPreview);
      if (mobilePreview) URL.revokeObjectURL(mobilePreview);
    };
  }, [desktopPreview, mobilePreview]);

  const load = async () => {
    const res = await fetchJson<{ data: SiteAppearance }>(HERO_API);
    setData(res.data);
  };

  useEffect(() => {
    setIsLoading(true);
    load()
      .catch((error: any) => {
        console.error('Erro ao carregar aparência:', error);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: error?.message || 'Não foi possível carregar as configurações.',
        });
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!desktopFile && !mobileFile) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione pelo menos uma imagem (desktop e/ou mobile).',
      });
      return;
    }

    setIsSaving(true);
    try {
      const form = new FormData();
      if (desktopFile) form.append('desktop', desktopFile);
      if (mobileFile) form.append('mobile', mobileFile);

      const res = await fetchJson<{ data: SiteAppearance }>(HERO_API, {
        method: 'POST',
        body: form,
      });

      setData(res.data);
      setDesktopFile(null);
      setMobileFile(null);

      toast({
        title: 'Salvo!',
        description: 'Imagens atualizadas com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao salvar aparência:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error?.message || 'Não foi possível salvar.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <ImageIcon className="h-7 w-7 text-primary" />
          Aparência
        </h2>
        <p className="text-muted-foreground">Personalize imagens e visual do site (Home).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imagem de fundo (Home)</CardTitle>
          <CardDescription>
            Envie uma imagem para desktop e outra para mobile. Formatos aceitos: PNG, JPG, WEBP (até 15MB).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>Dica</AlertTitle>
            <AlertDescription>
              Desktop: recomendado 1920×1080. Mobile: recomendado 1080×1920.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="desktopImage">Imagem (Desktop)</Label>
              <Input
                id="desktopImage"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => setDesktopFile(e.target.files?.[0] ?? null)}
              />
              <div className="rounded-lg border overflow-hidden bg-muted max-w-[560px]">
                <div className="aspect-[16/9] relative">
                  <Image
                    src={desktopPreview || `${HERO_ASSET_DESKTOP}${data?.updatedAt ? `&t=${encodeURIComponent(data.updatedAt)}` : ''}`}
                    alt="Preview desktop"
                    fill
                    sizes="(max-width: 768px) 100vw, 560px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {desktopFile ? `Selecionado: ${desktopFile.name}` : 'Preview atual do desktop'}
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="mobileImage">Imagem (Mobile)</Label>
              <Input
                id="mobileImage"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => setMobileFile(e.target.files?.[0] ?? null)}
              />
              <div className="rounded-lg border overflow-hidden bg-muted max-w-[260px] mx-auto lg:mx-0">
                <div className="aspect-[9/16] relative">
                  <Image
                    src={mobilePreview || `${HERO_ASSET_MOBILE}${data?.updatedAt ? `&t=${encodeURIComponent(data.updatedAt)}` : ''}`}
                    alt="Preview mobile"
                    fill
                    sizes="(max-width: 768px) 100vw, 260px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {mobileFile ? `Selecionado: ${mobileFile.name}` : 'Preview atual do mobile'}
              </p>
            </div>
          </div>

          <Separator />
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isLoading ? 'Carregando...' : data?.updatedAt ? `Última atualização: ${new Date(data.updatedAt).toLocaleString()}` : 'Sem alterações recentes.'}
            </div>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground">
          {data?.homeHeroDesktopPath || data?.homeHeroMobilePath ? (
            <div className="space-y-1">
              <div>Desktop: {data?.homeHeroDesktopPath || '(padrão)'}</div>
              <div>Mobile: {data?.homeHeroMobilePath || '(padrão)'}</div>
            </div>
          ) : (
            <div>Usando imagem padrão do sistema.</div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
