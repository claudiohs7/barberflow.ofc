
'use client';

import { useEffect, useState } from "react";
import { Loader2, Youtube } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchJson } from "@/lib/fetcher";

type TutorialVideo = {
  id: string;
  title: string;
  description: string | null;
  youtubeUrl: string;
  youtubeId: string | null;
  targetEmail: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function TutorialsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [tutorials, setTutorials] = useState<TutorialVideo[]>([]);

  useEffect(() => {
    setIsLoading(true);
    fetchJson<{ data: TutorialVideo[] }>("/api/tutorials")
      .then((res) => setTutorials(res.data || []))
      .catch((error: any) => {
        console.error("Erro ao carregar tutoriais:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: error?.message || "Não foi possível carregar os tutoriais.",
        });
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Youtube className="h-8 w-8 text-primary" />
          Tutoriais em Vídeo
        </h1>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
      </div>
      <p className="text-muted-foreground">
        Assista aos nossos guias rápidos para aprender a usar as funcionalidades do BarberFlow e otimizar a gestão da sua barbearia.
      </p>

      {!isLoading && tutorials.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Nenhum tutorial disponível no momento.</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tutorials.map((tutorial) => (
          <Card key={tutorial.id}>
            <CardHeader>
              <CardTitle>{tutorial.title}</CardTitle>
              {tutorial.description ? <CardDescription>{tutorial.description}</CardDescription> : null}
            </CardHeader>
            <CardContent>
              <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
                {tutorial.youtubeId ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${tutorial.youtubeId}`}
                    title={tutorial.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                    Link inválido ou vídeo indisponível.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
