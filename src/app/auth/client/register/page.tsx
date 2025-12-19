
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { capitalizeWords } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { fetchJson } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  phone: z.string().min(10, { message: "Um número de telefone WhatsApp válido é obrigatório." }),
  email: z.string().email({ message: "Por favor, insira um e-mail válido."}),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres."}),
});

export default function ClientRegisterPage() {
    const router = useRouter();
    const { signIn } = useAuth();
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
        name: "",
        phone: "",
        email: "",
        password: ""
        },
    });
  
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = capitalizeWords(e.target.value);
        return e;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        value = value.replace(/\D/g, '');
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        if (value.length > 15) {
        value = value.substring(0, 15);
        }
        e.target.value = value;
        return e;
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await fetchJson("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: values.email.trim().toLowerCase(),
                    password: values.password,
                    name: values.name,
                    phone: values.phone,
                    role: "CLIENT",
                }),
            });
            await signIn({ email: values.email, password: values.password });
            toast({
                title: "Cadastro realizado com sucesso!",
                description: "Agora você está logado e pode agendar no dashboard.",
            });
            router.push("/client/dashboard");
        } catch (error: any) {
            console.error("Erro no cadastro do cliente:", error);
            let description = "Ocorreu um erro inesperado. Tente novamente.";
            if (error.message?.includes("E-mail") || error.message?.includes("senha")) {
                description = error.message;
            }
            toast({
                variant: "destructive",
                title: "Falha no Cadastro",
                description,
            });
        }
    }

    return (
        <Card className="w-full max-w-md">
        <CardHeader>
            <CardTitle className="text-2xl font-headline">Crie sua Conta de Cliente</CardTitle>
            <CardDescription>
            Cadastre-se para agendar e gerenciar seus horários com facilidade.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                        <Input placeholder="João da Silva" {...field} onChange={(e) => field.onChange(handleNameChange(e))} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Número de Telefone WhatsApp</FormLabel>
                    <FormControl>
                        <Input placeholder="(11) 98765-4321" {...field} onChange={(e) => field.onChange(handlePhoneChange(e))} maxLength={15} />
                    </FormControl>
                    <FormDescription>Usado para lembretes de agendamento.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                            <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormDescription>Seu e-mail será usado para o login.</FormDescription>
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
                         <FormDescription>Mínimo de 6 caracteres.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full transition-transform duration-300 hover:scale-105 hover:shadow-lg">
                Cadastrar
                </Button>
            </form>
            </Form>
            <div className="mt-4 text-center text-sm">
            Já tem uma conta?{" "}
            <Link href="/auth/client/login" className="underline">
                Faça login
            </Link>
            </div>
        </CardContent>
        </Card>
    );
}
