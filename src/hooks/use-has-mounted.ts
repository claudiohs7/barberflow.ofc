
"use client";

import { useState, useEffect } from 'react';

/**
 * Hook personalizado que retorna `true` somente após o componente ter sido montado no lado do cliente.
 * Isso é útil para evitar erros de hidratação (hydration mismatch) com componentes
 * que não devem ser renderizados no servidor (SSR).
 */
export function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}
