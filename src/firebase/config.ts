// src/firebase/config.ts

// Importações do Firebase SDK para o cliente
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
//import { getFunctions, FirebaseFunctions } from 'firebase/functions';
import { getFunctions, connectFunctionsEmulator, Functions as FirebaseFunctions } from 'firebase/functions'; // CORREÇÃO AQUI


// Objeto de configuração do Firebase, lendo as variáveis de ambiente.
// O '!' (non-null assertion operator) é usado aqui porque o Next.js garante
// que as variáveis NEXT_PUBLIC_ estarão disponíveis no lado do cliente.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Inicializa o aplicativo Firebase de forma segura (singleton pattern).
// Isso garante que o app seja inicializado apenas uma vez,
// seja no lado do cliente ou do servidor (para SSR/SSG).
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Exporta os serviços do Firebase para serem usados em outras partes da aplicação.
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: FirebaseFunctions = getFunctions(app);

// Opcional: Exporta a instância do app se precisar dela diretamente em algum lugar.
export { app };

// Opcional: Função de tratamento de erros genérica para o Firebase.
// Pode ser usada em blocos catch para padronizar as mensagens de erro.
export const handleFirebaseError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'Usuário não encontrado.';
      case 'auth/wrong-password':
        return 'Senha incorreta.';
      case 'auth/invalid-email':
        return 'E-mail inválido.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso.';
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/network-request-failed':
        return 'Erro de conexão. Verifique sua internet ou os emuladores.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas de login. Tente novamente mais tarde.';
      case 'auth/configuration-not-found':
        return 'Configuração do Firebase não encontrada. Verifique suas variáveis de ambiente.';
      default:
        // Se o erro não for um objeto FirebaseError, tenta retornar a mensagem ou um erro genérico
  return (error instanceof Error) ? error.message : 'Erro desconhecido.';
    }
  }
  return 'Erro desconhecido.';
};
