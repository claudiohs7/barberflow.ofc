// src/firebase/admin/index.ts
'use server'; // Indica que este módulo deve ser executado apenas no servidor

import { App, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore'; // Importa Firestore do Admin SDK
import { getAuth } from 'firebase-admin/auth'; // Importa Auth do Admin SDK
import { credential } from 'firebase-admin'; // Importa credential para inicialização

// Armazena a instância do App para evitar reinicializações
let adminApp: App | undefined;

/**
 * Inicializa o Firebase Admin SDK se ainda não estiver inicializado.
 * Utiliza as credenciais de serviço do ambiente.
 * @returns A instância do Firebase Admin App.
 */
export async function initFirebaseAdmin(): Promise<App> {
  if (adminApp) {
    return adminApp;
  }

  // Verifica se já existe uma instância do app Firebase Admin
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  try {
    // Verifica se as variáveis de ambiente necessárias estão definidas
    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error('FIREBASE_PROJECT_ID não definido nas variáveis de ambiente.');
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('FIREBASE_CLIENT_EMAIL não definido nas variáveis de ambiente.');
    }
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('FIREBASE_PRIVATE_KEY não definido nas variáveis de ambiente.');
    }

    // A chave privada vem com '\n' que precisa ser substituído para ser lido corretamente
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    adminApp = initializeApp({
      credential: credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('Firebase Admin SDK inicializado com credenciais de serviço.');
    return adminApp;
  } catch (e: any) {
    console.error("Falha crítica na inicialização do Firebase Admin:", e.message);
    // Lança um erro claro para indicar que a autenticação do ambiente falhou.
    throw new Error(`Falha na inicialização do Firebase Admin: ${e.message}`);
  }
}

/**
 * Retorna a instância do Firestore Admin.
 * Garante que o app admin seja inicializado apenas uma vez.
 */
export async function getAdminFirestore() {
  if (!adminApp) {
    await initFirebaseAdmin();
  }
  // CORREÇÃO AQUI: Usar o non-null assertion operator '!'
  return getFirestore(adminApp!);
}

/**
 * Retorna a instância do Auth Admin.
 * Garante que o app admin seja inicializado apenas uma vez.
 */
export async function getAdminAuth() {
  if (!adminApp) {
    await initFirebaseAdmin();
  }
  // CORREÇÃO AQUI: Usar o non-null assertion operator '!'
  return getAuth(adminApp!);
}
