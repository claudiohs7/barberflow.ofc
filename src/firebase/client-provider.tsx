
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
    storage: FirebaseStorage;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Use useState to store Firebase services. Initialize as null.
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  // Use useEffect to initialize Firebase only on the client side, after initial rendering.
  useEffect(() => {
    // This function will only be executed once on the client.
    setFirebaseServices(initializeFirebase());
  }, []); // The empty dependency array ensures this is executed only once on mount.

  // If the services have not yet been initialized on the client, render nothing.
  // This avoids hydration errors and ensures services are available before children render.
  if (!firebaseServices) {
    return null;
  }

  // Once services are initialized, render the provider with the services.
  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
