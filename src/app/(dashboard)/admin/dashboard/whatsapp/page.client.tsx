'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { Barbershop, WhatsAppStatus } from "@/lib/definitions";
import { fetchJson } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Loader2, PhoneOff, PlugZap, QrCode, RefreshCcw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type StatusMeta = {
  label: string;
  description: string;
  className: string;
  icon: LucideIcon;
};

const statusMeta: Record<WhatsAppStatus | "UNKNOWN", StatusMeta> = {
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

function getStatusInfo(status?: WhatsAppStatus | null) {
  return statusMeta[status || "UNKNOWN"];
}

export default function WhatsAppPage() {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { toast } = useToast();

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isMissingInstanceDialogOpen, setIsMissingInstanceDialogOpen] = useState(false);
  const [qrGeneratedAt, setQrGeneratedAt] = useState<number | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const statusRef = useRef<WhatsAppStatus | null | undefined>(barbershop?.whatsappStatus);

  const statusInfo = getStatusInfo(barbershop?.whatsappStatus);
  const isDisconnectedStatus = barbershop?.whatsappStatus === "DISCONNECTED";

  const qrCodeUrl = useMemo(() => {
    if (!barbershop?.qrCodeBase64) return null;
    return `data:image/png;base64,${barbershop.qrCodeBase64}`;
  }, [barbershop?.qrCodeBase64]);

  const shouldShowQr = !!qrCodeUrl;
  useEffect(() => {
    // Fecha o modal se já estiver conectado ou se não houver QR para exibir.
    if (barbershop?.whatsappStatus === "CONNECTED" || !shouldShowQr) {
      setIsQrModalOpen(false);
    }
  }, [barbershop?.whatsappStatus, shouldShowQr]);
  const handleConnect = useCallback(async () => {
    if (!barbershopId) return;
    setIsConnecting(true);
    try {
      const res = await fetch("/api/bitsafira/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barbershopId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Não foi possível iniciar a conexão.");
      }
      setBarbershop((prev) =>
        prev
          ? {
              ...prev,
              bitsafiraInstanceId: json.instanceId || prev.bitsafiraInstanceId,
              whatsappStatus: (json.whatsappStatus as WhatsAppStatus) || prev.whatsappStatus,
              qrCodeBase64: json.qrCodeBase64 ?? prev.qrCodeBase64 ?? null,
            }
          : prev
      );
      if (json.qrCodeBase64) {
        setQrGeneratedAt(Date.now());
      }
      toast({
        title: "Conexão iniciada",
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
  }, [barbershopId, toast]);

  const handleValidateStatus = useCallback(async () => {
    if (!barbershopId) return;
    setIsValidating(true);
    try {
      const res = await fetch("/api/bitsafira/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barbershopId }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Não foi possível validar a instância.");
      }
      const nextStatus = (json.status as WhatsAppStatus) || barbershop?.whatsappStatus;
      const nextQr =
        json.qrCodeBase64 ||
        json.data?.qrCode ||
        json.data?.qrCodeBase64 ||
        json.data?.qr ||
        json.data?.qrcode ||
        json.data?.qr_code ||
        json.data?.conexao?.qrCode ||
        json.data?.conexao?.qrCodeBase64 ||
        json.data?.conexao?.qr ||
        json.data?.conexao?.qrcode ||
        json.data?.conexao?.qr_code ||
        json.data?.conexao?.instance?.qrCode ||
        json.data?.conexao?.instance?.qrCodeBase64 ||
        json.data?.conexao?.instance?.qr ||
        json.data?.conexao?.instance?.qrcode ||
        json.data?.conexao?.instance?.qr_code ||
        json.data?.instance?.qrCode ||
        json.data?.instance?.qrCodeBase64 ||
        json.data?.instance?.qr ||
        json.data?.instance?.qrcode ||
        json.data?.instance?.qr_code ||
        null;
      setBarbershop((prev) =>
        prev
          ? {
              ...prev,
              whatsappStatus: nextStatus || prev.whatsappStatus,
              qrCodeBase64: nextQr ?? prev.qrCodeBase64 ?? null,
              bitsafiraInstanceId: prev.bitsafiraInstanceId || json.data?.id,
            }
          : prev
      );
      if (nextQr) {
        setQrGeneratedAt(Date.now());
      }
      toast({
        title: "Status atualizado",
        description: json.message || "Conexão validada com a WhatsApp.",
      });
    } catch (error: any) {
      const msg: string = error?.message || "";
      const normalized = msg.toLowerCase();
      if (
        normalized.includes("instância bitsafira não configurados") ||
        normalized.includes("instancia bitsafira nao configurados") ||
        normalized.includes("token ou id da instância bitsafira")
      ) {
        setIsMissingInstanceDialogOpen(true);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao validar",
          description: msg || "Tente novamente.",
        });
      }
    } finally {
      setIsValidating(false);
    }
  }, [barbershopId, barbershop?.whatsappStatus, toast]);

  const loadBarbershop = useCallback(
    async (opts: { withStatusValidate?: boolean } = {}) => {
      if (!barbershopId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetchJson<{ data: Barbershop }>(`/api/barbershops/${barbershopId}`);
        const shop = response.data;
        setBarbershop(shop);
        const isBasicPlan = (shop?.plan || "").toLowerCase().startsWith("b");
        setIsPlanDialogOpen(isBasicPlan);

        if (opts.withStatusValidate) {
          // dispara validação de status ao entrar na aba, para trazer conexão atualizada
          await handleValidateStatus();
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar WhatsApp",
          description: error?.message || "Não foi possível carregar os dados da barbearia.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [barbershopId, toast, handleValidateStatus]
  );

  useEffect(() => {
    loadBarbershop({ withStatusValidate: true });
  }, [loadBarbershop]);

  useEffect(() => {
    statusRef.current = barbershop?.whatsappStatus;
    if (barbershop?.whatsappStatus === "CONNECTED") {
      setQrGeneratedAt(null);
    }
  }, [barbershop?.whatsappStatus]);

  useEffect(() => {
    if (!qrGeneratedAt) return;
    if (statusRef.current === "CONNECTED") return;

    const timer = setTimeout(async () => {
      if (!barbershopId || isConnecting || isValidating) return;
      await handleValidateStatus();
      if (statusRef.current !== "CONNECTED" && !isConnecting) {
        await handleConnect();
      }
    }, 25000);

    return () => clearTimeout(timer);
  }, [qrGeneratedAt, barbershopId, isConnecting, isValidating, handleValidateStatus, handleConnect]);

  const handleDisconnect = async () => {
    if (!barbershopId) return;
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/bitsafira/instance/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barbershopId }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Não foi possível desconectar.");
      }
      setBarbershop((prev) =>
        prev ? { ...prev, whatsappStatus: "DISCONNECTED", qrCodeBase64: null } : prev
      );
      setQrGeneratedAt(null);
      toast({
        title: "Desconectado",
        description: json.message || "Instância desconectada com sucesso.",
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
  };

  if (isBarbershopIdLoading || isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-2 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Carregando configurações do WhatsApp...</p>
      </div>
    );
  }

  const isBasicPlan = (barbershop?.plan || "").toLowerCase().startsWith("b");

  if (isBasicPlan) {
    return (
      <>
        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Recurso disponível no plano Premium</DialogTitle>
              <DialogDescription>
                Para usar o WhatsApp automático, altere o plano da barbearia para Premium.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button asChild>
                <Link href="/admin/dashboard/subscription">Ir para Plano e Assinatura</Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <div className="flex h-[60vh] items-center justify-center">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>WhatsApp indisponível no plano Básico</CardTitle>
              <CardDescription>
                Atualize para Premium para habilitar automações e mensagens automáticas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/admin/dashboard/subscription">Alterar plano</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!barbershopId || !barbershop) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Conecte uma barbearia primeiro</CardTitle>
            <CardDescription>
              Não encontramos uma barbearia vinculada ao seu usuário. Crie ou selecione uma para
              habilitar o WhatsApp.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp</h2>
          <p className="text-muted-foreground">
            Conecte sua instância no WhatsApp e personalize as mensagens automáticas da barbearia.
          </p>
        </div>
        <Badge className={cn("flex items-center gap-2 border px-3 py-1.5 text-sm", statusInfo.className)}>
          <statusInfo.icon className="h-4 w-4" />
          {statusInfo.label}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlugZap className="h-5 w-5" />
                Conexão com WhatsApp
              </CardTitle>
              <CardDescription>
                Gere o QR Code, acompanhe o status e desconecte quando precisar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || statusInfo.label === "Conectado"}
                  className="gap-2 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:bg-white hover:text-destructive"
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                  Conectar / Gerar QR
                </Button>
                <Button
                  variant="outline"
                  onClick={handleValidateStatus}
                  disabled={isValidating}
                  className="gap-2"
                >
                  {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Validar status
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting || isDisconnectedStatus}
                  className="gap-2 bg-destructive text-destructive-foreground border border-transparent transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:bg-white hover:text-destructive hover:border-destructive disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PhoneOff className="h-4 w-4" />
                  )}
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
                          ID usado para conectar com a Whatsapp.
                        </p>
                      </div>
                      <Badge variant="outline">{barbershop.bitsafiraInstanceId ? "Existente" : "Nova"}</Badge>
                    </div>
                    <p className="mt-2 font-mono text-sm break-all">
                      {barbershop.bitsafiraInstanceId || "Ainda não criada"}
                    </p>
                    <Separator className="my-4" />
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
                      <li>Clique em "Conectar / Gerar QR" para criar ou recuperar a instância.</li>
                      <li>No celular, abra WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho.</li>
                      <li>Escaneie o QR Code exibido ao lado.</li>
                      <li>Depois de escanear, use "Validar status" para atualizar a conexão.</li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-lg border p-4 bg-muted/30 flex items-center justify-center min-h-[300px]">
                  {shouldShowQr ? (
                    <div className="w-full space-y-3">
                      <p className="text-center text-sm text-muted-foreground">
                        Aponte a câmera do WhatsApp para este código:
                      </p>
                      <div className="mx-auto flex max-w-xs items-center justify-center rounded-lg bg-background p-4 shadow-sm">
                        <Image
                          src={qrCodeUrl}
                          alt="QR Code do WhatsApp"
                          width={220}
                          height={220}
                          className="h-auto w-full max-w-[220px]"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => shouldShowQr && barbershop?.whatsappStatus !== "CONNECTED" && setIsQrModalOpen(true)}
                        disabled={!shouldShowQr || barbershop?.whatsappStatus === "CONNECTED"}
                      >
                        Ampliar QR Code
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground space-y-2">
                      <QrCode className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p>
                        Gere um QR Code para conectar ou valide o status da instância já criada.
                      </p>
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

      

      <Dialog
        open={shouldShowQr && isQrModalOpen}
        onOpenChange={(open) => setIsQrModalOpen(shouldShowQr && open)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code do WhatsApp</DialogTitle>
          </DialogHeader>
          {shouldShowQr ? (
            <div className="mx-auto flex max-w-sm items-center justify-center rounded-lg bg-background p-4 shadow-sm">
              <Image
                src={qrCodeUrl}
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

      <Dialog open={isMissingInstanceDialogOpen} onOpenChange={setIsMissingInstanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instância não configurada</DialogTitle>
            <DialogDescription>
              Clique em <strong>Conectar</strong> para criar a instância BitSafira e gerar o QR Code.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsMissingInstanceDialogOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                setIsMissingInstanceDialogOpen(false);
                handleConnect();
              }}
              disabled={isConnecting}
              className="gap-2"
            >
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Conectar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
