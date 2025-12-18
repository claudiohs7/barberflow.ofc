
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/icons/logo";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function ClientNav() {
  const { signOut } = useAuth();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = () => {
    signOut()
      .then(() => {
        try {
          localStorage.removeItem("impersonatedBarbershopId");
        } catch (e) {
          console.warn("Could not access localStorage. Impersonation state may persist.");
        }
        toast({
          title: "Logout bem-sucedido!",
          description: "Você foi desconectado com segurança.",
        });
        router.push("/auth/client/login");
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Erro ao Sair",
          description: "Não foi possível fazer logout. Tente novamente.",
        });
      });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/client/dashboard" className="mr-6 flex items-center space-x-2">
            <Logo className="h-6 w-6 text-primary" />
            <span className="font-bold">BarberFlow</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.name?.charAt(0) || 'C'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.displayName || "Cliente"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
               <DropdownMenuItem asChild>
                <Link href="/client/dashboard/my-appointments">Meus Agendamentos</Link>
              </DropdownMenuItem>
               <DropdownMenuItem asChild>
                <Link href="/client/dashboard/settings">Configurações</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
