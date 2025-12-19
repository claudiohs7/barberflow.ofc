
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default function AdminDashboardContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarInset>
      <div className="flex flex-col pt-4">
        <DashboardHeader />
        <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
      </div>
    </SidebarInset>
  );
}
