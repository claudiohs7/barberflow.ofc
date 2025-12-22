'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Barbershop, MessageTemplate } from "@/lib/definitions";
import { messageTemplates as defaultTemplates } from "@/lib/data";
import { fetchJson } from "@/lib/fetcher";
import { useToast } from "@/hooks/use-toast";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { useMessageTemplates } from "@/context/MessageTemplatesContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import emojiData from "@emoji-mart/data";

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
  "Confirmação de Agendamento": "Confirmacao automatica ao criar ou alterar agendamentos.",
  "Pesquisa de Satisfação": "Enviada apos o servico para coletar feedback.",
  "Confirmação Manual": "Use este modelo para disparos manuais e respostas rapidas.",
};

const EmojiPicker = dynamic(async () => import("@emoji-mart/react"), { ssr: false });

const placeholderRegex = new RegExp(`(${placeholders.map((p) => p.replace(/[{}]/g, "\\$&")).join("|")})`, "gi");

export default function WhatsAppTemplatesPage() {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { setMessageTemplates } = useMessageTemplates();
  const { toast } = useToast();

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [templates, setTemplates] = useState<TemplateForm[]>(defaultTemplates);
  const [isLoading, setIsLoading] = useState(true);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);
  const [selectionMap, setSelectionMap] = useState<Record<string, { start: number; end: number }>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPayloadRef = useRef<string>("");
  const isInitialLoadRef = useRef(true);
  const isSavingRef = useRef(false);


  const resizeTextarea = useCallback((id: string) => {
    const textarea = textareaRefs.current[id];
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const normalizeTemplates = useCallback((list: TemplateForm[]) => {
    return list.map((template) => ({
      ...template,
      reminderHoursBefore:
        typeof template.reminderHoursBefore === "number" && !Number.isNaN(template.reminderHoursBefore)
          ? template.reminderHoursBefore
          : null,
    }));
  }, []);

  const syncTemplates = useCallback(
    (list: TemplateForm[]) => {
      setTemplates(list);
      setMessageTemplates(list);
    },
    [setMessageTemplates]
  );

  const updateTemplate = useCallback((id: string, patch: Partial<TemplateForm>) => {
    setTemplates((prev) => prev.map((tpl) => (tpl.id === id ? { ...tpl, ...patch } : tpl)));
  }, []);

  const handleContentChange = useCallback(
    (id: string, value: string) => {
      updateTemplate(id, { content: value });
      requestAnimationFrame(() => resizeTextarea(id));
    },
    [resizeTextarea, updateTemplate]
  );

  const appendEmoji = (id: string, emoji: string) => {
    setTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.id !== id) return tpl;
        const selection = selectionMap[id] || { start: tpl.content?.length || 0, end: tpl.content?.length || 0 };
        const base = tpl.content || "";
        const next = base.slice(0, selection.start) + emoji + base.slice(selection.end ?? selection.start);
        const cursor = selection.start + (emoji?.length || 0);
        setSelectionMap((map) => ({ ...map, [id]: { start: cursor, end: cursor } }));
        return { ...tpl, content: next };
      })
    );
  };

  const handleSelectionChange = (id: string, target: HTMLTextAreaElement) => {
    setSelectionMap((map) => ({
      ...map,
      [id]: { start: target.selectionStart || 0, end: target.selectionEnd || target.selectionStart || 0 },
    }));
  };

  const handleInsertVariable = useCallback(
    (id: string, variable: string) => {
      const textarea = textareaRefs.current[id];
      const currentTemplate = templates.find((tpl) => tpl.id === id);
      if (!textarea || !currentTemplate) return;

      const selection = selectionMap[id] || { start: currentTemplate.content?.length || 0, end: currentTemplate.content?.length || 0 };
      const base = currentTemplate.content || "";
      const next = base.slice(0, selection.start) + variable + base.slice(selection.end ?? selection.start);
      updateTemplate(id, { content: next });

      const cursor = selection.start + variable.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
        resizeTextarea(id);
      });
    },
    [selectionMap, templates, updateTemplate, resizeTextarea]
  );

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
      const isBasicPlan = (shop?.plan || "").toLowerCase().startsWith("b");
      const filteredTemplates = isBasicPlan
        ? baseTemplates.filter((tpl) => tpl.type === "Confirmação Manual")
        : baseTemplates;
      syncTemplates(filteredTemplates);
      lastSavedPayloadRef.current = JSON.stringify(normalizeTemplates(filteredTemplates));
      isInitialLoadRef.current = true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar templates",
        description: error?.message || "Nao foi possivel carregar os dados da barbearia.",
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

  const saveTemplates = useCallback(
    async (payload: TemplateForm[], opts: { silent?: boolean; payloadKey?: string } = {}) => {
      if (!barbershopId) return;
      const isBasicPlan = (barbershop?.plan || "").toLowerCase().startsWith("b");
      const effectivePayload = isBasicPlan ? payload.filter((tpl) => tpl.type === "Confirmação Manual") : payload;

      const payloadKey = opts.payloadKey ?? JSON.stringify(effectivePayload);
      if (opts.silent && payloadKey === lastSavedPayloadRef.current) return;
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      try {
        const res = await fetch("/api/message-templates/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barbershopId, messageTemplates: effectivePayload }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || json.message || "Nao foi possivel salvar os modelos.");
        }
        const updated = (json.data as TemplateForm[]) || effectivePayload;
        lastSavedPayloadRef.current = payloadKey;
        syncTemplates(updated);
        setBarbershop((prev) => (prev ? { ...prev, messageTemplates: updated } : prev));
        if (!opts.silent) {
          toast({
            title: "Templates atualizados",
            description: "Mensagens salvas com sucesso.",
          });
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: opts.silent ? "Falha ao salvar automaticamente" : "Erro ao salvar",
          description: error?.message || "Revise os campos e tente novamente.",
        });
      } finally {
        isSavingRef.current = false;
      }
    },
    [barbershopId, syncTemplates, toast]
  );

  useEffect(() => {
    if (!barbershopId || isLoading) return;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    const payload = normalizeTemplates(templates);
    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastSavedPayloadRef.current) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      void saveTemplates(payload, { silent: true, payloadKey });
    }, 800);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [barbershopId, isLoading, normalizeTemplates, saveTemplates, templates]);

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
              Nao encontramos uma barbearia vinculada ao seu usuario. Crie ou selecione uma para
              habilitar os templates.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isBasicPlan = (barbershop?.plan || "").toLowerCase().startsWith("b");
  const visibleTemplates = isBasicPlan
    ? templates.filter((tpl) => tpl.type === "Confirmação Manual")
    : templates;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Templates</h2>
        <p className="text-muted-foreground">
          Personalize as mensagens automaticas enviadas no WhatsApp.
        </p>
      </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Templates de mensagens</CardTitle>
              <CardDescription>
                Ajuste os textos enviados automaticamente apos criar ou alterar agendamentos.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
            {visibleTemplates.map((template) => {
              const isReminder = template.type === "Lembrete de Agendamento";

              return (
                <div key={template.id} className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {templateHints[template.type] || "Template automatico do fluxo."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Switch
                        checked={!!template.enabled}
                        onCheckedChange={(checked) => updateTemplate(template.id, { enabled: checked })}
                      />
                      <span>Ativo</span>
                    </div>
                  </div>

                  {isReminder && (
                    <div className="space-y-2">
                      <Label htmlFor={`reminder-${template.id}`}>Horas antes do agendamento</Label>
                      <Input
                        id={`reminder-${template.id}`}
                        type="number"
                        min={1}
                        value={template.reminderHoursBefore ?? ""}
                        onChange={(e) =>
                          updateTemplate(template.id, {
                            reminderHoursBefore: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        placeholder="24"
                      />
                      <p className="text-xs text-muted-foreground">
                        Define quando o lembrete sera enviado antes do horario marcado.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`content-${template.id}`}>Conteudo</Label>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Emoji</span>
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => setActiveEmojiPicker((prev) => (prev === template.id ? null : template.id))}
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
                      rows={4}
                      className="resize-none overflow-hidden"
                      ref={(el) => {
                        textareaRefs.current[template.id] = el;
                      }}
                      value={template.content}
                      onChange={(e) => handleContentChange(template.id, e.target.value)}
                      onInput={() => resizeTextarea(template.id)}
                      onSelect={(e) => handleSelectionChange(template.id, e.currentTarget)}
                      onKeyUp={(e) => handleSelectionChange(template.id, e.currentTarget)}
                      onClick={(e) => handleSelectionChange(template.id, e.currentTarget)}
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Variaveis suportadas:</span>
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
                    Os textos acima sao usados nas notificacoes automaticas do BarberFlow.
                  </div>
                </div>
              );
            })}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
