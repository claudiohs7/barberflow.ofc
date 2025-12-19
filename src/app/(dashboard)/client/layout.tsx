"use client";

import { RouteGuard } from "@/components/route-guard";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetcher";
import type { Client } from "@/lib/definitions";

function ClientRoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/auth/client/login");
      return;
    }

    if (user.role !== "CLIENT") {
      signOut().then(() => router.push("/auth/client/login"));
      return;
    }

    let isMounted = true;
    setIsVerifying(true);
    fetchJson<{ data: Client[] }>(`/api/clients?userId=${encodeURIComponent(user.id)}`)
      .then((response) => {
        if (!isMounted) return;
        // Se nÇ§o houver perfil, ainda permitimos acesso (deixa o cliente seguir e criar dados depois)
        const exists = Boolean(response.data && response.data.length);
        setIsVerified(true);
        if (!exists) {
          console.warn("Cliente logado sem perfil associado; permitindo acesso mesmo assim.");
        }
      })
      .catch(() => {
        if (isMounted) {
          // Em falha de rede, tambÇ¸m nÇ§o bloqueia o acesso; apenas loga no console
          console.warn("Falha ao verificar perfil do cliente; permitindo acesso.");
          setIsVerified(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsVerifying(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, isLoading, router, signOut]);

  if (isLoading || isVerifying || !isVerified) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Verificando permissões de cliente...</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <ClientRoleGuard>{children}</ClientRoleGuard>
    </RouteGuard>
  );
}
