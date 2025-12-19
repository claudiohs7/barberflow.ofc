
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { fetchJson } from "@/lib/fetcher";
import type { AuthUser, Barbershop } from "@/lib/definitions";
import { formatCurrency, cn } from "@/lib/utils";
import { startOfDay, isBefore } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ShieldCheck, CalendarCheck, Check, LifeBuoy, Eye, EyeOff, Crown } from "lucide-react";
import { SupportAgentIcon } from "@/components/icons/support-agent-icon";


const formSchema = z.object({
  email: z.string().email({
    message: "Por favor, insira um endereço de e-mail válido.",
  }),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres.",
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, signOut } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [inactiveBarbershop, setInactiveBarbershop] = useState<Barbershop | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

const handleSuccessfulLogin = (userId: string) => {
    toast({
        title: "Login bem-sucedido!",
        description: "Você será redirecionado para o dashboard.",
    });
    router.push("/admin/dashboard");
};

const handleError = (error: any) => {
    console.error("Erro no login:", error);
    const description =
        error.message?.includes("Credenciais") || error.message?.includes("senha")
            ? error.message
            : "Ocorreu um erro inesperado. Tente novamente.";
    toast({
      variant: "destructive",
      title: "Erro de autenticação",
      description,
    });
};

const fetchBarbershopByOwner = async (ownerId: string) => {
  const response = await fetchJson<{ data: Barbershop[] }>(
    `/api/barbershops?ownerId=${encodeURIComponent(ownerId)}`
  );
  return response.data?.[0] || null;
};

const checkSubscriptionAndLogin = async (user: AuthUser) => {
    if (user.role !== "ADMIN") {
        await signOut();
        toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: "Esta conta não pertence a uma barbearia. Use o login de administrador.",
        });
        return;
    }

    try {
        const barbershopData = await fetchBarbershopByOwner(user.id);
        if (!barbershopData) {
            await signOut();
            toast({
                variant: "destructive",
                title: "Registro não encontrado",
                description: "Não foi possível encontrar uma barbearia associada a esta conta.",
            });
            return;
        }

        const expiryDate = barbershopData.expiryDate ? new Date(barbershopData.expiryDate) : null;
        const isExpired = expiryDate ? isBefore(expiryDate, startOfDay(new Date())) : false;

        if (barbershopData.status === "Inativa" || isExpired) {
            setInactiveBarbershop(barbershopData);
            setIsSubscriptionModalOpen(true);
            await signOut();
            return;
        }

        handleSuccessfulLogin(user.id);
    } catch (error) {
        console.error("Erro ao validar barbearia:", error);
        await signOut();
        toast({
            variant: "destructive",
            title: "Erro de autenticação",
            description: "Não foi possível validar sua barbearia. Tente novamente.",
        });
    }
};

const onSubmit = async (values: FormData) => {
    try {
      const authUser = await signIn({ email: values.email, password: values.password });
      await checkSubscriptionAndLogin(authUser);
    } catch (error: any) {
      handleError(error);
    }
  }

  return (
    <>
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Login da Barbearia</CardTitle>
        <CardDescription>
          Insira suas credenciais para acessar o dashboard da sua barbearia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@minhabarbearia.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(prev => !prev)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full transition-transform duration-300 hover:scale-105 hover:shadow-lg">
              Entrar
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Não tem uma conta?{" "}
          <Link href="/auth/register" className="underline">
            Cadastre-se
          </Link>
        </div>
      </CardContent>
    </Card>

    <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-center">Seu plano expirou ou está inativo!</DialogTitle>
            <DialogDescription className="text-center">
                Para continuar acessando o BarberFlow, por favor, reative sua assinatura escolhendo um dos planos abaixo.
            </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                 <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Básico</CardTitle>
                        <CardDescription>O essencial para começar.</CardDescription>
                         <p className="text-2xl font-bold pt-2">{formatCurrency(49.90)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2 text-sm">
                       <p className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Agenda e Agendamentos</span></p>
                       <p className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Cadastro de Clientes</span></p>
                       <p className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Gestão de Barbeiros e Serviços</span></p>
                    </CardContent>
                     <CardFooter>
                         <Button className="w-full" asChild>
                            <Link href="https://pay.cakto.com.br/p/1OJGXoX1J2j8G8o" target="_blank">Reativar com Básico</Link>
                        </Button>
                    </CardFooter>
                </Card>
                 <Card className="flex flex-col border-primary shadow-lg shadow-primary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Crown className="text-primary"/>Premium</CardTitle>
                        <CardDescription>O mais completo para sua barbearia.</CardDescription>
                         <p className="text-2xl font-bold pt-2">{formatCurrency(119.90)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2 text-sm">
                       <p className="flex items-start gap-2 font-semibold"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Tudo do plano Básico</span></p>
                       <p className="flex items-start gap-2 font-semibold"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Automação de WhatsApp</span></p>
                       <p className="flex items-start gap-2 font-semibold"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Webhooks e Integrações</span></p>
                    </CardContent>
                     <CardFooter>
                         <Button className="w-full" asChild>
                            <Link href="https://pay.cakto.com.br/r33rggt" target="_blank">Reativar com Premium</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost">Fechar</Button>
                </DialogClose>
                 <Button variant="secondary" asChild>
                    <Link href="https://wa.me/5531994371680" target="_blank">
                        <SupportAgentIcon className="mr-2 h-4 w-4"/>
                        Falar com Suporte
                    </Link>
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
