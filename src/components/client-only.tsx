
"use client";

import { useHasMounted } from "@/hooks/use-has-mounted";
import type { ReactNode } from "react";

/**
 * Este componente renderiza seus filhos (`children`) apenas no lado do cliente,
 * após a montagem inicial. Isso evita erros de hidratação (hydration mismatch)
 * para componentes que dependem de APIs do navegador ou que têm um estado
 * que não pode ser sincronizado entre servidor e cliente.
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}
