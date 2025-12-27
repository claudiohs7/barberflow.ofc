'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons/logo';
import {
  LayoutDashboard,
  Store,
  Ticket,
  Bell,
  Youtube,
  Image as ImageIcon,
  LogOut,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type MenuItem = {
  label: string;
  href?: string;
  icon?: any;
  children?: { label: string; href: string }[];
};

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [whatsappStatus, setWhatsappStatus] = useState<string | null>(null);

  const menuItems: MenuItem[] = [
    { href: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/super-admin/dashboard/barbershops', label: 'Barbearias', icon: Store },
    { href: '/super-admin/dashboard/tickets', label: 'Tickets', icon: Ticket },
    { href: '/super-admin/dashboard/announcements', label: 'Avisos', icon: Bell },
    { href: '/super-admin/dashboard/appearance', label: 'Aparencia', icon: ImageIcon },
    { href: '/super-admin/dashboard/tutorials', label: 'Tutoriais', icon: Youtube },
    // WhatsApp group será renderizado separado mais abaixo
  ];

  useEffect(() => {
    let isMounted = true;
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/super-admin/admin-whatsapp/settings");
        const json = await res.json();
        if (!isMounted) return;
        if (json?.data?.whatsappStatus) {
          setWhatsappStatus(json.data.whatsappStatus);
        }
      } catch (err) {
        if (isMounted) console.warn("Falha ao carregar status do WhatsApp admin", err);
      }
    };
    void loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  const statusDot = (status?: string | null) => {
    const isConnected = status === "CONNECTED";
    const isDisconnected = status === "DISCONNECTED";
    const color = isConnected ? "bg-emerald-500" : isDisconnected ? "bg-red-500" : "bg-amber-400";
    const pulse = isConnected ? "animate-ping" : "";
    return (
      <span className="ml-2 inline-flex h-4 w-4 items-center justify-center">
        {isConnected && (
          <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${pulse} ${color} opacity-75`} />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
      </span>
    );
  };

  const handleSignOut = () => {
    signOut()
      .then(() => {
        try {
          localStorage.removeItem('impersonatedBarbershopId');
        } catch {
          /* ignore */
        }
        toast({
          title: 'Logout bem-sucedido!',
          description: 'Voce foi desconectado com seguranca.',
        });
        router.push('/super-admin/login');
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Erro ao sair',
          description: 'Nao foi possivel fazer logout. Tente novamente.',
        });
      });
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/super-admin/dashboard" className="flex items-center gap-2">
          <Logo className="h-7 w-7 text-primary" />
          <span className="text-lg font-semibold font-headline">Super Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-4 pt-2 pb-1">
          <div className="h-px bg-border/60" />
        </div>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
              >
                <Link href={item.href!} className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    {item.icon ? <item.icon /> : null}
                    <span>{item.label}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          <div className="mt-6 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp</span>
            </div>
            <div className="pl-4 space-y-1">
              <SidebarMenuButton
                asChild
                isActive={pathname === '/super-admin/dashboard/integrations'}
                tooltip={{ children: 'Disparos' }}
              >
                <Link href="/super-admin/dashboard/integrations" className="flex items-center gap-2 text-sm">
                  <span>Disparos</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/super-admin/dashboard/whatsapp'}
                tooltip={{ children: 'WhatsApp' }}
              >
                <Link href="/super-admin/dashboard/whatsapp" className="flex items-center gap-2 text-sm">
                  <span>WhatsApp</span>
                  <div className="flex items-center">{statusDot(whatsappStatus)}</div>
                </Link>
              </SidebarMenuButton>
            </div>
          </div>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
