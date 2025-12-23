"use client";

import { useEffect, useState, useCallback } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { MessageTemplatesProvider } from "@/context/MessageTemplatesContext";
import { BarbershopIdProvider, useBarbershopId } from "@/context/BarbershopIdContext";
import { SessionTimeout } from "@/components/session-timeout";
import { RouteGuard } from "@/components/route-guard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname } from "next/navigation";
import { isBefore, startOfDay } from "date-fns";
import type { Barbershop } from "@/lib/definitions";
import { fetchJson } from "@/lib/fetcher";

function RealtimeAuthGuard({ children }: { children: React.ReactNode }) {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { user, signOut, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [barbershopData, setBarbershopData] = useState<Barbershop | null>(null);
  const [isLoadingBarbershop, setIsLoadingBarbershop] = useState(false);
  const [isHandlingRemoval, setIsHandlingRemoval] = useState(false);

  const handleBarbershopRemoval = useCallback(
    async (message?: string) => {
      if (isHandlingRemoval) return;
      setIsHandlingRemoval(true);
      try {
        await signOut();
      } catch (error) {
        console.error("Erro ao deslogar apos remocao da barbearia:", error);
      } finally {
        toast({
          variant: "destructive",
          title: "Barbearia removida",
          description: message ?? "Sua conta foi desconectada porque a barbearia nao existe mais.",
        });
        router.push("/auth/admin/login");
      }
    },
    [isHandlingRemoval, signOut, toast, router]
  );

  const loadBarbershop = useCallback(
    async (options?: { silent?: boolean }) => {
    if (isAuthLoading || isBarbershopIdLoading) return;
    if (!barbershopId) {
      setBarbershopData(null);
      if (!options?.silent) setIsLoadingBarbershop(false);
      if (user) {
        await handleBarbershopRemoval("A barbearia vinculada a esta conta foi removida.");
      }
      return;
    }
    if (!options?.silent) setIsLoadingBarbershop(true);
    try {
      const response = await fetchJson<{ data: Barbershop }>(`/api/barbershops/${encodeURIComponent(barbershopId)}`);
      setBarbershopData(response.data ?? null);
      if (!response.data && user) {
        await handleBarbershopRemoval("A barbearia vinculada a esta conta foi removida.");
      }
    } catch (error: any) {
      const message = (error?.message || "").toLowerCase();
      if (message.includes("barbearia") && message.includes("encontrada")) {
        await handleBarbershopRemoval("A barbearia vinculada a esta conta foi removida.");
        return;
      }
      console.error("Erro ao carregar barbearia:", error);
      setBarbershopData(null);
    } finally {
      if (!options?.silent) setIsLoadingBarbershop(false);
    }
    },
    [barbershopId, handleBarbershopRemoval, isAuthLoading, isBarbershopIdLoading, user]
  );

  useEffect(() => {
    void loadBarbershop();
  }, [loadBarbershop]);

  useEffect(() => {
    const handler = () => {
      void loadBarbershop({ silent: true });
    };
    const storageHandler = (event: StorageEvent) => {
      if (event.key === "barbershop-updated") {
        handler();
      }
    };
    window.addEventListener("barbershop-updated", handler as EventListener);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("barbershop-updated", handler as EventListener);
      window.removeEventListener("storage", storageHandler);
    };
  }, [loadBarbershop, router]);

  useEffect(() => {
    const onFocus = () => {
      void loadBarbershop({ silent: true });
    };
    const intervalId = window.setInterval(() => {
      void loadBarbershop({ silent: true });
    }, 60000);

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(intervalId);
    };
  }, [loadBarbershop]);

  // Ao trocar de aba/rota dentro do dashboard, revalida plano/status da barbearia
  useEffect(() => {
    if (!barbershopId) return;
    void loadBarbershop();
  }, [pathname, barbershopId, loadBarbershop]);

  useEffect(() => {
    if (!barbershopData || !user) return;

    const handleSignOut = () => {
      signOut().then(() => {
        toast({
          variant: "destructive",
          title: "Plano inativo ou vencido",
          description: "Sua assinatura foi desativada. Reative um plano ou fale com o suporte.",
        });
        router.push("/auth/admin/login");
      });
    };

    if (barbershopData.status === "Inativa") {
      handleSignOut();
      return;
    }

    const expiryDate = barbershopData.expiryDate ? new Date(barbershopData.expiryDate) : null;
    if (expiryDate && isBefore(expiryDate, startOfDay(new Date())) && barbershopData.status !== "Inativa") {
      handleSignOut();
    }
  }, [barbershopData, signOut, toast, router, user]);

  if (isBarbershopIdLoading || isLoadingBarbershop) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Carregando dados da barbearia...</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <BarbershopIdProvider>
        <AdminSidebar />
        <SessionTimeout />
        <MessageTemplatesProvider>
          <RouteGuard>
            <RealtimeAuthGuard>{children}</RealtimeAuthGuard>
          </RouteGuard>
        </MessageTemplatesProvider>
      </BarbershopIdProvider>
    </SidebarProvider>
  );
}
