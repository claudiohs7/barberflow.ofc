"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  QrCode,
  User,
  Mail,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { capitalizeWords } from "@/lib/utils";

// Schema de validação usando Zod
const formSchema = z.object({
  name: z.string()
    .min(2, "O nome é obrigatório.")
    .refine(value => value.trim().split(/\s+/).length >= 2, {
        message: "Por favor, insira seu nome completo.",
    }),
  email: z.string().email("Por favor, insira um e-mail válido."),
  phone: z.string()
    .min(14, "O número de WhatsApp é obrigatório.")
    .refine(value => /^|$\d{2}$| 9\d{4}-\d{4}$/.test(value), {
        message: "Formato de WhatsApp inválido. Ex: (11) 98765-4321",
    }),
});
function CaptureContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [qrId, setQrId] = useState("");
  const [origin, setOrigin] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [n8nWebhookUrl] = useState("https://n8n.seuservidor.com/webhook/qr-capture");

  useEffect(() => {
    setQrId(searchParams.get("qr_id") || "N/A");
    setOrigin(searchParams.get("origem") || "N/A");
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

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
    setSubmissionStatus("loading");
    const payload = {
        qrCodeId: qrId,
        origem: origin,
        userName: values.name,
        userEmail: values.email,
        phoneNumber: values.phone.replace(/\D/g, ''),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
    };

    try {
        // Simulação de delay de rede
        await new Promise(resolve => setTimeout(resolve, 1500));

        setSubmissionStatus("success");
        toast({
            title: "Sucesso!",
            description: "Seus dados foram enviados. Fique de olho no seu WhatsApp!",
        });
        form.reset();
    } catch (error: any) {
        setSubmissionStatus("error");
        toast({
            variant: "destructive",
            title: "Ops! Algo deu errado.",
            description: error.message || "Não foi possível enviar seus dados.",
        });
    }
  }

  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center py-12 px-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <QrCode className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-2xl font-headline mt-4">
            Participar da Promoção
          </CardTitle>
          <CardDescription>
            Preencha seus dados abaixo para confirmar sua participação e receber as novidades.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex justify-around rounded-lg border bg-muted/50 p-3 text-sm">
                <div className="text-center">
                    <p className="font-semibold">ID da Promoção</p>
                    <p className="text-muted-foreground">{qrId}</p>
                </div>
                 <div className="text-center">
                    <p className="font-semibold">Origem</p>
                    <p className="text-muted-foreground">{origin}</p>
                </div>
            </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Seu nome completo" {...field} onChange={(e) => field.onChange(capitalizeWords(e.target.value))} className="pl-10" />
                            </div>
                        </FormControl>
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
                             <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="email" placeholder="seu.email@exemplo.com" {...field} className="pl-10" />
                            </div>
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
                             <div className="relative">
                                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="tel" placeholder="(11) 98765-4321" {...field} onChange={(e) => field.onChange(handlePhoneChange(e))} maxLength={15} className="pl-10" />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={submissionStatus === "loading"}>
                    {submissionStatus === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submissionStatus === "loading" ? "Enviando..." : "Quero Participar"}
                </Button>
            </form>
            </Form>
        </CardContent>
        {submissionStatus === 'success' && (
            <CardFooter className="flex flex-col items-center justify-center p-4 bg-green-500/10 text-green-500 rounded-b-lg">
                <CheckCircle className="h-8 w-8 mb-2" />
                <p className="font-semibold">Dados enviados com sucesso!</p>
                <p className="text-sm">Fique de olho no seu WhatsApp.</p>
            </CardFooter>
        )}
        {submissionStatus === 'error' && (
            <CardFooter className="flex flex-col items-center justify-center p-4 bg-destructive/10 text-destructive rounded-b-lg">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="font-semibold">Falha no envio</p>
                <p className="text-sm">Por favor, verifique seus dados e tente novamente.</p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default function QRCapturePage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CaptureContent />
    </Suspense>
  );
}
