"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Bell, Eye, X } from "lucide-react";
import { PopoverClose } from "@radix-ui/react-popover";

import { useAuth } from "@/context/AuthContext";
import { fetchJson } from "@/lib/fetcher";
import type { Barbershop, SystemMessage } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

function safeJsonParseArray(value: string | null) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getLocalStorageIds(key: string) {
  if (typeof window === "undefined") return [] as string[];
  return safeJsonParseArray(window.localStorage.getItem(key)).filter((item) => typeof item === "string");
}

function setLocalStorageIds(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
}

function addLocalStorageId(key: string, id: string) {
  if (typeof window === "undefined") return;
  const current = getLocalStorageIds(key);
  if (current.includes(id)) return;
  window.localStorage.setItem(key, JSON.stringify([...current, id]));
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
  const [viewingMessage, setViewingMessage] = useState<SystemMessage | null>(null);

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
        // ignore
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
        if (!isMounted) return;
        const dismissed = getLocalStorageIds("dismissedSystemMessages");
        const messages = (response.data || []).filter((msg) => !dismissed.includes(msg.id));
        setSystemMessages(messages);
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
    if (!systemMessages.length) {
      setNewMessagesCount(0);
      return;
    }
    const seenMessages = getLocalStorageIds("seenSystemMessages");
    const dismissedMessages = getLocalStorageIds("dismissedSystemMessages");
    setNewMessagesCount(
      systemMessages.filter((msg) => !seenMessages.includes(msg.id) && !dismissedMessages.includes(msg.id)).length
    );
  }, [systemMessages]);

  const handleNotificationsOpen = () => {
    if (!systemMessages.length) return;
    const messageIds = systemMessages.map((msg) => msg.id);
    const seenMessages = getLocalStorageIds("seenSystemMessages");
    setLocalStorageIds("seenSystemMessages", [...seenMessages, ...messageIds]);
    setNewMessagesCount(0);
  };

  const handleDismissMessage = (messageId: string) => {
    addLocalStorageId("seenSystemMessages", messageId);
    addLocalStorageId("dismissedSystemMessages", messageId);
    setSystemMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const handleSignOut = () => {
    signOut()
      .then(() => {
        toast({
          title: "Logout bem-sucedido!",
          description: "Voce foi desconectado com seguranca.",
        });
        router.push(isSuperAdmin ? "/super-admin/login" : "/auth/admin/login");
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Erro ao sair",
          description: "Nao foi possivel fazer logout. Tente novamente.",
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
  const isLoading = isAuthLoading || isLoadingBarbershop;

  return (
    <div className="flex items-center gap-2">
      {!isSuperAdmin && (
        <Popover onOpenChange={(open) => open && handleNotificationsOpen()}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-full">
              <Bell
                className={cn(
                  "h-6 w-6 transition-transform duration-200",
                  newMessagesCount > 0 ? "text-primary" : ""
                )}
              />
              {newMessagesCount > 0 && (
                <>
                  <span className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive animate-ping" />
                  <span className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground shadow-lg">
                    {newMessagesCount}
                  </span>
                </>
              )}
              <span className="sr-only">Notificacoes</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Notificacoes</h4>
                  <p className="text-sm text-muted-foreground">Ultimos avisos do sistema.</p>
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
                ) : systemMessages.length > 0 ? (
                  systemMessages.map((message) => (
                    <div key={message.id} className="relative group text-sm p-2 pr-12 bg-muted/50 rounded-md">
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingMessage(message);
                          }}
                          className="p-1 rounded-full text-muted-foreground hover:bg-background/50"
                          aria-label="Ver aviso"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissMessage(message.id);
                          }}
                          className="p-1 rounded-full text-muted-foreground hover:bg-background/50"
                          aria-label="Dispensar notificacao"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum aviso encontrado.</p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Dialog open={!!viewingMessage} onOpenChange={(open) => (!open ? setViewingMessage(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aviso do sistema</DialogTitle>
            <DialogDescription>Mensagem enviada pelo BarberFlow.</DialogDescription>
          </DialogHeader>
          <div className="text-sm whitespace-pre-wrap break-words">{viewingMessage?.content || ""}</div>
        </DialogContent>
      </Dialog>

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
                <Link href="/admin/dashboard/settings">Configuracoes</Link>
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

