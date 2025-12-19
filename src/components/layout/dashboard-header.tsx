
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import Link from 'next/link';
import { Logo } from '../icons/logo';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 pb-4">
       <SidebarTrigger />
        <div className="flex items-center gap-2 sm:hidden">
            <Logo className="h-6 w-6 text-primary" />
            <span className="font-bold">BarberFlow</span>
        </div>
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* Can add a search bar here if needed */}
      </div>
      <div className="flex items-center gap-4 md:ml-auto md:grow-0 mt-4">
        <UserNav />
      </div>
    </header>
  );
}
