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

  useEffect(() => {
    let isMounted = true;
    if (!barbershopId) {
      setBarbershopData(null);
      return;
    }
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
      });

    return () => {
      isMounted = false;
    };
  }, [barbershopId]);

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
    return (
    <SidebarMenuItem key={item.label}>
      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={{ children: item.label }}>
        <Link href={item.href} className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Icon suppressHydrationWarning />
            <span>{item.label}</span>
          </div>
          {item.isPremium && barbershopData?.plan === "Básico" && (
            <div className="flex items-center gap-1 text-yellow-500">
              <Crown className="h-3 w-3" suppressHydrationWarning />
            </div>
          )}
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
