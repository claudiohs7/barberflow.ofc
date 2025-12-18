'use client';

import { useAuth } from '@/context/AuthContext';
import { fetchJson } from '@/lib/fetcher';
import type { Barbershop } from '@/lib/definitions';
import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';

interface BarbershopIdContextType {
  barbershopId: string | null;
  isLoading: boolean;
}

const BarbershopIdContext = createContext<BarbershopIdContextType | undefined>(undefined);

export function BarbershopIdProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let controller: AbortController | null = null;

    if (isAuthLoading) {
      setIsLoading(true);
      return () => {
        isMounted = false;
      };
    }

    if (!user) {
      setResolvedId(null);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadBarbershopId = async () => {
      setIsLoading(true);
      controller = new AbortController();
      try {
        // Primeiro tenta pelas barbearias do proprietário
        const response = await fetchJson<{ data: Barbershop[] }>(`/api/barbershops?ownerId=${encodeURIComponent(user.id)}`, {
          signal: controller.signal,
        });
        if (!isMounted) return;
        const owned = response.data?.[0]?.id ?? null;
        if (owned) {
          setResolvedId(owned);
          return;
        }

        // Fallback: pega a primeira barbearia disponível (útil quando o ownerId não está definido)
        const allRes = await fetchJson<{ data: Barbershop[] }>("/api/barbershops", { signal: controller.signal });
        if (!isMounted) return;
        setResolvedId(allRes.data?.[0]?.id ?? null);
      } catch (error: any) {
        if (!isMounted) return;
        if (error?.name !== 'AbortError') {
          console.warn('Falha ao buscar barbearia (owner e fallback):', error);
          setResolvedId(null);
        }
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadBarbershopId();

    return () => {
      isMounted = false;
      controller?.abort();
    };
  }, [user, isAuthLoading]);

  return (
    <BarbershopIdContext.Provider value={{ barbershopId: resolvedId, isLoading }}>
      {children}
    </BarbershopIdContext.Provider>
  );
}

export function useBarbershopId() {
  const context = useContext(BarbershopIdContext);
  if (context === undefined) {
    throw new Error('useBarbershopId must be used within a BarbershopIdProvider');
  }
  return context;
}
