"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Combine, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type AdminWhatsappSettings = {
  templateContent: string | null;
  intervalSeconds: number;
  intervalSecondsB?: number | null;
  bitsafiraInstanceId: string | null;
  attachmentBase64?: string | null;
  attachmentName?: string | null;
};

type BarbershopTarget = {
  id: string;
  name: string;
  phone: string | null;
};

type QueueItem = {
  id: string;
  name: string;
  phone: string;
  status: "pending" | "sent" | "error";
  error?: string;
};

export default function DisparosPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<AdminWhatsappSettings | null>(null);
  const [template, setTemplate] = useState("");
  const [intervalSecondsA, setIntervalSecondsA] = useState(10);
  const [intervalSecondsB, setIntervalSecondsB] = useState(15);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [barbershops, setBarbershops] = useState<BarbershopTarget[]>([]);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [pendingQueue, setPendingQueue] = useState<QueueItem[]>([]);
  const [sentQueue, setSentQueue] = useState<QueueItem[]>([]);

  const imageStorageKey = "admin-whatsapp-disparo-image";
  const templateRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/super-admin/admin-whatsapp/settings");
        const json = await res.json();
        if (json.success) {
          const data = json.data as AdminWhatsappSettings;
          setSettings(data);
          setTemplate(data.templateContent || "");
          const intervalA = Number(data.intervalSeconds) || 10;
          const intervalB = Number(data.intervalSecondsB ?? data.intervalSeconds ?? 15);
          setIntervalSecondsA(intervalA);
          setIntervalSecondsB(intervalB);

          if (data.attachmentBase64) {
            setImageFile({ name: data.attachmentName || "anexo.png", dataUrl: data.attachmentBase64 });
          }
        }
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar",
          description: err?.message || "Não foi possível carregar as configurações do WhatsApp admin.",
        });
      }
    };
    void load();
  }, [toast]);

  useEffect(() => {
    const loadBarbershops = async () => {
      try {
        const res = await fetch("/api/barbershops");
        const json = await res.json();
        if (json.data) {
          setBarbershops(
            json.data.map((shop: any) => ({
              id: shop.id,
              name: shop.name || "Sem nome",
              phone: shop.phone || null,
            })),
          );
        }
      } catch (err) {
        console.warn("Falha ao carregar barbearias para exclusão", err);
      }
    };
    void loadBarbershops();
  }, []);

  // Persistir anexo localmente também, para sobreviver a reloads enquanto não está salvo.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(imageStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name && parsed.dataUrl) {
          setImageFile(parsed);
        }
      }
    } catch (err) {
      console.warn("Falha ao carregar anexo salvo localmente", err);
    }
  }, []);

  useEffect(() => {
    try {
      if (imageFile) {
        localStorage.setItem(imageStorageKey, JSON.stringify(imageFile));
      } else {
        localStorage.removeItem(imageStorageKey);
      }
    } catch (err) {
      console.warn("Falha ao salvar anexo localmente", err);
    }
  }, [imageFile]);

  const pendingTargets = useMemo(() => {
    const excludeSet = new Set(excludeIds);
    return barbershops
      .map((shop) => ({
        id: shop.id,
        name: shop.name,
        phone: (shop.phone || "").replace(/\D/g, ""),
      }))
      .filter((t) => t.phone.length >= 10)
      .filter((t) => !excludeSet.has(t.id));
  }, [barbershops, excludeIds]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const body = {
        templateContent: template,
        intervalSeconds: Number(intervalSecondsA) || 10,
        intervalSecondsB: Number(intervalSecondsB) || Number(intervalSecondsA) || 10,
        attachmentBase64: imageFile?.dataUrl ?? null,
        attachmentName: imageFile?.name ?? null,
      };

      const res = await fetch("/api/super-admin/admin-whatsapp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Falha ao salvar configurações.");
      }
      setSettings(json.data);
      toast({
        title: "Configurações salvas",
        description: "Template, intervalos e anexo atualizados.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!template.trim()) {
      toast({
        variant: "destructive",
        title: "Mensagem obrigatória",
        description: "Preencha o template antes de disparar.",
      });
      return;
    }

    const buildQueue = pendingTargets.map<QueueItem>((t) => ({
      ...t,
      status: "pending",
    }));
    setPendingQueue(buildQueue);
    setIsSending(true);

    try {
      const res = await fetch("/api/super-admin/admin-whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: template,
          intervalSecondsA: Number(intervalSecondsA) || undefined,
          intervalSecondsB: Number(intervalSecondsB) || undefined,
          excludeIds,
          imageBase64: imageFile?.dataUrl,
          imageFilename: imageFile?.name,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Falha ao disparar mensagens.");
      }

      const results = Array.isArray(json.data) ? json.data : [];
      const sentItems: QueueItem[] = results.map((result: any) => {
        const found = barbershops.find((b) => b.id === result.barbershopId);
        return {
          id: result.barbershopId || found?.id || result.phone || crypto.randomUUID(),
          name: found?.name || "Barbearia",
          phone: result.phone || found?.phone || "",
          status: result.status === "error" ? "error" : "sent",
          error: result.error,
        };
      });

      setSentQueue((prev) => [...prev, ...sentItems]);
      setPendingQueue([]);

      toast({
        title: "Disparo iniciado",
        description: json.message || "Mensagens sendo enviadas para as barbearias.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao disparar",
        description: err?.message || "Não foi possível enviar as mensagens.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const clearPending = () => setPendingQueue([]);
  const clearSent = () => setSentQueue([]);

  // Auto resize do textarea conforme o conteúdo
  useEffect(() => {
    const el = templateRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [template]);

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    const el = templateRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight">Gerenciar Disparos</h2>
          <p className="text-muted-foreground">Configure disparos globais (WhatsApp administrativo) e envie mensagens.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Combine className="h-6 w-6" />
            WhatsApp Administrativo
          </CardTitle>
          <CardDescription>
            Dispare uma mensagem única para o telefone de cada barbearia, controlando o intervalo entre envios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="template">Template da mensagem</Label>
                <Textarea
                  id="template"
                  ref={templateRef}
                  value={template}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  placeholder="Mensagem que será enviada para o telefone de cada barbearia."
                  rows={1}
                  className="resize-none overflow-hidden"
                />
              </div>

              <div className="grid gap-2">
                <Label>Intervalos entre disparos (segundos)</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="intervalA">Intervalo A</Label>
                    <Input
                      id="intervalA"
                      type="number"
                      min={1}
                      max={300}
                      value={intervalSecondsA}
                      onChange={(e) => setIntervalSecondsA(Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="intervalB">Intervalo B</Label>
                    <Input
                      id="intervalB"
                      type="number"
                      min={1}
                      max={300}
                      value={intervalSecondsB}
                      onChange={(e) => setIntervalSecondsB(Number(e.target.value))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  O disparo alterna entre A e B: primeiro usa o A, depois o B, e assim sucessivamente.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="image">Anexo (imagem opcional)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="image"
                    className="flex-1"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setImageFile(null);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setImageFile({ name: file.name, dataUrl: reader.result as string });
                      reader.readAsDataURL(file);
                    }}
                  />
                  {imageFile && (
                    <Button variant="destructive" size="sm" className="h-10" onClick={() => setImageFile(null)}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remover
                    </Button>
                  )}
                </div>
                {imageFile && (
                  <p className="text-xs text-muted-foreground">
                    Anexo selecionado: <span className="font-medium">{imageFile.name}</span>
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Excluir barbearias do disparo</Label>
                <div className="max-h-40 space-y-2 overflow-auto rounded border p-2">
                  {barbershops.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma barbearia carregada.</p>
                  )}
                  {barbershops.map((shop) => {
                    const checked = excludeIds.includes(shop.id);
                    return (
                      <label key={shop.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setExcludeIds((prev) =>
                              e.target.checked ? [...prev, shop.id] : prev.filter((id) => id !== shop.id),
                            );
                          }}
                        />
                        <span>{shop.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">As barbearias marcadas não receberão este disparo.</p>
              </div>

              <div className="grid gap-1">
                <Label>Instância BitSafira (admin)</Label>
                <p className="text-sm text-muted-foreground">
                  {settings?.bitsafiraInstanceId || "Usando padrão de ambiente"}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Prévia do disparo</h4>
                <span className="text-xs text-muted-foreground">
                  Intervalo atual: {intervalSecondsA || 10}s / {intervalSecondsB || 10}s
                </span>
              </div>

              <div className="flex justify-start">
                <div className="max-w-sm overflow-hidden rounded-2xl border border-slate-800 bg-[#0b141a] text-white shadow-lg">
                  {imageFile && (
                    <div className="flex items-center justify-center bg-black">
                      <Image
                        src={imageFile.dataUrl}
                        alt={imageFile.name}
                        width={360}
                        height={360}
                        className="w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="px-3 pb-4 pt-3">
                    <div className="inline-block max-w-full rounded-lg bg-[#1f2c33] px-3 py-2">
                      <p className="text-sm whitespace-pre-line break-words">
                        {template || "Sua mensagem aparecerá aqui."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {excludeIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Excluindo {excludeIds.length} barbearia(s) deste disparo.
                </p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar configurações"}
            </Button>
            <Button variant="outline" onClick={handleSend} disabled={isSending}>
              {isSending ? "Disparando..." : "Disparar para barbearias"}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="text-right text-xs text-muted-foreground">
            Dispara para o <strong>telefone</strong> de cada barbearia, respeitando os intervalos configurados.
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-1">
          <CardTitle>Fila de disparo</CardTitle>
          <CardDescription>Acompanhe pendências e envios concluídos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold">Pendentes ({pendingQueue.length})</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPending}
                disabled={pendingQueue.length === 0}
                className="h-8"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Limpar pendentes
              </Button>
            </div>
            {pendingQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum disparo pendente.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pendingQueue.map((item, idx) => (
                  <li key={`${item.id}-${idx}`} className="flex items-center justify-between rounded border px-2 py-1">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.phone}</div>
                    </div>
                    <span className="text-xs text-amber-500">Pendente</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold">Enviados ({sentQueue.length})</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSent}
                disabled={sentQueue.length === 0}
                className="h-8"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Limpar enviados
              </Button>
            </div>
            {sentQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum disparo enviado ainda.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {sentQueue.map((item, idx) => (
                  <li key={`${item.id}-${idx}`} className="flex items-center justify-between rounded border px-2 py-1">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.phone}</div>
                    </div>
                    {item.status === "error" ? (
                      <span className="text-xs text-red-500">Falhou</span>
                    ) : (
                      <span className="text-xs text-emerald-500">Enviado</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />
    </div>
  );
}
