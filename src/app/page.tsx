import * as React from "react";
import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import ShimmerButton from "@/components/ui/shimmer-button";
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { formatCurrency } from "@/lib/utils";
import { Zap, Calendar, Users, ShieldCheck, Clock, Check, Star, X, Webhook, Scissors, Crown } from "lucide-react";

const features = [
  {
    icon: <Scissors className="h-8 w-8 text-primary" />,
    title: "Gestão Completa",
    description: "Gerencie barbeiros, serviços e horários com total controle e facilidade.",
  },
  {
    icon: <Calendar className="h-8 w-8 text-primary" />,
    title: "Agendamento Online",
    description: "Página pública personalizável para que seus clientes agendem 24/7.",
  },
  {
    icon: <WhatsAppIcon className="h-8 w-8 text-primary" />,
    title: "Automação de WhatsApp",
    description: "Reduza faltas com lembretes e confirmações automáticas para seus clientes.",
  },
  {
    icon: <Webhook className="h-8 w-8 text-primary" />,
    title: "Integrações via Webhooks",
    description: "Conecte o BarberFlow a outras ferramentas e automatize seus processos.",
  },
];

const steps = [
  {
    number: "01",
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: "Cadastre-se Rapidamente",
    description: "Crie sua conta e configure sua barbearia em menos de 5 minutos com nosso guia intuitivo.",
  },
  {
    number: "02",
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Divulgue seu Link Exclusivo",
    description: "Compartilhe sua página de agendamento e permita que clientes marquem horários de qualquer lugar.",
  },
  {
    number: "03",
    icon: <Calendar className="h-8 w-8 text-primary" />,
    title: "Gerencie sua Agenda",
    description: "Receba e organize agendamentos em um painel centralizado, com notificações em tempo real.",
  },
];

const guarantees = [
  {
    icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    title: "100% Seguro",
    description: "Seus dados estão protegidos com criptografia de ponta.",
  },
  {
    icon: <Clock className="h-6 w-6 text-primary" />,
    title: "Suporte 24/7",
    description: "Nossa equipe está sempre disponível para ajudar você.",
  },
  {
    icon: <Zap className="h-6 w-6 text-primary" />,
    title: "Ativação Imediata",
    description: "Comece a usar o sistema assim que finalizar a assinatura.",
  },
];

const testimonials = [
  {
    quote: "O BarberFlow transformou a gestão da minha barbearia. Meus clientes adoram a facilidade de agendar e eu economizo horas por semana!",
    name: "Carlos Silva",
    role: "Dono, Barbearia Estilo",
    avatar: "avatar1",
  },
  {
    quote: "A automação do WhatsApp é um divisor de águas. Reduzimos as faltas em 80% e a comunicação com o cliente ficou muito mais profissional.",
    name: "Mariana Costa",
    role: "Gerente, Navalha de Ouro",
    avatar: "avatar2",
  },
  {
    quote: "O sistema é super intuitivo. Em menos de um dia, toda a minha equipe já estava usando. O suporte também é muito rápido e atencioso.",
    name: "Ricardo Mendes",
    role: "Barbeiro, The Godfather Barber",
    avatar: "avatar3",
  },
];

const faqItems = [
  {
    value: "item-1",
    question: "O que é o BarberFlow?",
    answer:
      "O BarberFlow é um sistema de gestão completo para barbearias, projetado para simplificar sua rotina. Ele oferece agendamento online, gestão de clientes e barbeiros, controle financeiro e automações de marketing via WhatsApp para reduzir faltas e fidelizar clientes.",
  },
  {
    value: "item-2",
    question: "Preciso instalar algum programa?",
    answer:
      "Não! O BarberFlow é 100% online e funciona em qualquer dispositivo com acesso à internet, seja seu computador, tablet ou celular. Seus dados ficam seguros na nuvem e acessíveis de onde você estiver.",
  },
  {
    value: "item-3",
    question: "Meus clientes precisam pagar para agendar um horário?",
    answer:
      "Não, o agendamento é totalmente gratuito para seus clientes. Eles acessam sua página exclusiva e marcam o horário sem custo. A assinatura do BarberFlow é um investimento da barbearia para melhorar a gestão e a experiência do cliente.",
  },
  {
    value: "item-4",
    question: "Como funciona o teste gratuito de 7 dias?",
    answer:
      "Ao se cadastrar, você tem acesso completo a todas as funcionalidades do plano que escolher por 7 dias. Não pedimos cartão de crédito e não há compromisso. É a oportunidade perfeita para você ver na prática como o BarberFlow pode transformar seu negócio.",
  },
  {
    value: "item-5",
    question: "O que acontece se eu precisar de ajuda?",
    answer:
      "Oferecemos suporte completo via WhatsApp e e-mail. Nossa equipe está sempre disponível para tirar suas dúvidas, resolver qualquer problema e ajudar você a extrair o máximo da plataforma.",
  },
];

const comparisonFeatures = {
  Funcionalidades: [
    { feature: "Página de Agendamento Online", basic: true, premium: true },
    { feature: "Membros da Equipe", basic: "5", premium: "Ilimitado" },
    { feature: "Notificações via WhatsApp", basic: false, premium: true },
    { feature: "Webhooks para Integrações", basic: false, premium: true },
  ],
  Relatórios: [
    { feature: "Dashboard com Métricas", basic: true, premium: true },
    { feature: "Relatórios Básicos de Agendamento", basic: true, premium: true },
    { feature: "Relatórios Financeiros Avançados", basic: false, premium: true },
    { feature: "Exportação de Relatórios", basic: false, premium: true },
  ],
  Suporte: [
    { feature: "Suporte via E-mail e Ticket", basic: true, premium: true },
    { feature: "Suporte Prioritário via WhatsApp", basic: false, premium: true },
    { feature: "Sessão de Onboarding e Treinamento", basic: false, premium: true },
  ],
};

export const metadata: Metadata = {
  title: "BarberFlow | Gestão moderna para barbearias",
  description:
    "Agendamento online, automação via WhatsApp e gestão completa para barbearias. Teste grátis de 7 dias, sem cartão.",
  openGraph: {
    title: "BarberFlow | Gestão moderna para barbearias",
    description:
      "Agendamento online, automação via WhatsApp e gestão completa para barbearias. Teste grátis de 7 dias, sem cartão.",
    url: "https://barberflow.app/",
    siteName: "BarberFlow",
    type: "website",
  },
};

export default function Home() {
  const avatars = {
    avatar1: PlaceHolderImages.find((p) => p.id === "avatar1"),
    avatar2: PlaceHolderImages.find((p) => p.id === "avatar2"),
    avatar3: PlaceHolderImages.find((p) => p.id === "avatar3"),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <Script
        id="faq-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden bg-gray-900 py-24 sm:py-32">
          <img
            src="/api/site-assets/home-hero?variant=mobile"
            alt="Fundo do BarberFlow (mobile)"
            className="absolute inset-0 -z-20 h-full w-full object-cover md:hidden"
          />
          <img
            src="/api/site-assets/home-hero?variant=desktop"
            alt="Fundo do BarberFlow (desktop)"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-right md:object-center hidden md:block"
          />
          <div className="absolute inset-0 bg-background/75 -z-10" />
          <div
            aria-hidden="true"
            className="hidden sm:absolute sm:-top-10 sm:right-1/2 sm:-z-10 sm:mr-10 sm:block sm:transform-gpu sm:blur-3xl"
          >
            <div
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
              className="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-tr from-[#0ea5e9] to-[#2563eb] opacity-20"
            ></div>
          </div>
          <div
            aria-hidden="true"
            className="absolute -top-52 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-112 sm:ml-16 sm:translate-x-0"
          >
            <div
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
              className="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-tr from-[#0ea5e9] to-[#2563eb] opacity-20"
            ></div>
          </div>
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-7xl font-headline">
                A Evolução da Gestão para Barbearias
              </h1>
              <p className="mt-8 text-lg font-medium text-pretty text-gray-300 sm:text-xl/8">
                Modernize seu negócio com agendamentos online, gestão de clientes e automação de marketing. Fidelize
                clientes e otimize seu tempo.
              </p>
            </div>
            <div className="mx-auto mt-10 max-w-2xl lg:mx-0 lg:max-w-none">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link href="/auth/admin/register" aria-label="Iniciar teste gratuito de 7 dias no BarberFlow">
                  <ShimmerButton background="hsl(var(--primary))">
                    <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                      Iniciar Teste Gratuito de 7 Dias
                    </span>
                  </ShimmerButton>
                </Link>
                <Button asChild variant="link" className="text-white">
                  <Link href="/auth/admin/login" aria-label="Acessar minha conta no BarberFlow">
                    Já tenho uma conta <span aria-hidden="true">&rarr;</span>
                  </Link>
                </Button>
              </div>
              <dl className="mt-16 grid grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col-reverse gap-1">
                  <dt className="text-base/7 text-gray-300">Barbearias Ativas</dt>
                  <dd className="text-4xl font-semibold tracking-tight text-white">50+</dd>
                </div>
                <div className="flex flex-col-reverse gap-1">
                  <dt className="text-base/7 text-gray-300">Agendamentos/Mês</dt>
                  <dd className="text-4xl font-semibold tracking-tight text-white">10k+</dd>
                </div>
                <div className="flex flex-col-reverse gap-1">
                  <dt className="text-base/7 text-gray-300">Satisfação</dt>
                  <dd className="text-4xl font-semibold tracking-tight text-white">99%</dd>
                </div>
                <div className="flex flex-col-reverse gap-1">
                  <dt className="text-base/7 text-gray-300">Suporte</dt>
                  <dd className="text-4xl font-semibold tracking-tight text-white">24/7</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-card/20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">Funcionalidades Poderosas</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Tudo que você precisa para levar sua barbearia para o próximo nível.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <div key={index} className="relative overflow-hidden rounded-lg p-[1px] bg-gradient-to-b from-primary/20 to-transparent">
                  <div className="bg-card h-full p-6 rounded-lg group hover:bg-card/80 transition-colors duration-300">
                    <div className="p-3 rounded-full bg-primary/10 w-fit mb-4 border border-primary/20 shadow-lg shadow-primary/50">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold font-headline">{feature.title}</h3>
                    <p className="text-muted-foreground mt-2">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">Transforme sua barbearia em 3 passos simples</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="relative flex flex-col items-center text-center p-8 space-y-4 rounded-lg bg-card/50 border border-border transition-transform duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/10"
                >
                  <div className="absolute -top-5 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    {step.number}
                  </div>
                  <div className="pt-6">{step.icon}</div>
                  <h3 className="text-xl font-bold font-headline">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-16">
              <Card className="bg-card/80 backdrop-blur-sm border-border">
                <CardContent className="flex flex-col md:flex-row justify-around p-6 space-y-4 md:space-y-0">
                  {guarantees.map((guarantee, index) => (
                    <div key={index} className="flex items-center gap-4">
                      {guarantee.icon}
                      <div>
                        <h4 className="font-semibold">{guarantee.title}</h4>
                        <p className="text-sm text-muted-foreground">{guarantee.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
          <div className="relative isolate bg-transparent px-6 lg:px-8">
            <div aria-hidden="true" className="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl">
              <div
                style={{
                  clipPath:
                    "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                }}
                className="mx-auto aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#0ea5e9] to-[#2563eb] opacity-20"
              />
            </div>
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-base/7 font-semibold text-primary">Preços</h2>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-balance text-foreground sm:text-6xl font-headline">
                Escolha o plano certo para você
              </p>
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-medium text-pretty text-muted-foreground sm:text-xl/8">
              Planos acessíveis e repletos de recursos para engajar seu público e impulsionar suas vendas.
            </p>
            <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-2">
              <div className="rounded-3xl rounded-t-3xl bg-card/60 p-8 ring-1 ring-border sm:mx-8 sm:rounded-b-none sm:p-10 lg:mx-0 lg:rounded-tr-none lg:rounded-bl-3xl">
                <h3 id="tier-hobby" className="text-base/7 font-semibold text-primary">
                  Básico
                </h3>
                <p className="mt-4 flex items-baseline gap-x-2">
                  <span className="text-5xl font-semibold tracking-tight text-foreground">{formatCurrency(49.9)}</span>
                  <span className="text-base text-muted-foreground">/mês</span>
                </p>
                <p className="mt-6 text-base/7 text-muted-foreground">O plano perfeito se você está apenas começando.</p>
                <ul role="list" className="mt-8 space-y-3 text-sm/6 text-muted-foreground sm:mt-10">
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    Agendamentos Online
                  </li>
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    Gestão de Clientes e Barbeiros
                  </li>
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    Página de Agendamento Pública
                  </li>
                  <li className="flex gap-x-3">
                    <X className="h-6 w-5 flex-none text-muted-foreground" />
                    Automação de WhatsApp
                  </li>
                  <li className="flex gap-x-3">
                    <X className="h-6 w-5 flex-none text-muted-foreground" />
                    Webhooks e Integrações
                  </li>
                </ul>
                <Link
                  href="/auth/admin/register"
                  aria-describedby="tier-hobby"
                  className="mt-8 block rounded-md px-3.5 py-2.5 text-center text-sm font-semibold text-primary ring-1 ring-inset ring-primary/50 hover:ring-primary sm:mt-10"
                  aria-label="Começar agora no plano Básico do BarberFlow"
                >
                  Começar agora
                </Link>
              </div>
              <div className="relative rounded-3xl bg-card p-8 shadow-2xl ring-1 ring-border sm:p-10">
                <div className="absolute top-0 right-0 m-4">
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Crown className="h-4 w-4 mr-1" /> Mais Popular
                  </div>
                </div>
                <h3 id="tier-enterprise" className="text-base/7 font-semibold text-primary">
                  Premium
                </h3>
                <p className="mt-4 flex items-baseline gap-x-2">
                  <span className="text-5xl font-semibold tracking-tight text-white">{formatCurrency(119.9)}</span>
                  <span className="text-base text-gray-400">/mês</span>
                </p>
                <p className="mt-6 text-base/7 text-gray-300">Suporte dedicado e infraestrutura para o seu negócio.</p>
                <ul role="list" className="mt-8 space-y-3 text-sm/6 text-gray-300 sm:mt-10">
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    Tudo do Plano Básico
                  </li>
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    Automação de WhatsApp
                  </li>
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    Webhooks e Integrações
                  </li>
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    Suporte prioritário
                  </li>
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    Pesquisa de Satisfação
                  </li>
                  <li className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    Relatórios Avançados (em breve)
                  </li>
                </ul>
                <Link
                  href="/auth/admin/register"
                  aria-describedby="tier-enterprise"
                  className="mt-8 block rounded-md bg-primary px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:mt-10"
                  aria-label="Começar agora no plano Premium do BarberFlow"
                >
                  Começar agora
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="comparison" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-4xl text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">Compare os Planos</h2>
              <p className="mt-4 text-muted-foreground">Encontre o plano perfeito para o estágio atual da sua barbearia.</p>
            </div>
            <div className="mx-auto max-w-5xl">
              <div className="grid grid-cols-3 gap-px bg-border/50 rounded-lg overflow-hidden border border-border/50">
                <div className="bg-card p-6">
                  <h3 className="text-lg font-semibold">Funcionalidades</h3>
                </div>
                <div className="bg-card p-6 text-center">
                  <h3 className="text-lg font-semibold">Básico</h3>
                  <p className="text-sm text-muted-foreground">Essencial para começar</p>
                </div>
                <div className="bg-primary/10 p-6 text-center ring-1 ring-inset ring-primary/50">
                  <h3 className="text-lg font-semibold text-primary">Premium</h3>
                  <p className="text-sm text-primary/80">Para escalar seu negócio</p>
                </div>

                {Object.entries(comparisonFeatures).map(([category, featuresList]) => (
                  <React.Fragment key={category}>
                    <div className="col-span-3 bg-card/50 p-3">
                      <h4 className="font-semibold text-muted-foreground">{category}</h4>
                    </div>

                    {featuresList.map((item) => (
                      <React.Fragment key={item.feature}>
                        <div className="p-4 flex items-center bg-card">
                          <p>{item.feature}</p>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-card">
                          {typeof item.basic === "boolean" ? (
                            item.basic ? (
                              <Check className="h-5 w-5 text-primary" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground" />
                            )
                          ) : (
                            <span className="font-semibold">{item.basic}</span>
                          )}
                        </div>
                        <div className="p-4 flex items-center justify-center bg-primary/10 ring-1 ring-inset ring-primary/20">
                          {typeof item.premium === "boolean" ? (
                            item.premium ? (
                              <Check className="h-5 w-5 text-primary" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground" />
                            )
                          ) : (
                            <span className="font-semibold text-primary">{item.premium}</span>
                          )}
                        </div>
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="social-proof" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">O que nossos parceiros dizem</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Veja como o BarberFlow está ajudando barbearias a crescerem e otimizarem seu tempo.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {testimonials.map((testimonial, index) => {
                const avatar = testimonial.avatar ? avatars[testimonial.avatar as keyof typeof avatars] : undefined;
                return (
                  <Card key={index} className="bg-card/50 border-border flex flex-col">
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                        ))}
                      </div>
                      <p className="text-muted-foreground flex-1">"{testimonial.quote}"</p>
                    </CardContent>
                    <CardHeader className="flex flex-row items-center gap-4 pt-4">
                      {avatar && (
                        <Avatar>
                          <AvatarImage src={avatar.imageUrl} alt={testimonial.name} data-ai-hint={avatar.imageHint} />
                          <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <CardTitle className="text-base font-semibold">{testimonial.name}</CardTitle>
                        <CardDescription>{testimonial.role}</CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">Perguntas Frequentes</h2>
            </div>
            <div className="mx-auto mt-12 max-w-3xl">
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item) => (
                  <AccordionItem key={item.value} value={item.value}>
                    <AccordionTrigger className="text-lg text-left">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container">
            <div className="relative overflow-hidden rounded-lg bg-card border border-primary/20 p-8 md:p-12 text-center space-y-6 shadow-xl shadow-primary/10">
              <div className="absolute inset-0 bg-grid-zinc-800 [mask-image:linear-gradient(to_bottom,white_10%,transparent_70%)] -z-10"></div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">Pronto para transformar sua barbearia?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comece seu teste gratuito de 7 dias hoje mesmo, sem compromisso e sem cadastrar cartão de crédito.
              </p>
              <Link href="/auth/admin/register" aria-label="Criar minha conta no BarberFlow">
                <ShimmerButton background="hsl(var(--primary))" className="h-11 px-8 inline-flex items-center justify-center mt-4">
                  <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                    Criar minha conta
                  </span>
                </ShimmerButton>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
