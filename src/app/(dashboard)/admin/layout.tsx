"use client";

import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { MessageTemplatesProvider } from "@/context/MessageTemplatesContext";
import { BarbershopIdProvider, useBarbershopId } from "@/context/BarbershopIdContext";
import { SessionTimeout } from "@/components/session-timeout";
import { RouteGuard } from "@/components/route-guard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { isBefore, startOfDay } from "date-fns";
import type { Barbershop } from "@/lib/definitions";
import { fetchJson } from "@/lib/fetcher";

function RealtimeAuthGuard({ children }: { children: React.ReactNode }) {
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [barbershopData, setBarbershopData] = useState<Barbershop | null>(null);
  const [isLoadingBarbershop, setIsLoadingBarbershop] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!barbershopId) {
      setBarbershopData(null);
      setIsLoadingBarbershop(false);
      return;
    }
    setIsLoadingBarbershop(true);
    fetchJson<{ data: Barbershop[] }>(`/api/barbershops?ownerId=${encodeURIComponent(barbershopId)}`)
      .then((response) => {
        if (isMounted) {
          setBarbershopData(response.data?.[0] ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBarbershopData(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingBarbershop(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [barbershopId]);

  useEffect(() => {
    if (!barbershopData || !user) return;

    const handleSignOut = () => {
      signOut().then(() => {
        toast({
          variant: "destructive",
          title: "Plano Inativo",
          description: "Sua assinatura está inativa. Por favor, contate o suporte.",
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
