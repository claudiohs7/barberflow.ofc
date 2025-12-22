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
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [barbershopData, setBarbershopData] = useState<Barbershop | null>(null);
  const [isLoadingBarbershop, setIsLoadingBarbershop] = useState(false);

  const loadBarbershop = useCallback(async () => {
    if (!barbershopId) {
      setBarbershopData(null);
      setIsLoadingBarbershop(false);
      return;
    }
    setIsLoadingBarbershop(true);
    try {
      const response = await fetchJson<{ data: Barbershop[] }>(
        `/api/barbershops?ownerId=${encodeURIComponent(barbershopId)}`
      );
      setBarbershopData(response.data?.[0] ?? null);
    } catch {
      setBarbershopData(null);
    } finally {
      setIsLoadingBarbershop(false);
    }
  }, [barbershopId]);

  useEffect(() => {
    void loadBarbershop();
  }, [loadBarbershop]);

  useEffect(() => {
    const handler = () => {
      void loadBarbershop();
      // força recomputar dados de página/rotas para refletir o que o super admin mudou
      router.refresh();
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
  }, [loadBarbershop]); // router.refresh is stable; kept out to avoid dependency-size variation

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





