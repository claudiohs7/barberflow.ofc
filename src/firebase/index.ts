// src/firebase/index.ts
'use client';

import { firebaseConfig } from '@/firebase/config'; // Importa a configuração do Firebase
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions as FirebaseFunctions } from 'firebase/functions';

// Função para inicializar o Firebase e seus SDKs (Auth, Firestore, Storage, Functions)
// de forma segura e com suporte a emuladores.
export function initializeFirebase() {
  // Se o app Firebase já foi inicializado, retorna as instâncias existentes.
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  // Inicializa o app Firebase com a configuração.
  const firebaseApp = initializeApp(firebaseConfig);

  const sdks = getSdks(firebaseApp);

  // Habilita a conexão com emuladores locais se a flag NEXT_PUBLIC_USE_FIREBASE_EMULATOR for 'true'.
  try {
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      // Conecta ao emulador de autenticação
      if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL) {
        connectAuthEmulator(sdks.auth, process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL);
        console.log('Firebase Auth Emulator conectado em:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL);
      }

      // Conecta ao emulador de Firestore
      if (process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST && process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT) {
        connectFirestoreEmulator(sdks.firestore, process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST, parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT, 10));
        console.log('Firebase Firestore Emulator conectado em:', `${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST}:${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT}`);
      }

      // Conecta ao emulador de Storage
      if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST && process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT) {
        connectStorageEmulator(sdks.storage, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST, parseInt(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT, 10));
        console.log('Firebase Storage Emulator conectado em:', `${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST}:${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT}`);
      }

      // Conecta ao emulador de Functions - CORREÇÃO AQUI
      if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL) {
        const functionsUrl = new URL(process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL);
        const functionsHost = functionsUrl.hostname;
        const functionsPort = parseInt(functionsUrl.port, 10);

        // Verifica se a porta é um número válido antes de conectar
        if (!isNaN(functionsPort)) {
          connectFunctionsEmulator(sdks.functions, functionsHost, functionsPort);
          console.log('Firebase Functions Emulator conectado em:', process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL);
        } else {
          console.warn('Porta do emulador de Functions inválida. Verifique NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL no .env.local');
        }
      }
    }
  } catch (e: any) {
    // Não falhar a inicialização em caso de emulador indisponível — logs são suficientes.
    // Em produção esta flag não é definida.
    console.warn('Firebase emulator connection failed or not configured:', e);
  }

  return sdks;
}

// Função auxiliar para obter as instâncias dos SDKs a partir de um app Firebase.
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
    functions: getFunctions(firebaseApp), // Adicionado para funções
  };
}

// Exporta outros módulos relacionados ao Firebase
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
