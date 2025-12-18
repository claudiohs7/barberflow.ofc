
'use client';
import {
  doc,
  setDoc,
  collection,
  updateDoc,
  deleteDoc,
  Firestore,
  serverTimestamp,
  DocumentReference,
  addDoc,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {
  FirestorePermissionError,
} from '@/firebase/errors';
import type { Client } from '@/lib/definitions';

type ClientData = Partial<Omit<Client, 'id'>>;

/**
 * Cria ou atualiza o perfil de um cliente na coleção global /clients.
 * @param db Instância do Firestore.
 * @param userId UID do Firebase Auth do cliente ou um novo ID de documento.
 * @param clientData Dados do perfil do cliente. O email é opcional.
 */
export function createOrUpdateClientProfile(db: Firestore, userId: string, clientData: ClientData) {
    const clientDocRef = doc(db, 'clients', userId);
    
    // Constrói o perfil do cliente, garantindo que o e-mail seja uma string vazia se não for fornecido.
    const clientProfile = {
        name: clientData.name,
        phone: clientData.phone,
        email: clientData.email ?? '', // Garante que o e-mail seja uma string vazia se for nulo ou indefinido
        updatedAt: serverTimestamp(),
    };
    
    // Non-blocking write with custom error handling
    setDoc(clientDocRef, clientProfile, { merge: true })
    .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: clientDocRef.path,
            operation: 'write',
            requestResourceData: clientProfile,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}


/**
 * Adiciona um cliente à subcoleção de clientes de uma barbearia específica.
 * @param db Instância do Firestore.
 * @param barbershopId ID da barbearia.
 * @param clientId ID do cliente (pode ser de um perfil global existente ou novo).
 * @param clientData Dados do cliente a ser adicionado.
 */
export function addClientToBarbershop(db: Firestore, barbershopId: string, clientId: string, clientData: Omit<Client, 'id'>) {
    const clientInBarbershopRef = doc(db, `barbershops/${barbershopId}/clients`, clientId);
    const newClientEntry = {
        ...clientData,
        createdAt: serverTimestamp(),
    };
    // Non-blocking write with custom error handling
    setDoc(clientInBarbershopRef, newClientEntry, { merge: true })
    .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: clientInBarbershopRef.path,
            operation: 'create',
            requestResourceData: newClientEntry,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}


export function updateClient(db: Firestore, barbershopId: string, clientId: string, clientData: ClientData) {
    const clientRef = doc(db, `barbershops/${barbershopId}/clients`, clientId);
    
    const updatedClient = {
        ...clientData,
        updatedAt: serverTimestamp(),
    };
    
    updateDoc(clientRef, updatedClient)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: clientRef.path,
        operation: 'update',
        requestResourceData: updatedClient,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

/**
 * Remove um cliente da lista específica de uma barbearia, sem apagar seu perfil global.
 * @param db Instância do Firestore.
 * @param barbershopId ID da barbearia da qual o cliente será removido.
 * @param clientId ID do cliente a ser removido da lista.
 */
export function removeClientFromBarbershopList(db: Firestore, barbershopId: string, clientId: string) {
  const clientInBarbershopRef = doc(db, `barbershops/${barbershopId}/clients`, clientId);
  
  deleteDoc(clientInBarbershopRef)
  .catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: clientInBarbershopRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}


/**
 * Deleta um perfil de cliente da coleção global /clients.
 * @param db Instância do Firestore.
 * @param clientId ID do cliente a ser excluído.
 */
export function deleteClientProfile(db: Firestore, clientId: string) {
  const clientRef = doc(db, `clients`, clientId);
  
  deleteDoc(clientRef)
  .catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: clientRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
