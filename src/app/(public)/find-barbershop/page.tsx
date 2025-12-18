
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, MapPin, Loader2, Search, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Barbershop } from "@/lib/definitions";
import { fetchJson } from "@/lib/fetcher";
import { slugify } from "@/lib/utils";
import Link from 'next/link';

export default function FindBarbershopPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [isLoadingBarbershops, setIsLoadingBarbershops] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchBarbershops = async () => {
      setIsLoadingBarbershops(true);
      setError(null);
      try {
        const response = await fetchJson<{ data: Barbershop[] }>("/api/barbershops", {
          signal: controller.signal,
          cache: "no-store",
        });
        setBarbershops(response.data ?? []);
      } catch (fetchError: any) {
        if (fetchError?.name === "AbortError") {
          return;
        }
        console.error("Erro ao carregar barbearias:", fetchError);
        setError("Não foi possível carregar as barbearias no momento.");
        setBarbershops([]);
      } finally {
        setIsLoadingBarbershops(false);
      }
    };

    void fetchBarbershops();
    return () => controller.abort();
  }, []);

  const filteredBarbershops = useMemo(() => {
    if (!searchTerm.trim()) return barbershops;
    const lowercasedTerm = searchTerm.toLowerCase();
    return barbershops.filter((shop) => {
      const city = shop.address?.city ?? "";
      const state = shop.address?.state ?? "";
      return (
        shop.name.toLowerCase().includes(lowercasedTerm) ||
        city.toLowerCase().includes(lowercasedTerm) ||
        state.toLowerCase().includes(lowercasedTerm)
      );
    });
  }, [barbershops, searchTerm]);


  if (isLoadingBarbershops) {
      return (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <Button variant="outline" asChild className="w-fit mx-auto sm:absolute sm:left-8 sm:top-28">
            <Link href="/client/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Voltar ao Menu
            </Link>
        </Button>
        <h1 className="text-4xl font-bold font-headline mb-2">Encontre sua Barbearia</h1>
        <p className="text-lg text-muted-foreground">Selecione uma barbearia abaixo ou pesquise pelo nome para iniciar seu agendamento.</p>
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

        {error && (
          <div className="text-center text-sm font-medium text-destructive">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBarbershops?.map(shop => (
            <Card key={shop.id} className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
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
                          : "EndereÇõo nÇœo informado"}
                    </CardDescription>
                </CardContent>
                <CardFooter className="p-4 bg-muted/50">
                     <Button asChild className="w-full">
                        <Link href={`/agendar/${slugify(shop.name)}`}>
                            <CalendarIcon className="mr-2 h-4 w-4"/>
                            Agendar
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        ))}
       </div>
       {filteredBarbershops.length === 0 && !isLoadingBarbershops && (
            <div className="text-center text-muted-foreground py-16">
                <p>Nenhuma barbearia encontrada com o nome "{searchTerm}".</p>
            </div>
       )}
    </div>
  );
}
