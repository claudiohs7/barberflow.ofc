'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (error: FirestorePermissionError) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao acessar dados',
        description: error.message ?? 'Permissão negada ao acessar o Firestore.',
      });
    };

    errorEmitter.on('permission-error', handler);
    return () => {
      errorEmitter.off('permission-error', handler);
    };
  }, [toast]);

  return null;
}
