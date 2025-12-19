
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Combine } from "lucide-react";

export default function IntegrationsPage() {

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Gerenciar Integrações</h2>
                    <p className="text-muted-foreground">Configure as credenciais e endpoints de serviços externos.</p>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Combine className="h-6 w-6"/>Integrações</CardTitle>
                    <CardDescription>Esta área é reservada para a configuração de integrações com serviços de terceiros.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Nenhuma integração ativa para configurar no momento.</p>
                </CardContent>
            </Card>
        </div>
    )
}

    