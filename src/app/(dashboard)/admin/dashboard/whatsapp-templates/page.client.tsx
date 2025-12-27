"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import emojiData from "@emoji-mart/data";

import type { Barbershop, MessageTemplate } from "@/lib/definitions";
import { messageTemplates as defaultTemplates } from "@/lib/data";
import { fetchJson } from "@/lib/fetcher";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { useMessageTemplates } from "@/context/MessageTemplatesContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type TemplateForm = MessageTemplate & { reminderHoursBefore?: number | null };

const placeholders = [
  "{cliente}",
  "{servico}",
  "{valor}",
  "{endereco}",
  "{data}",
  "{horario}",
  "{barbeiro}",
  "{barbearia}",
];

const templateHints: Record<string, string> = {
  "Lembrete de Agendamento": "Enviada antes do horario marcado para lembrar o cliente.",
  "Confirmação de Agendamento": "Confirmação automática ao criar ou alterar agendamentos.",
  "Pesquisa de Satisfação": "Enviada após o serviço para coletar feedback.",
  "Confirmação Manual": "Use este modelo para disparos manuais e respostas rápidas.",
};

const templateOrder = ["Confirmação de Agendamento", "Lembrete de Agendamento"];

const sortTemplates = (list: TemplateForm[]) =>
  [...list].sort((a, b) => {
    const ai = templateOrder.indexOf(a.type || "");
    const bi = templateOrder.indexOf(b.type || "");
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

const EmojiPicker = dynamic(async () => import("@emoji-mart/react"), { ssr: false });

export default function WhatsAppTemplatesPage() {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { setMessageTemplates } = useMessageTemplates();
  const { toast } = useToast();

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [templates, setTemplates] = useState<TemplateForm[]>(defaultTemplates);
  const [isLoading, setIsLoading] = useState(true);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPayloadRef = useRef<string>("");
  const isSavingRef = useRef(false);
  const templatesRef = useRef<TemplateForm[]>(defaultTemplates);

  const normalizeTemplates = useCallback((list: TemplateForm[]) => {
    const normalized = list.map((template) => ({
      ...template,
      reminderHoursBefore:
        typeof template.reminderHoursBefore === "number" && !Number.isNaN(template.reminderHoursBefore)
          ? template.reminderHoursBefore
          : null,
    }));
    return sortTemplates(normalized);
  }, []);

  const syncTemplates = useCallback(
    (list: TemplateForm[]) => {
      templatesRef.current = list;
      setTemplates(list);
      setMessageTemplates(list);
    },
    [setMessageTemplates],
  );

  const resizeTextarea = useCallback((id: string) => {
    const textarea = textareaRefs.current[id];
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const loadBarbershop = useCallback(async () => {
    if (!barbershopId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetchJson<{ data: Barbershop }>(`/api/barbershops/${barbershopId}`);
      const shop = response.data;
      setBarbershop(shop);
      const baseTemplates =
        shop?.messageTemplates && shop.messageTemplates.length > 0 ? shop.messageTemplates : defaultTemplates;
      const normalized = normalizeTemplates(baseTemplates);
      syncTemplates(normalized);
      lastSavedPayloadRef.current = JSON.stringify(normalized);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar templates",
        description: error?.message || "Não foi possível carregar os dados da barbearia.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [barbershopId, normalizeTemplates, syncTemplates, toast]);

  useEffect(() => {
    loadBarbershop();
  }, [loadBarbershop]);

  useEffect(() => {
    templates.forEach((template) => resizeTextarea(template.id));
  }, [templates, resizeTextarea]);

  const saveTemplatesDebounced = useCallback(
    (payload: TemplateForm[], immediate = false) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      const normalized = normalizeTemplates(payload);
      const payloadKey = JSON.stringify(normalized);
      if (payloadKey === lastSavedPayloadRef.current) return;

      const runSave = async () => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        try {
          const res = await fetch("/api/message-templates/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barbershopId, messageTemplates: normalized }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || json.message || "Não foi possível salvar os modelos.");
          const updated = normalizeTemplates((json.data as TemplateForm[]) || normalized);
          lastSavedPayloadRef.current = JSON.stringify(updated);
          syncTemplates(updated);
          toast({ title: "Templates atualizados", description: "Mensagens salvas automaticamente." });
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: error?.message || "Revise os campos e tente novamente.",
          });
        } finally {
          isSavingRef.current = false;
        }
      };

      if (immediate) {
        void runSave();
        return;
      }

      saveTimeoutRef.current = setTimeout(() => {
        void runSave();
      }, 10000); // 10s idle
    },
    [barbershopId, normalizeTemplates, syncTemplates, toast],
  );

  const handleContentChange = (id: string, value: string) => {
    setTemplates((prev) => {
      const next = prev.map((tpl) => (tpl.id === id ? { ...tpl, content: value } : tpl));
      templatesRef.current = next;
      saveTemplatesDebounced(next, false);
      return next;
    });
  };

  const handleBlur = () => {
    saveTemplatesDebounced(templatesRef.current, true);
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    setTemplates((prev) => {
      const next = prev.map((tpl) => (tpl.id === id ? { ...tpl, enabled } : tpl));
      templatesRef.current = next;
      saveTemplatesDebounced(next, false);
      return next;
    });
  };

  const handleReminderChange = (id: string, value: number | null) => {
    setTemplates((prev) => {
      const next = prev.map((tpl) => (tpl.id === id ? { ...tpl, reminderHoursBefore: value } : tpl));
      templatesRef.current = next;
      saveTemplatesDebounced(next, false);
      return next;
    });
  };

  const handleInsertVariable = (id: string, variable: string) => {
    const textarea = textareaRefs.current[id];
    const tpl = templates.find((t) => t.id === id);
    if (!textarea || !tpl) return;
    const base = tpl.content || "";
    const start = textarea.selectionStart ?? base.length;
    const end = textarea.selectionEnd ?? start;
    const next = base.slice(0, start) + variable + base.slice(end);
    handleContentChange(id, next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + variable.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const appendEmoji = (id: string, emoji: string) => {
    const textarea = textareaRefs.current[id];
    const tpl = templates.find((t) => t.id === id);
    if (!textarea || !tpl) return;
    const base = tpl.content || "";
    const start = textarea.selectionStart ?? base.length;
    const end = textarea.selectionEnd ?? start;
    const next = base.slice(0, start) + emoji + base.slice(end);
    handleContentChange(id, next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const isBasicPlan = useMemo(() => (barbershop?.plan || "").toLowerCase().startsWith("b"), [barbershop?.plan]);
  const sortedTemplates = useMemo(() => {
    const list = isBasicPlan ? templates.filter((tpl) => tpl.type === "Confirmação Manual") : templates;
    return sortTemplates(list);
  }, [isBasicPlan, templates]);

  if (isBarbershopIdLoading || isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-2 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Carregando templates...</p>
      </div>
    );
  }

  if (!barbershopId || !barbershop) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Conecte uma barbearia primeiro</CardTitle>
            <CardDescription>
              Não encontramos uma barbearia vinculada ao seu usuário. Crie ou selecione uma para habilitar os templates.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Templates</h2>
        <p className="text-muted-foreground">Personalize as mensagens automáticas enviadas no WhatsApp.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Templates de mensagens</CardTitle>
            <CardDescription>Ajuste os textos enviados automaticamente após criar ou alterar agendamentos.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {sortedTemplates.map((template) => (
              <div key={template.id} className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{template.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {templateHints[template.type] || "Template automático do fluxo."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={!!template.enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(template.id, checked)}
                      onBlur={handleBlur}
                    />
                    <span>Ativo</span>
                  </div>
                </div>

                {template.type === "Lembrete de Agendamento" && (
                  <div className="space-y-2">
                    <Label htmlFor={`reminder-${template.id}`}>Horas antes do agendamento</Label>
                    <Input
                      id={`reminder-${template.id}`}
                      type="number"
                      min={1}
                      className="max-w-[100px]"
                      value={template.reminderHoursBefore ?? ""}
                      onChange={(e) =>
                        handleReminderChange(
                          template.id,
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      onBlur={handleBlur}
                      placeholder="24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Define quando o lembrete será enviado antes do horário marcado.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`content-${template.id}`}>Conteúdo</Label>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Emoji</span>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() =>
                            setActiveEmojiPicker((prev) => (prev === template.id ? null : template.id))
                          }
                        >
                          🙂
                        </Button>
                        {activeEmojiPicker === template.id && (
                          <div className="absolute right-0 z-10 mt-2 w-[360px] max-w-[90vw] rounded-md border bg-background shadow-lg">
                            <div className="p-2">
                              <EmojiPicker
                                data={emojiData}
                                locale="pt"
                                style={{ width: "100%" }}
                                onEmojiSelect={(emoji: any) => {
                                  appendEmoji(template.id, emoji.native || emoji.shortcodes || "");
                                  setActiveEmojiPicker(null);
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Textarea
                    id={`content-${template.id}`}
                    rows={5}
                    className="min-h-[140px] w-full resize-none rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 text-sm leading-relaxed shadow-inner focus:border-slate-400 focus:ring-2 focus:ring-slate-500/60"
                    ref={(el) => {
                      textareaRefs.current[template.id] = el;
                    }}
                    value={template.content || ""}
                    onChange={(e) => handleContentChange(template.id, e.target.value)}
                    onBlur={handleBlur}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Variáveis suportadas:</span>
                    {placeholders.map((placeholder) => (
                      <Button
                        key={placeholder}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => handleInsertVariable(template.id, placeholder)}
                      >
                        {placeholder}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {template.type?.toLowerCase().includes("manual")
                    ? "Os textos acima são usados nas notificações manuais do BarberFlow (confirmação manual)."
                    : "Os textos acima são usados nas notificações automáticas do BarberFlow."}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
