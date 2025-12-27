'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Loader2, PhoneOff, PlugZap, QrCode, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AdminWhatsappSettings = {
  bitsafiraInstanceId?: string | null;
  whatsappStatus?: string | null;
  qrCodeBase64?: string | null;
};

type StatusMeta = {
  label: string;
  description: string;
  className: string;
  icon: LucideIcon;
};

const statusMeta: Record<string, StatusMeta> = {
  CONNECTED: {
    label: "Conectado",
    description: "Pronto para enviar mensagens.",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    icon: CheckCircle2,
  },
  AWAITING_SCAN: {
    label: "Desconectado",
    description: "Gere/valide um QR e escaneie no WhatsApp > Aparelhos conectados.",
    className: "bg-red-500/10 text-red-400 border-red-500/25",
    icon: PhoneOff,
  },
  SCAN_QR_CODE: {
    label: "Desconectado",
    description: "Gere/valide um QR e escaneie no WhatsApp > Aparelhos conectados.",
    className: "bg-red-500/10 text-red-400 border-red-500/25",
    icon: PhoneOff,
  },
  LOADING_QR: {
    label: "Gerando QR Code",
    description: "Aguarde ou clique em validar para atualizar.",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    icon: Loader2,
  },
  DISCONNECTED: {
    label: "Desconectado",
    description: "Clique em conectar para gerar um novo QR Code.",
    className: "bg-red-500/10 text-red-400 border-red-500/25",
    icon: PhoneOff,
  },
  TIMEOUT: {
    label: "Tempo esgotado",
    description: "Gere um novo QR Code e tente novamente.",
    className: "bg-orange-500/10 text-orange-400 border-orange-500/25",
    icon: AlertCircle,
  },
  ERROR: {
    label: "Erro",
    description: "Tente validar ou reconectar para gerar um novo QR.",
    className: "bg-red-500/10 text-red-400 border-red-500/25",
    icon: AlertCircle,
  },
  UNKNOWN: {
    label: "Status desconhecido",
    description: "Carregue os dados para continuar.",
    className: "bg-slate-500/10 text-slate-200 border-slate-500/25",
    icon: AlertCircle,
  },
};

function getStatusInfo(status?: string | null) {
  return statusMeta[status || "UNKNOWN"];
}

export default function SuperAdminWhatsappPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<AdminWhatsappSettings | null>(null);
  const [manualInstanceId, setManualInstanceId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrGeneratedAt, setQrGeneratedAt] = useState<number | null>(null);
  const statusRef = useRef<string | null | undefined>(settings?.whatsappStatus);
  const validateInFlightRef = useRef(false);
  const saveInstanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const statusInfo = getStatusInfo(settings?.whatsappStatus);
  const isDisconnectedStatus = settings?.whatsappStatus === "DISCONNECTED";

  const qrCodeUrl = useMemo(() => {
    if (!settings?.qrCodeBase64) return null;
    return `data:image/png;base64,${settings.qrCodeBase64}`;
  }, [settings?.qrCodeBase64]);

  const shouldShowQr = settings?.whatsappStatus !== "CONNECTED" && !!qrCodeUrl;

  useEffect(() => {
    if (settings?.whatsappStatus === "CONNECTED" || !shouldShowQr) {
      setIsQrModalOpen(false);
    }
  }, [settings?.whatsappStatus, shouldShowQr]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/super-admin/admin-whatsapp/settings");
      const json = await res.json();
      setSettings(json.data);
      statusRef.current = json.data?.whatsappStatus;
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar WhatsApp",
        description: err?.message || "NÃ£o foi possÃ­vel carregar os dados.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    statusRef.current = settings?.whatsappStatus;
    if (settings?.whatsappStatus === "CONNECTED") {
      setQrGeneratedAt(null);
    }
  }, [settings?.whatsappStatus]);

  useEffect(() => {
    if (settings?.bitsafiraInstanceId) {
      setManualInstanceId(settings.bitsafiraInstanceId);
    }
  }, [settings?.bitsafiraInstanceId]);

  const persistInstanceId = useCallback(
    async (instanceId: string) => {
      if (!instanceId) return false;
      try {
        const res = await fetch("/api/super-admin/admin-whatsapp/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bitsafiraInstanceId: instanceId }),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(json.message || "Erro ao salvar instância.");
        }
        setSettings((prev) => (prev ? { ...prev, bitsafiraInstanceId: instanceId } : prev));
        return true;
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar instância",
          description: error?.message || "Tente novamente.",
        });
        return false;
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!manualInstanceId || manualInstanceId === settings?.bitsafiraInstanceId) return;
    if (saveInstanceTimerRef.current) clearTimeout(saveInstanceTimerRef.current);
    saveInstanceTimerRef.current = setTimeout(() => {
      void persistInstanceId(manualInstanceId.trim());
    }, 600);
    return () => {
      if (saveInstanceTimerRef.current) clearTimeout(saveInstanceTimerRef.current);
    };
  }, [manualInstanceId, persistInstanceId, settings?.bitsafiraInstanceId]);

  const handleConnect = useCallback(async () => {
    const instanceToUse = manualInstanceId.trim() || settings?.bitsafiraInstanceId || "";
    if (!instanceToUse) {
      toast({
        variant: "destructive",
        title: "Informe a instância",
        description: "Preencha o ID da instância BitSafira para conectar.",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const res = await fetch("/api/super-admin/admin-whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bitsafiraInstanceId: instanceToUse }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "N?o foi poss?vel iniciar a conex?o.");
      }
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              bitsafiraInstanceId: json.data?.bitsafiraInstanceId || instanceToUse || prev.bitsafiraInstanceId,
              whatsappStatus: json.data?.whatsappStatus || prev.whatsappStatus,
              qrCodeBase64: json.data?.qrCodeBase64 ?? prev.qrCodeBase64 ?? null,
            }
          : json.data,
      );
      setManualInstanceId(instanceToUse);
      if (json.data?.qrCodeBase64) {
        setQrGeneratedAt(Date.now());
      }
      toast({
        title: "Conex?o iniciada",
        description: json.message || "Escaneie o QR Code no WhatsApp para concluir.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao conectar",
        description: error?.message || "Tente novamente.",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [manualInstanceId, settings?.bitsafiraInstanceId, toast]);
  const handleValidateStatus = useCallback(async () => {
    if (validateInFlightRef.current) return;
    validateInFlightRef.current = true;
    setIsValidating(true);
    try {
      const res = await fetch("/api/super-admin/admin-whatsapp/validate", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Não foi possivel validar a insância.");
      }
      const nextStatus = json.data?.status || settings?.whatsappStatus;
      const nextQr = json.data?.qrCodeBase64 || null;
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              whatsappStatus: nextStatus || prev.whatsappStatus,
              qrCodeBase64: nextQr ?? prev.qrCodeBase64 ?? null,
            }
          : prev,
      );
      if (nextQr) {
        setQrGeneratedAt(Date.now());
      }
      const isConnected = nextStatus === "CONNECTED";
      toast({
        variant: isConnected ? "default" : "destructive",
        title: "Status atualizado",
        description: json.message || (isConnected ? "Conexão validada." : "Instância está desconectada."),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao validar",
        description: error?.message || "Tente novamente.",
      });
    } finally {
      setIsValidating(false);
      validateInFlightRef.current = false;
    }
  }, [settings?.whatsappStatus, toast]);

  useEffect(() => {
    if (!shouldShowQr || settings?.whatsappStatus === "CONNECTED") return;
    const interval = setInterval(() => {
      void handleValidateStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [handleValidateStatus, settings?.whatsappStatus, shouldShowQr]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/super-admin/admin-whatsapp/disconnect", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "NÃ£o foi possÃ­vel desconectar.");
      }
      setSettings((prev) =>
        prev ? { ...prev, whatsappStatus: "DISCONNECTED", qrCodeBase64: null } : prev,
      );
      setQrGeneratedAt(null);
      toast({
        title: "Desconectado",
        description: json.message || "Instância conectada com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao desconectar",
        description: error?.message || "Tente novamente.",
      });
    } finally {
      setIsDisconnecting(false);
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Carregando configuraÃ§Ãµes do WhatsApp admin...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp Administrativo</h2>
          <p className="text-muted-foreground">
            Conecte a instância administrativa no WhatsApp e acompanhe o status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("flex items-center gap-2 border px-3 py-1.5 text-sm", statusInfo.className)}>
            <statusInfo.icon className="h-4 w-4" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlugZap className="h-5 w-5" />
              Conexão com Whatsapp
            </CardTitle>
          <CardDescription>
            Gere o QR Code, acompanhe o status e desconecte quando precisar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Instância do BitSafira (admin)</label>
            <Input
              value={manualInstanceId}
              onChange={(e) => setManualInstanceId(e.target.value)}
              placeholder="Informe o ID da instância para conectar"
            />
            <p className="text-xs text-muted-foreground">
              Use uma instância específica para conectar. Se vazio, usa a configuração atual/ambiente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleConnect}
              disabled={isConnecting || statusInfo.label === "Conectado"}
              className="gap-2"
              >
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                Conectar / Gerar QR
              </Button>
              <Button variant="outline" onClick={handleValidateStatus} disabled={isValidating} className="gap-2">
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Validar status
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isDisconnecting || isDisconnectedStatus}
                className="gap-2"
              >
                {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
                Desconectar WhatsApp
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-4">
                <div className={cn("flex items-start gap-3 rounded-lg border p-4", statusInfo.className)}>
                  <statusInfo.icon className="mt-0.5 h-5 w-5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Estado atual: {statusInfo.label}</p>
                    <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Instância</p>
                      <p className="text-xs text-muted-foreground">
                        ID usado para conectar ao WhatsApp.
                      </p>
                    </div>
                    <Badge variant="outline">{settings?.bitsafiraInstanceId ? "Existente" : "Nova"}</Badge>
                  </div>
                  <p className="mt-2 font-mono text-sm break-all">
                    {settings?.bitsafiraInstanceId || "Ainda nÃ£o criada"}
                  </p>
                  <Separator className="my-4" />
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
                    <li>Clique em "Conectar / Gerar QR" para criar ou recuperar a instância.</li>
                    <li>No celular, abra WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho.</li>
                    <li>Escaneie o QR Code exibido ao lado.</li>
                    <li>Depois de escanear, use "Validar status" para atualizar a Conexão </li>
                  </ul>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/30 flex items-center justify-center min-h-[300px]">
                {shouldShowQr ? (
                  <div className="w-full space-y-3">
                    <p className="text-center text-sm text-muted-foreground">
                      Aponte a cÃ¢mera do WhatsApp para este cÃ³digo:
                    </p>
                    <div className="mx-auto flex max-w-xs items-center justify-center rounded-lg bg-background p-4 shadow-sm">
                      <Image
                        src={qrCodeUrl!}
                        alt="QR Code do WhatsApp"
                        width={220}
                        height={220}
                        className="h-auto w-full max-w-[220px]"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => shouldShowQr && settings?.whatsappStatus !== "CONNECTED" && setIsQrModalOpen(true)}
                      disabled={!shouldShowQr || settings?.whatsappStatus === "CONNECTED"}
                    >
                      Ampliar QR Code
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground space-y-2">
                    <QrCode className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p>Gere um QR Code para conectar ou valide o status da instância já criada.</p>
                    {statusInfo.label === "Conectado" && (
                      <p className="text-emerald-400">Conexão ativa: não é necessário QR Code.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={shouldShowQr && isQrModalOpen} onOpenChange={(open) => setIsQrModalOpen(shouldShowQr && open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code do WhatsApp</DialogTitle>
          </DialogHeader>
          {shouldShowQr ? (
            <div className="mx-auto flex max-w-sm items-center justify-center rounded-lg bg-background p-4 shadow-sm">
              <Image
                src={qrCodeUrl!}
                alt="QR Code do WhatsApp"
                width={320}
                height={320}
                className="h-auto w-full max-w-[320px]"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Gere ou valide para exibir o QR Code.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

