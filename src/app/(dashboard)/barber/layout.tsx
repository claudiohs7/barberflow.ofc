import { SidebarProvider } from "@/components/ui/sidebar";
import { BarberSidebar } from "@/components/layout/barber-sidebar";
import { RouteGuard } from "@/components/route-guard";

export default function BarberDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <BarberSidebar />
        <RouteGuard>
            {children}
        </RouteGuard>
    </SidebarProvider>
  );
}
