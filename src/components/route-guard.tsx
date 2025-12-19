
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

function getRouteRole(pathname: string): string | null {
    if (pathname.startsWith('/super-admin')) return 'super-admin';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/barber')) return 'barber';
    if (pathname.startsWith('/client')) return 'client';
    return null;
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useAuth();

  useEffect(() => {
    if (isUserLoading) {
      return; // Aguarde o estado de autenticação ser resolvido
    }

    const currentRouteRole = getRouteRole(pathname);

    // Se for uma página pública que não precisa de guarda, permite o acesso.
    const publicPaths = ['/find-barbershop'];
    if (publicPaths.includes(pathname)) {
        return;
    }

    // Se não houver usuário, redirecione para a página de login apropriada
    if (!user) {
      const protectedRoles = ['admin', 'super-admin', 'barber', 'client'];
      if (currentRouteRole && protectedRoles.includes(currentRouteRole)) {
        let loginPath = '/auth/login'; // default login
        if (currentRouteRole === 'super-admin') loginPath = '/super-admin/login';
        else if (currentRouteRole === 'admin') loginPath = '/auth/admin/login';
        else if (currentRouteRole === 'barber') loginPath = '/auth/barber/login';
        else if (currentRouteRole === 'client') loginPath = '/auth/client/login';

        router.push(loginPath);
      }
    }
    // A lógica de deslogar ao mudar de rota foi removida para corrigir o bug de estado.
    // A autenticação agora é gerenciada por rota individualmente.

  }, [pathname, user, isUserLoading, router]);

  const currentRouteRole = getRouteRole(pathname);
  const isProtectedRoute = ['admin', 'super-admin', 'barber', 'client'].includes(currentRouteRole || '');
  const publicPaths = ['/find-barbershop'];
  const isPublicPath = publicPaths.includes(pathname);


  // Enquanto carrega, mostra uma tela de loading para rotas protegidas
  if (isUserLoading && isProtectedRoute && !isPublicPath) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Verificando autenticação...</p>
      </div>
    );
  }

  // Se for uma rota protegida e o usuário não estiver logado (após o carregamento), não renderiza nada
  // pois o useEffect já terá iniciado o redirecionamento.
  if (isProtectedRoute && !user && !isPublicPath) {
    return null;
  }
  
  // Se tudo estiver certo, renderiza os componentes filhos
  return <>{children}</>;
}
