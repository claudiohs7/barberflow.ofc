
"use client";

import Link from "next/link";
import { User, Store, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const buttonClass =
    "relative group flex flex-col items-center justify-center p-6 rounded-lg bg-card/50 border border-white/10 hover:bg-card/80 hover:border-primary/50 transition-all duration-300 w-full h-full text-center hover:scale-105";

  return (
    <div className="relative w-full max-w-lg mx-auto p-4 md:p-8 rounded-xl bg-card/80 backdrop-blur-sm border border-primary/20 shadow-2xl shadow-primary/10 overflow-hidden">
      
      {/* Elemento de brilho */}
      <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.15),transparent_40%)] -z-10 animate-[spin_20s_linear_infinite]"></div>

      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/30 mb-6">
            <Scissors className="h-8 w-8 text-primary" suppressHydrationWarning />
        </div>
        <h1 className="text-3xl font-headline font-bold mb-2">
          Bem-vindo de volta ao{" "}
          <span className="text-primary font-bold">BarberFlow</span>
        </h1>
        <p className="text-muted-foreground">
          Selecione o tipo de conta para fazer login
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link href="/auth/admin/login" className={cn(buttonClass)}>
            <Store className="h-8 w-8 text-primary mb-4" />
            <h2 className="text-lg font-bold font-headline tracking-wider">
              SOU UMA
              <br />
              BARBEARIA
            </h2>
          </Link>
          <Link href="/auth/client/login" className={cn(buttonClass)}>
            <User className="h-8 w-8 text-primary mb-4" />
            <h2 className="text-lg font-bold font-headline tracking-wider">
              SOU UM
              <br />
              CLIENTE
            </h2>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Button variant="link" asChild>
              <Link href="/auth/register">Não tenho uma conta</Link>
          </Button>
           <span className="mx-2 text-muted-foreground">|</span>
          <Button variant="link" asChild>
              <Link href="/">Voltar para home</Link>
          </Button>
        </div>
    </div>
  );
}
