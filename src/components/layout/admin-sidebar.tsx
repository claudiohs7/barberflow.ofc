"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons/logo";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  Settings,
  Contact,
  TrendingDown,
  Crown,
  CreditCard,
  Youtube,
  History,
  FileText,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import type { Barbershop } from "@/lib/definitions";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { SupportAgentIcon } from "@/components/icons/support-agent-icon";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetcher";

export function AdminSidebar() {
  const pathname = usePathname();
  const { barbershopId } = useBarbershopId();
  const { signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [barbershopData, setBarbershopData] = useState<Barbershop | null>(null);
  const [newScheduleCount, setNewScheduleCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!barbershopId) {
      setBarbershopData(null);
      return;
    }

    const load = () =>
      fetchJson<{ data: Barbershop | null }>(`/api/barbershops/${encodeURIComponent(barbershopId)}`)
        .then((response) => {
          if (isMounted) {
            setBarbershopData(response.data ?? null);
          }
        })
        .catch(() => {
          if (isMounted) {
            setBarbershopData(null);
          }
        });

    // Faz uma leitura pontual (ao carregar ou trocar de rota).
    // Se estiver na aba de WhatsApp, o status será atualizado na navegação; sem polling.
    if (pathname.startsWith("/admin/dashboard/whatsapp")) {
      void load();
    } else if (!barbershopData) {
      // Garantir um estado inicial na primeira carga.
      void load();
    }

    return () => {
      isMounted = false;
    };
  }, [barbershopId, pathname, barbershopData]);

  useEffect(() => {
    if (!barbershopId) return;
    const key = `schedule:lastSeen:${barbershopId}`;
    const existing = localStorage.getItem(key);
    if (!existing) {
      localStorage.setItem(key, new Date().toISOString());
    }
  }, [barbershopId]);

  useEffect(() => {
    if (!barbershopId) return;
    const isSchedulePage = pathname.startsWith("/admin/dashboard/schedule");
    const key = `schedule:lastSeen:${barbershopId}`;

    if (isSchedulePage) {
      localStorage.setItem(key, new Date().toISOString());
      setNewScheduleCount(0);
      return;
    }

    let isCancelled = false;
    const fetchNewAppointments = async () => {
      const since = localStorage.getItem(key);
      if (!since) return;
      try {
        const res = await fetch(
          `/api/appointments?barbershopId=${encodeURIComponent(barbershopId)}&createdAfter=${encodeURIComponent(since)}`
        );
        const json = await res.json().catch(() => ({ data: [] }));
        const list = Array.isArray((json as any)?.data) ? (json as any).data : [];
        const count = list.filter((appt: any) => appt?.createdBy === "client").length;
        if (!isCancelled) setNewScheduleCount(count);
      } catch (error) {
        if (!isCancelled) setNewScheduleCount(0);
      }
    };

    void fetchNewAppointments();
    const intervalId = setInterval(fetchNewAppointments, 30000);
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [barbershopId, pathname]);

  const menuItems = {
    barbearia: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/dashboard/schedule", label: "Agenda", icon: Calendar },
      { href: "/admin/dashboard/schedule-history", label: "Histórico", icon: History },
      { href: "/admin/dashboard/services", label: "Serviços", icon: Scissors },
      { href: "/admin/dashboard/barbers", label: "Barbeiros", icon: Users },
      { href: "/admin/dashboard/clients", label: "Clientes", icon: Contact },
    ],
    gestao: [
      { href: "/admin/dashboard/expenses", label: "Despesas", icon: TrendingDown },
      { href: "/admin/dashboard/subscription", label: "Plano e Assinatura", icon: CreditCard },
    ],
    automacao: [
      { href: "/admin/dashboard/whatsapp", label: "WhatsApp", icon: WhatsAppIcon, isPremium: true },
      { href: "/admin/dashboard/whatsapp-templates", label: "Templates", icon: FileText, isPremium: true },
      { href: "/admin/dashboard/whatsapp-reports", label: "Relatórios de Disparo", icon: History, isPremium: true },
    ],
    ajuda: [
      { href: "/admin/dashboard/tutorials", label: "Tutoriais", icon: Youtube },
      { href: "/admin/dashboard/support", label: "Suporte", icon: SupportAgentIcon },
    ],
    config: [{ href: "/admin/dashboard/settings", label: "Configurações", icon: Settings }],
  };

  const handleSignOut = () => {
    signOut()
      .then(() => {
        toast({
          title: "Logout bem-sucedido!",
          description: "Você foi desconectado com segurança.",
        });
        router.push("/auth/admin/login");
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Erro ao Sair",
          description: "Não foi possível fazer logout. Tente novamente.",
        });
      });
  };

  const renderMenuItem = (item: any) => {
    const Icon = item.icon;
    const isWhatsApp = item.href === "/admin/dashboard/whatsapp";
    const isWhatsAppReports = item.href === "/admin/dashboard/whatsapp-reports";
    const isSchedule = item.href === "/admin/dashboard/schedule";
    const isBasicPlan = (barbershopData?.plan || "").toLowerCase().startsWith("b");
    const bitsafiraData = (barbershopData?.bitsafiraInstanceData || {}) as Record<string, any>;
    const rawBitsafiraStatus =
      bitsafiraData?.status ||
      bitsafiraData?.Status ||
      bitsafiraData?.connectionStatus ||
      bitsafiraData?.conexao ||
      bitsafiraData?.connection_status;
    const derivedStatus = (() => {
      const status = barbershopData?.whatsappStatus;
      if (status) return status;

      const fromBitsafira = typeof rawBitsafiraStatus === "string" ? rawBitsafiraStatus.toUpperCase() : null;
      if (fromBitsafira?.includes("CONNECT")) return "CONNECTED";
      if (fromBitsafira?.includes("DISCONNECT") || fromBitsafira?.includes("DESCONECT")) return "DISCONNECTED";
      return "DISCONNECTED";
    })();
    const statusColor = derivedStatus === "CONNECTED" ? "bg-emerald-500" : "bg-rose-500";
    const statusTitle = derivedStatus === "CONNECTED" ? "WhatsApp conectado" : "WhatsApp desconectado";

    // Esconde relatórios no plano Básico
    if (isBasicPlan && isWhatsAppReports) return null;

    return (
      <SidebarMenuItem key={item.label}>
        <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={{ children: item.label }}>
          <Link href={item.href} className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Icon suppressHydrationWarning />
              <span>{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {isSchedule && newScheduleCount > 0 && (
                <span className="inline-flex min-w-[1.5rem] justify-center rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-100">
                  {newScheduleCount}
                </span>
              )}
              {isBasicPlan && isWhatsApp && (
                <span className="rounded-full bg-yellow-500/15 border border-yellow-500/50 text-[10px] px-2 py-0.5 font-semibold uppercase text-yellow-400">
                  Premium
                </span>
              )}
              {isWhatsApp && !isBasicPlan &&
                (derivedStatus === "DISCONNECTED" ? (
                  <span className="relative inline-flex" suppressHydrationWarning>
                    <span className="absolute inline-flex h-4 w-4 rounded-full bg-rose-500 opacity-75 animate-ping" suppressHydrationWarning></span>
                    <AlertCircle className="relative h-4 w-4 text-rose-500 drop-shadow" title={statusTitle} suppressHydrationWarning />
                  </span>
                ) : (
                  <span className="relative inline-flex">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-500 opacity-75 animate-ping" />
                    <span
                      className={`relative h-2 w-2 rounded-full border border-emerald-900/50 shadow-sm ${statusColor}`}
                      title={statusTitle}
                    />
                  </span>
                ))}
              {item.isPremium && barbershopData?.plan === "B?sico" && (
                <div className="flex items-center gap-1 text-yellow-500">
                  <Crown className="h-3 w-3" suppressHydrationWarning />
                </div>
              )}
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Logo className="h-7 w-7 text-primary" />
          <span className="text-lg font-semibold font-headline">BarberFlow</span>
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Barbearia</SidebarGroupLabel>
          <SidebarMenu>{menuItems.barbearia.map(renderMenuItem)}</SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Automação</SidebarGroupLabel>
          <SidebarMenu>{menuItems.automacao.map(renderMenuItem)}</SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarMenu>{menuItems.gestao.map(renderMenuItem)}</SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarMenu>
          {menuItems.ajuda.map(renderMenuItem)}
          {menuItems.config.map(renderMenuItem)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip={{ children: "Sair" }}>
              <LogOut suppressHydrationWarning />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
