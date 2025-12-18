

"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Store, User, Check, ShieldCheck, CalendarCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";


export default function RegisterTypePage() {
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"Básico" | "Premium">("Básico");
  const router = useRouter();

  const handleContinueToRegister = () => {
    setIsPlanDialogOpen(false);
    // A seleção do plano agora acontece DEPOIS do formulário.
    // Este botão apenas leva para a página de cadastro.
    router.push("/auth/admin/register");
  };


  return (
    
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Comece a usar o BarberFlow</CardTitle>
          <CardDescription>
            Escolha seu perfil para começar. Como você usará nossa plataforma?
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 transition-transform duration-300 hover:scale-105 hover:shadow-lg group"
              onClick={handleContinueToRegister}
            >
              <div className="flex flex-col items-center text-center w-full">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  <span className="text-lg font-semibold">Sou uma Barbearia</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground font-normal whitespace-normal group-hover:text-primary-foreground">Quero gerenciar meu negócio, agendamentos e equipe.</p>
              </div>
            </Button>
          <Button asChild variant="outline" className="h-auto py-6 transition-transform duration-300 hover:scale-105 hover:shadow-lg group">
            <Link href="/auth/client/register" className="flex flex-col items-center text-center w-full">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span className="text-lg font-semibold">Quero Agendar um Horário</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground font-normal whitespace-normal group-hover:text-primary-foreground">Quero encontrar uma barbearia e agendar um serviço como cliente.</p>
            </Link>
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
            <Button variant="link" asChild>
                <Link href="/auth/login">Já tenho uma conta</Link>
            </Button>
        </CardFooter>
      </Card>
  );
}
