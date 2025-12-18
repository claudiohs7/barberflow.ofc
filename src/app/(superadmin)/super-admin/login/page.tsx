
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Eye, EyeOff } from "lucide-react";
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

const formSchema = z.object({
  email: z.string().email({
    message: "Por favor, insira um endereÃ§o de e-mail vÃ¡lido.",
  }),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres.",
  }),
});

// Lista de emails autorizados como Super Admin
const superAdminEmails = ["claudiohs@hotmail.com"];

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
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
    // Verifica se o e-mail Ã© de um super admin antes de tentar o login
    if (!superAdminEmails.includes(values.email.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: "Este e-mail nÃ£o tem permissÃ£o para acessar o dashboard Super Admin.",
        });
        return;
    }

    try {
      const user = await signIn({
        email: values.email,
        password: values.password,
      });

      if (user.role !== "SUPERADMIN") {
        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: "Este usuÃ¡rio nÃ£o tem permissÃµes de super admin.",
        });
        return;
      }
      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o dashboard...",
      });
      router.push("/super-admin/dashboard");
    } catch (error: any) {
        console.error("Erro no login do Super Admin:", error);
        const description = error.message || "Ocorreu um erro ao tentar fazer login.";
        toast({
            variant: "destructive",
            title: "Falha na AutenticaÃ§Ã£o",
            description,
        });
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-primary/20 shadow-xl shadow-primary/10">
        <CardHeader className="text-center items-center">
            <div className="p-3 bg-primary/10 rounded-full border border-primary/20 mb-4">
                <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-headline">Dashboard Super Admin</CardTitle>
            <CardDescription>
            Acesso restrito a administradores do sistema
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input placeholder="admin@barberflow.com" {...field} />
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
                          <Input type={showPassword ? 'text' : 'password'} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" {...field} />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(prev => !prev)}>
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Entrar no Dashboard
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>
    </div>
  );
}

