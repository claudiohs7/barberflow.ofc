
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string().min(1, { message: "A senha é obrigatória." }),
});

export default function ClientLoginPage() {
    const router = useRouter();
    const { signIn, signOut } = useAuth();
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const user = await signIn({ email: values.email, password: values.password });
            if (user.role !== "CLIENT") {
                await signOut();
                toast({
                    variant: "destructive",
                    title: "Acesso Negado",
                    description: "Esta conta não pertence a um cliente. Use o login de barbearia.",
                });
                return;
            }
            toast({ title: "Login bem-sucedido!", description: "Você será redirecionado para o dashboard." });
            router.replace("/client/dashboard");
            setTimeout(() => {
              if (typeof window !== "undefined" && window.location.pathname.startsWith("/auth/client")) {
                window.location.href = "/client/dashboard";
              }
            }, 300);
        } catch (error: any) {
            console.error("Erro de login do cliente:", error);
            const message =
                error.message?.includes("Credenciais") || error.message?.includes("senha")
                    ? error.message
                    : "E-mail ou senha incorretos. Por favor, tente novamente.";
            toast({
                variant: "destructive",
                title: "Falha no Login",
                description: message,
            });
        }
    }

    return (
        <Card className="w-full max-w-md">
        <CardHeader>
            <CardTitle className="text-2xl font-headline">Login do Cliente</CardTitle>
            <CardDescription>
            Faça login para gerenciar seus agendamentos.
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
                        <Input placeholder="seu@email.com" {...field} />
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
            <Link href="/auth/client/register" className="underline">
                Cadastre-se
            </Link>
             <span className="mx-1">|</span>
              <Link href="/find-barbershop" className="underline font-semibold">
                Agendar sem cadastro
              </Link>
            </div>
        </CardContent>
        </Card>
    );
}
