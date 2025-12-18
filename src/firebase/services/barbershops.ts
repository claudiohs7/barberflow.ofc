
'use client';
import {
  doc,
  setDoc,
  Timestamp,
  Firestore,
  serverTimestamp
} from 'firebase/firestore';
import type { Barbershop } from '@/lib/definitions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Removendo 'id' pois ele vem do `userId`
type BarbershopData = Omit<Barbershop, 'id'>;

/**
 * Cria um documento de barbearia no Firestore.
 * @param db Instância do Firestore.
 * @param userId O UID do usuário que será o dono e o ID do documento.
 * @param barbershopData Os dados da barbearia.
 */
export async function createBarbershop(db: Firestore, userId: string, barbershopData: Partial<BarbershopData>) {
  const barbershopRef = doc(db, 'barbershops', userId);
  
  // Converte a data para Timestamp se ela existir
  const expiryDate = barbershopData.expiryDate ? Timestamp.fromDate(barbershopData.expiryDate) : null;

  const dataToSave = {
    ...barbershopData,
    legalName: barbershopData.legalName || "",
    cpfCnpj: barbershopData.cpfCnpj || "",
    expiryDate: expiryDate,
    createdAt: serverTimestamp(),
  };

  setDoc(barbershopRef, dataToSave).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: barbershopRef.path,
      operation: 'create',
      requestResourceData: dataToSave,
    });
    errorEmitter.emit('permission-error', permissionError);
    // Lançar o erro também pode ser útil para o chamador da função
    throw serverError;
  });
}
