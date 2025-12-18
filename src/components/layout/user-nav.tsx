"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/fetcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PopoverClose } from "@radix-ui/react-popover";
import { Bell, X } from "lucide-react";
import type { Barbershop, SystemMessage } from "@/lib/definitions";

function getInitials(name: string = ""): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "..."
  );
}

export function UserNav() {
  const { user, isLoading: isAuthLoading, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [barbershopData, setBarbershopData] = useState<Barbershop | null>(null);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [isLoadingBarbershop, setIsLoadingBarbershop] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  const isSuperAdmin = user?.role === "SUPERADMIN";

  useEffect(() => {
    let isMounted = true;
    if (!user || isSuperAdmin) {
      setBarbershopData(null);
      setIsLoadingBarbershop(false);
      return;
    }
    setIsLoadingBarbershop(true);
    fetchJson<{ data: Barbershop[] }>(`/api/barbershops?ownerId=${encodeURIComponent(user.id)}`)
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
  }, [isSuperAdmin, user]);

  useEffect(() => {
    if (isSuperAdmin) return;

    const handleBarbershopUpdated = (event: CustomEvent) => {
      const payload = event?.detail;
      if (payload?.id) {
        setBarbershopData(payload as Barbershop);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "barbershop-updated" || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        if (payload?.id) {
          setBarbershopData(payload as Barbershop);
        }
      } catch {
        // ignore parse errors
      }
    };

    window.addEventListener("barbershop-updated", handleBarbershopUpdated as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("barbershop-updated", handleBarbershopUpdated as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    let isMounted = true;
    fetchJson<{ data: SystemMessage[] }>("/api/announcements?limit=5")
      .then((response) => {
        if (isMounted) {
          setSystemMessages(response.data || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSystemMessages([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (systemMessages.length === 0) {
      setNewMessagesCount(0);
      return;
    }
    const seenMessages: string[] = JSON.parse(
      typeof window !== "undefined" ? localStorage.getItem("seenSystemMessages") || "[]" : "[]"
    );
    const count = systemMessages.filter((msg) => !seenMessages.includes(msg.id)).length;
    setNewMessagesCount(count);
  }, [systemMessages]);

  const handleNotificationsOpen = () => {
    if (!systemMessages.length) return;
    const messageIds = systemMessages.map((msg) => msg.id);
    const seenMessages: string[] = JSON.parse(localStorage.getItem("seenSystemMessages") || "[]");
    const newSeen = [...new Set([...seenMessages, ...messageIds])];
    localStorage.setItem("seenSystemMessages", JSON.stringify(newSeen));
    setNewMessagesCount(0);
  };

  const handleDismissMessage = (messageId: string) => {
    const seenMessages: string[] = JSON.parse(localStorage.getItem("seenSystemMessages") || "[]");
    if (!seenMessages.includes(messageId)) {
      const updated = [...seenMessages, messageId];
      localStorage.setItem("seenSystemMessages", JSON.stringify(updated));
      const remaining = systemMessages.filter((msg) => !updated.includes(msg.id)).length;
      setNewMessagesCount(remaining);
    }
  };

  const handleSignOut = () => {
    signOut()
      .then(() => {
        toast({
          title: "Logout bem-sucedido!",
          description: "Você foi desconectado com segurança.",
        });
        router.push(isSuperAdmin ? "/super-admin/login" : "/auth/admin/login");
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Erro ao Sair",
          description: "Não foi possível fazer logout. Tente novamente.",
        });
      });
  };

  const displayName = useMemo(() => {
    if (isSuperAdmin) return "Super Admin";
    if (barbershopData?.name) return barbershopData.name;
    if (user?.name) return user.name;
    return "Carregando...";
  }, [barbershopData, isSuperAdmin, user?.name]);

  const displayEmail = user?.email || "";
  const displayLogo = isSuperAdmin ? null : barbershopData?.logoUrl;
  const unseenMessages = useMemo(() => {
    if (!systemMessages.length) return [];
    if (typeof window === "undefined") return systemMessages;
    const seen: string[] = JSON.parse(localStorage.getItem("seenSystemMessages") || "[]");
    return systemMessages.filter((msg) => !seen.includes(msg.id));
  }, [systemMessages]);

  const isLoading = isAuthLoading || isLoadingBarbershop;

  return (
    <div className="flex items-center gap-2">
      {!isSuperAdmin && (
        <Popover onOpenChange={(open) => open && handleNotificationsOpen()}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
              <Bell className="h-5 w-5" />
              {newMessagesCount > 0 && (
                <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                  {newMessagesCount}
                </span>
              )}
              <span className="sr-only">Notificações</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Notificações</h4>
                  <p className="text-sm text-muted-foreground">Últimos avisos do sistema.</p>
                </div>
                <PopoverClose asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <X className="h-4 w-4" />
                  </Button>
                </PopoverClose>
              </div>
              <div className="grid gap-2">
                {isLoadingMessages ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : unseenMessages.length > 0 ? (
                  unseenMessages.map((message) => (
                    <div key={message.id} className="relative group text-sm p-2 pr-8 bg-muted/50 rounded-md">
                      {message.content}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissMessage(message.id);
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full text-muted-foreground hover:bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Dispensar notificação"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum aviso novo.</p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-12 w-12 rounded-full transition-all duration-300 hover:scale-110 hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background"
          >
            <Avatar className="h-12 w-12">
              {displayLogo ? (
                <AvatarImage src={displayLogo} alt={displayName} />
              ) : (
                user?.photoURL && <AvatarImage src={user.photoURL} alt={displayName} />
              )}
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount sideOffset={12}>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{isLoading ? "Carregando..." : displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">{isLoading ? "" : displayEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!isSuperAdmin && (
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard/settings">Configurações</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
