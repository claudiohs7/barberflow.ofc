
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Youtube } from "lucide-react";

export default function TutorialsPage() {
    // Mock data for tutorials. Replace with your actual video data.
    const tutorials = [
        {
            title: "Configurando sua Barbearia pela Primeira Vez",
            description: "Um guia passo a passo para deixar sua barbearia pronta para receber agendamentos.",
            videoId: "dQw4w9WgXcQ" // Exemplo de ID de vídeo do YouTube
        },
        {
            title: "Gerenciando Barbeiros e Serviços",
            description: "Aprenda a cadastrar sua equipe e os serviços que cada um oferece.",
            videoId: "dQw4w9WgXcQ"
        },
        {
            title: "Dominando a Agenda",
            description: "Veja como cadastrar agendamentos manuais, editar horários e gerenciar o dia a dia.",
            videoId: "dQw4w9WgXcQ"
        },
         {
            title: "Conectando o WhatsApp",
            description: "Configure as mensagens automáticas de lembrete e confirmação para seus clientes.",
            videoId: "dQw4w9WgXcQ"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                    <Youtube className="h-8 w-8 text-primary" />
                    Tutoriais em Vídeo
                </h1>
            </div>
            <p className="text-muted-foreground">
                Assista aos nossos guias rápidos para aprender a usar todas as funcionalidades do BarberFlow e otimizar a gestão da sua barbearia.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tutorials.map((tutorial, index) => (
                    <Card key={index}>
                        <CardHeader>
                            <CardTitle>{tutorial.title}</CardTitle>
                            <CardDescription>{tutorial.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video overflow-hidden rounded-lg border">
                                <iframe
                                    className="w-full h-full"
                                    src={`https://www.youtube.com/embed/${tutorial.videoId}`}
                                    title={tutorial.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
