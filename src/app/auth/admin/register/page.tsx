
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState, type ReactNode } from "react";
import { capitalizeWords, formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Check, ShieldCheck, CalendarCheck, Loader2, Eye, EyeOff, Crown, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { addDays } from 'date-fns';
import type { AuthUser } from "@/lib/definitions";
import { fetchJson } from "@/lib/fetcher";

const formSchema = z.object({
  barbershopName: z.string().min(2, "O nome da barbearia é muito curto"),
  legalName: z.string().min(2, "O nome/empresa é obrigatório"),
  cep: z.string().min(8, "CEP inválido").max(9, "CEP inválido"),
  street: z.string().min(1, "A rua é obrigatória"),
  number: z.string().min(1, "O número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "O bairro é obrigatório"),
  city: z.string().min(1, "A cidade é obrigatória"),
  state: z.string().min(1, "O estado é obrigatório"),
  phone: z.string().min(10, "Por favor, insira um número de WhatsApp válido"),
  cpfCnpj: z.string().min(14, { message: "O CPF/CNPJ é obrigatório e deve ser válido." }),
  email: z.string().email("Por favor, insira um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type FormData = z.infer<typeof formSchema>;

export default function AdminRegisterPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"Básico" | "Premium">("Básico");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      barbershopName: "",
      legalName: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      phone: "",
      cpfCnpj: "",
      email: "",
      password: "",
    },
  });

  const cep = form.watch("cep");
  const cpfCnpj = form.watch("cpfCnpj");

  useEffect(() => {
    const fetchAddress = async () => {
      const cleanedCep = cep.replace(/\D/g, "");
      if (cleanedCep.length === 8) {
        try {
          const response = await fetch(`/api/cep/${cleanedCep}`);
          const data = await response.json();
          if (!data.error) {
            form.setValue("street", data.street);
            form.setValue("neighborhood", data.neighborhood);
            form.setValue("city", data.city);
            form.setValue("state", data.state);
            form.setFocus("number");
          } else {
             toast({ variant: "destructive", title: "Erro de CEP", description: data.error });
          }
        } catch (error) {
          console.error("Failed to fetch address:", error);
           toast({ variant: "destructive", title: "Erro de Rede", description: "Não foi possível buscar o endereço." });
        }
      }
    };
    if (step === 2) {
        fetchAddress();
    }
  }, [cep, form, toast, step]);

    useEffect(() => {
    const fetchCompanyData = async () => {
      const cleanedCnpj = cpfCnpj.replace(/\D/g, "");
      if (cleanedCnpj.length === 14) {
        try {
          const response = await fetch(`/api/cnpj/${cleanedCnpj}`);
          const data = await response.json();
          if (!data.error) {
            form.setValue("legalName", data.razao_social || ""); 
            form.setValue("barbershopName", data.nome_fantasia || ""); 
          }
        } catch (error) {
          console.error("Failed to fetch CNPJ data:", error);
        }
      }
    };
     if (step === 1) {
        fetchCompanyData();
    }
  }, [cpfCnpj, form, step]);

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
  
    const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length <= 11) {
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d)/, '$1.$2');
          value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else {
          value = value.substring(0, 14);
          value = value.replace(/^(\d{2})(\d)/, '$1.$2');
          value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
          value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
          value = value.replace(/(\d{4})(\d)/, '$1-$2');
      }
      e.target.value = value;
      return e;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    value = value.replace(/^(\d{5})(\d)/, "$1-$2");
    e.target.value = value;
    return e;
  }
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = capitalizeWords(e.target.value);
    return e;
  };
  
  const nextStep = async () => {
    const fieldsToValidate: (keyof FormData)[] = ['cpfCnpj', 'legalName', 'barbershopName', 'phone'];
    const isValid = await form.trigger(fieldsToValidate);
    if(isValid) {
      setStep(2);
    }
  }

  function onFormSubmit(values: FormData) {
     setFormData(values);
     setIsPlanDialogOpen(true);
  }

const handleCreateBarbershop = async () => {
    if (!formData) {
      toast({ variant: "destructive", title: "Erro", description: "Dados do formulário não encontrados ou serviço indisponível." });
      return;
    }
    setIsSubmitting(true);
    try {
        const registerResponse = await fetchJson<{ data: AuthUser }>("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: formData.email,
                password: formData.password,
                name: formData.legalName || formData.barbershopName,
                phone: formData.phone,
                role: "ADMIN",
            }),
        });
        const creator = registerResponse.data;

        const trialStartDate = new Date();
        const trialEndDate = addDays(trialStartDate, 7);

        await fetchJson("/api/barbershops", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ownerId: creator.id,
                name: formData.barbershopName,
                legalName: formData.legalName,
                cpfCnpj: formData.cpfCnpj || "",
                email: formData.email,
                phone: formData.phone,
                address: {
                    street: formData.street,
                    number: formData.number,
                    complement: formData.complement || "",
                    neighborhood: formData.neighborhood,
                    city: formData.city,
                    state: formData.state,
                    cep: formData.cep
                },
                operatingHours: [],
                plan: selectedPlan,
                status: 'Ativa',
                expiryDate: trialEndDate.toISOString()
            }),
        });

        await signIn({ email: formData.email, password: formData.password });
        
        toast({
            title: "Bem-vindo ao BarberFlow!",
            description: `Seu período de teste de 7 dias no plano ${selectedPlan} foi ativado.`,
        });
        
        router.push("/admin/dashboard");

    } catch (error: any) {
        console.error("Erro no cadastro:", error);
        let description: ReactNode = "Ocorreu um erro ao tentar se cadastrar. Tente novamente.";
        if (error.message?.includes("E-mail")) {
            description = "Este e-mail ja esta em uso. Tente fazer login ou use um e-mail diferente.";
        } else if (error.message?.toLowerCase().includes("cpf/cnpj")) {
            description = (
                <div className="space-y-1">
                    <p>CPF/CNPJ ja cadastrado, se nao foi voce, entre em contato com o suporte.</p>
                    <a
                        className="text-primary underline font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://wa.me/5531994371680?text=Preciso%20de%20ajuda%20com%20meu%20cadastro"
                    >
                        Falar no WhatsApp (+55 31 9 9437-1680)
                    </a>
                </div>
            );
        }
        toast({
            variant: "destructive",
            title: "Erro no Cadastro",
            description,
        });
    } finally {
        setIsSubmitting(false);
        setIsPlanDialogOpen(false);
    }
  };

  return (
    <>
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Cadastre sua Barbearia</CardTitle>
        <CardDescription>
          Preencha seus dados para começar. Você terá 7 dias de acesso gratuito para testar a plataforma.
        </CardDescription>
        <div className="pt-2">
            <Progress value={step === 1 ? 50 : 100} className="w-full" />
            <p className="text-xs text-muted-foreground mt-2 text-right">Passo {step} de 2</p>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
            
            {step === 1 && (
                <div className="space-y-4">
                    <FormField
                    control={form.control}
                    name="cpfCnpj"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>CPF ou CNPJ</FormLabel>
                        <FormControl>
                            <Input placeholder="Seu CPF ou CNPJ" {...field} onChange={(e) => field.onChange(handleCpfCnpjChange(e))} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="legalName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome/Empresa (Razão Social ou Proprietário)</FormLabel>
                        <FormControl>
                            <Input placeholder="Nome Completo ou Razão Social" {...field} onChange={(e) => field.onChange(handleNameChange(e))}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="barbershopName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome da Barbearia (Nome Fantasia)</FormLabel>
                        <FormControl>
                            <Input placeholder="Barbearia Estilo" {...field} onChange={(e) => field.onChange(handleNameChange(e))} />
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
                        <FormLabel>WhatsApp</FormLabel>
                        <FormControl>
                            <Input 
                            placeholder="(11) 98765-4321" 
                            {...field} 
                            onChange={(e) => field.onChange(handlePhoneChange(e))}
                            maxLength={15}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <Button type="button" className="w-full" onClick={nextStep}>
                        Continuar
                    </Button>
                </div>
            )}
            
            {step === 2 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="cep"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-1">
                                <FormLabel>CEP</FormLabel>
                                <FormControl>
                                    <Input placeholder="00000-000" {...field} onChange={(e) => field.onChange(handleCepChange(e))} maxLength={9} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                <FormLabel>Rua</FormLabel>
                                <FormControl>
                                    <Input placeholder="Rua Principal" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="number"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-1">
                                <FormLabel>Número</FormLabel>
                                <FormControl>
                                    <Input placeholder="123" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="complement"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                <FormLabel>Complemento (Opcional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Apto 101, Bloco B" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="neighborhood"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-3">
                                <FormLabel>Bairro</FormLabel>
                                <FormControl>
                                    <Input placeholder="Seu Bairro" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Cidade</FormLabel>
                                <FormControl>
                                    <Input placeholder="Sua Cidade" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Estado</FormLabel>
                                <FormControl>
                                    <Input placeholder="UF" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    </div>
                    
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>E-mail de Login</FormLabel>
                        <FormControl>
                            <Input placeholder="voce@exemplo.com" {...field} />
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
                     <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setStep(1)}>
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Voltar
                        </Button>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                           {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-2 h-4 w-4"/>}
                           {isSubmitting ? 'Finalizando...' : 'Finalizar e Escolher Plano'}
                        </Button>
                    </div>
                </div>
            )}
           
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Já tem uma conta?{" "}
          <Link href="/auth/admin/login" className="underline">
            Faça login
          </Link>
           <span className="mx-1">|</span>
            <Link href="/" className="underline">
                Voltar para a Home
            </Link>
        </div>
      </CardContent>
    </Card>

    <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="sm:max-w-3xl" onInteractOutside={(e) => { if (isSubmitting) e.preventDefault(); }}>
            <DialogHeader>
                <DialogTitle className="text-center text-2xl font-headline">Escolha o plano para o seu teste</DialogTitle>
                <DialogDescription className="text-center">
                    Todos os planos começam com 7 dias de teste gratuito. Escolha o que melhor se adapta à sua barbearia.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <Card 
                    className={cn("cursor-pointer border-2 transition-all", selectedPlan === 'Básico' ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-primary/50')}
                    onClick={() => setSelectedPlan('Básico')}
                >
                    <CardHeader>
                        <CardTitle>Básico</CardTitle>
                         <p className="text-2xl font-bold pt-2">{formatCurrency(49.90)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Agenda e Agendamentos</span></li>
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Cadastro de Clientes</span></li>
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Controle de Despesas</span></li>
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Gestão de Barbeiros e Serviços</span></li>
                            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Página de Agendamento Pública</span></li>
                        </ul>
                    </CardContent>
                </Card>
                <Card 
                    className={cn("cursor-pointer border-2 transition-all", selectedPlan === 'Premium' ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-primary/50')}
                    onClick={() => setSelectedPlan('Premium')}
                >
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-primary"/>Premium</CardTitle>
                        <p className="text-2xl font-bold pt-2">{formatCurrency(119.90)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                           <li className="flex items-start gap-2 font-semibold text-foreground"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Tudo do Plano Básico</span></li>
                           <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Notificações via WhatsApp (lembretes, confirmações)</span></li>
                           <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Pesquisa de Satisfação pós-serviço</span></li>
                           <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Webhooks para integrações com outras ferramentas</span></li>
                           <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-1 shrink-0"/><span>Relatórios Avançados (em breve)</span></li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
            <div className="flex items-center justify-center p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-300">
                <ShieldCheck className="h-5 w-5 mr-3"/>
                <p className="text-sm font-medium">Seu teste gratuito de 7 dias será iniciado após a confirmação.</p>
            </div>
            <DialogFooter>
                <Button onClick={handleCreateBarbershop} className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-2 h-4 w-4"/>}
                    {isSubmitting ? 'Finalizando...' : `Iniciar Teste no Plano ${selectedPlan}`}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

    
