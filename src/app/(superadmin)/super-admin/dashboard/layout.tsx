'use client';

import { SuperAdminSidebar } from '@/components/layout/super-admin-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { RouteGuard } from "@/components/route-guard";
import { MessageTemplatesProvider } from '@/context/MessageTemplatesContext';

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard>
      <SidebarProvider>
        <SuperAdminSidebar />
        <SidebarInset>
          <MessageTemplatesProvider>
            <DashboardHeader />
            <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
          </MessageTemplatesProvider>
        </SidebarInset>
      </SidebarProvider>
    </RouteGuard>
  );
}
