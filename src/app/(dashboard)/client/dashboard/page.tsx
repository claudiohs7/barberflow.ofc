"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Barbershop, Client } from "@/lib/definitions";
import { fetchJson } from "@/lib/fetcher";
import { MapPin, History, Search, Loader2, Calendar as CalendarIcon, Star } from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const cardPlaceholder = (
  <div className="text-sm text-muted-foreground text-center">Nenhuma barbearia encontrada.</div>
);

export default function ClientDashboardHomePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [userCity, setUserCity] = useState<string | null>(null);
  const [isLoadingCity, setIsLoadingCity] = useState(true);

  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [isLoadingBarbershops, setIsLoadingBarbershops] = useState(true);

  const [clientProfile, setClientProfile] = useState<Client | null>(null);
  const [favoriteBarbershops, setFavoriteBarbershops] = useState<Set<string>>(new Set());
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const displayName = user?.name?.split(" ")[0] || "Cliente";

  useEffect(() => {
    const fetchUserCity = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetchJson<{ city: string }>(`/api/geolocate?lat=${latitude}&lon=${longitude}`, {
              credentials: "omit",
            });
            setUserCity(response.city);
          } catch (error) {
            console.error("Falha ao buscar cidade por coordenadas:", error);
          } finally {
            setIsLoadingCity(false);
          }
        },
        async () => {
          try {
            const response = await fetchJson<{ city: string }>("/api/geolocate", { credentials: "omit" });
            setUserCity(response.city);
          } catch (ipError) {
            console.error("Falha ao buscar cidade via IP:", ipError);
          } finally {
            setIsLoadingCity(false);
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    };
    fetchUserCity();
  }, []);

  useEffect(() => {
    const loadBarbershops = async () => {
      setIsLoadingBarbershops(true);
      try {
        const response = await fetchJson<{ data: Barbershop[] }>("/api/barbershops", { credentials: "omit" });
        setBarbershops(response.data || []);
      } catch (error: any) {
        console.error("Falha ao carregar barbearias:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível listar as barbearias." });
      } finally {
        setIsLoadingBarbershops(false);
      }
    };
    loadBarbershops();
  }, [toast]);

  useEffect(() => {
    if (!user?.id) {
      setClientProfile(null);
      setIsLoadingProfile(false);
      return;
    }
    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const response = await fetchJson<{ data: Client[] }>(`/api/clients?userId=${user.id}`, {
          credentials: "omit",
        });
        const profile = response.data?.[0] || null;
        setClientProfile(profile);
        setFavoriteBarbershops(new Set(profile?.favoriteBarbershops || []));
      } catch (error: any) {
        console.error("Erro ao carregar perfil do cliente:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível recuperar seus favoritos." });
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [toast, user]);

  const filteredAndSortedBarbershops = useMemo(() => {
    if (!barbershops.length) return [];
    let shops = [...barbershops];
    if (searchTerm) {
      const normalized = searchTerm.toLowerCase();
      shops = shops.filter(
        (shop) =>
          shop.name.toLowerCase().includes(normalized) ||
          (shop.address?.city?.toLowerCase().includes(normalized) ?? false)
      );
    }
    shops.sort((a, b) => {
      const aIsFavorite = favoriteBarbershops.has(a.id);
      const bIsFavorite = favoriteBarbershops.has(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      if (userCity && !searchTerm) {
        const aIsLocal = a.address?.city?.toLowerCase() === userCity.toLowerCase();
        const bIsLocal = b.address?.city?.toLowerCase() === userCity.toLowerCase();
        if (aIsLocal && !bIsLocal) return -1;
        if (!aIsLocal && bIsLocal) return 1;
      }
      return a.name.localeCompare(b.name);
    });
    return shops;
  }, [barbershops, favoriteBarbershops, searchTerm, userCity]);

  const handleFavoriteToggle = async (shopId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Ação necessária",
        description: "Faça login para favoritar barbearias.",
      });
      return;
    }
    setIsUpdatingFavorite(true);
    try {
      let profile = clientProfile;
      if (!profile) {
        const created = await fetchJson<{ data: Client }>("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barbershopId: shopId,
            name: user.name || "Cliente",
            phone: user.phone ?? "",
            email: user.email,
            userId: user.id,
            favoriteBarbershops: [shopId],
          }),
          credentials: "omit",
        });
        profile = created.data;
        setClientProfile(profile);
        setFavoriteBarbershops(new Set(profile.favoriteBarbershops || []));
        toast({ description: "Adicionado aos favoritos!" });
        return;
      }
      const nextFavorites = new Set(favoriteBarbershops);
      const isFavorite = nextFavorites.has(shopId);
      if (isFavorite) {
        nextFavorites.delete(shopId);
      } else {
        nextFavorites.add(shopId);
      }
      setFavoriteBarbershops(new Set(nextFavorites));
      await fetchJson<{ data: Client }>(`/api/clients/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteBarbershops: Array.from(nextFavorites) }),
        credentials: "omit",
      });
      setClientProfile({ ...profile, favoriteBarbershops: Array.from(nextFavorites) });
      toast({ description: isFavorite ? "Removido dos favoritos." : "Adicionado aos favoritos!" });
    } catch (error: any) {
      console.error("Erro ao atualizar favoritos:", error);
      setFavoriteBarbershops(new Set(clientProfile?.favoriteBarbershops || []));
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível atualizar favoritos." });
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  const isLoading =
    isLoadingBarbershops || isLoadingCity || isAuthLoading || isLoadingProfile || isUpdatingFavorite;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">Buscando barbearias perto de você...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <div className="flex justify-center items-center gap-4">
          <h1 className="text-4xl font-bold font-headline mb-2">Olá, {displayName}!</h1>
          <Button asChild>
            <Link href="/client/dashboard/my-appointments">
              <History className="mr-2 h-4 w-4" />
              Meus Agendamentos
            </Link>
          </Button>
        </div>
        <p className="text-lg text-muted-foreground">
          {userCity && !searchTerm ? `Encontramos barbearias em ${userCity}.` : "Selecione uma barbearia para agendar."}
        </p>
        <div className="max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou cidade..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedBarbershops.length > 0
          ? filteredAndSortedBarbershops.map((shop) => (
              <Card key={shop.id} className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 relative">
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute top-2 right-2 z-10 text-muted-foreground hover:text-amber-400",
                      favoriteBarbershops.has(shop.id) && "text-amber-400"
                    )}
                    onClick={() => handleFavoriteToggle(shop.id)}
                  >
                    <Star className={cn("h-5 w-5", favoriteBarbershops.has(shop.id) && "fill-amber-400 text-amber-400")} />
                  </Button>
                )}
                <CardHeader className="p-0">
                  <div className="h-40 bg-muted flex items-center justify-center">
                    <Avatar className="h-24 w-24 border-4 border-background">
                      <AvatarImage src={shop.logoUrl} alt={shop.name} />
                      <AvatarFallback>{shop.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                </CardHeader>
                <CardContent className="p-6 text-center">
                  <CardTitle className="font-headline">{shop.name}</CardTitle>
                  <CardDescription className="mt-2 flex items-center justify-center gap-2 text-xs">
                    <MapPin className="h-3 w-3" />
                    {shop.address?.city && shop.address?.state
                      ? `${shop.address.city}, ${shop.address.state}`
                      : "Endereço não informado"}
                  </CardDescription>
                </CardContent>
                <CardFooter className="p-4 bg-muted/50">
                  <Button asChild className="w-full">
                        <Link href={`/agendar/${shop.id || slugify(shop.name)}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Agendar
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))
          : cardPlaceholder}
      </div>

      {filteredAndSortedBarbershops.length === 0 && !isLoading && <div className="text-center text-muted-foreground py-16">{cardPlaceholder}</div>}
    </div>
  );
}
