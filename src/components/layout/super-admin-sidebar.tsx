
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Webhook,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const menuItems = [
    {
      href: '/super-admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/super-admin/dashboard/barbershops',
      label: 'Barbearias',
      icon: Store,
    },
    {
      href: '/super-admin/dashboard/tickets',
      label: 'Tickets',
      icon: Ticket,
    },
    {
      href: '/super-admin/dashboard/announcements',
      label: 'Avisos',
      icon: Bell,
    },
    {
      href: '/super-admin/dashboard/integrations',
      label: 'Integrações',
      icon: Webhook,
    },
  ];

  const handleSignOut = () => {
    signOut()
      .then(() => {
        try {
          localStorage.removeItem('impersonatedBarbershopId');
        } catch (e) {
          console.warn(
            'Could not access localStorage. Impersonation state may persist.'
          );
        }
        toast({
          title: 'Logout bem-sucedido!',
          description: 'Você foi desconectado com segurança.',
        });
        router.push('/super-admin/login');
      })
      .catch((error) => {
        toast({
          variant: 'destructive',
          title: 'Erro ao sair',
          description: 'Não foi possível fazer logout. Tente novamente.',
        });
      });
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/super-admin/dashboard" className="flex items-center gap-2">
          <Logo className="h-7 w-7 text-primary" />
          <span className="text-lg font-semibold font-headline">
            Super Admin
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
              >
                <Link
                  href={item.href}
                  className="flex justify-between items-center w-full"
                >
                  <div className="flex items-center gap-2">
                    {item.icon ? <item.icon /> : null}
                    <span>{item.label}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
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
