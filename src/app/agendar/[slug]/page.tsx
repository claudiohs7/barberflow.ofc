"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { BookingWizard } from "@/components/booking-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

type PageParams = {
  params: Promise<{ slug?: string }>;
};

export default function PublicBookingPage({ params }: PageParams) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug ?? "";
  const [mode, setMode] = useState<"select" | "guest">("select");
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && user) {
      setMode("guest");
    }
  }, [isAuthLoading, user]);

  if (!slug) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Barbearia nÇœo encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p>O link que vocÇ¦ acessou parece estar invÇ­lido. Por favor, verifique o endereÇõo e tente novamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthLoading) {
    return null;
  }

  if (user || mode === "guest") {
    return (
      <div className="container mx-auto py-12 px-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Agendar sem cadastro</h1>
          <Button variant="ghost" onClick={() => setMode("select")}>
            Voltar
          </Button>
        </div>
        <BookingWizard barbershopIdFromSlug={slug} />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="text-center sm:text-left">Como você quer agendar?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center sm:text-left">
          <p className="text-sm text-muted-foreground">
            Você pode entrar na sua conta para salvar histórico e preferências ou seguir sem cadastro.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href={`/auth/client/login?redirect=/agendar/${encodeURIComponent(slug)}`}>
                Agendar com login
              </Link>
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setMode("guest")}>
              Agendar sem cadastro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
