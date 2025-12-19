
'use client';

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT = 3600000; // 1 hour in milliseconds

export function SessionTimeout() {
  const { signOut, user } = useAuth();
  const router = useRouter();

  const handleSignOut = useCallback(() => {
      signOut().then(() => {
        router.push('/auth/admin/login');
      });
  }, [signOut, router]);

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(handleSignOut, INACTIVITY_TIMEOUT);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];

    if (user) {
      events.forEach((event) => window.addEventListener(event, resetTimer));
      resetTimer();
    }

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, handleSignOut]);

  return null;
}
