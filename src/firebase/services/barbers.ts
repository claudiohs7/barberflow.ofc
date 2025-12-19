
'use client';
import {
  doc,
  addDoc,
  collection,
  updateDoc,
  deleteDoc,
  Firestore,
  serverTimestamp,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {
  FirestorePermissionError,
} from '@/firebase/errors';
import type { Barber } from '@/lib/definitions';

type BarberData = Omit<Barber, 'id'>;

export async function createBarber(db: Firestore, barbershopId: string, barberData: BarberData): Promise<string | null> {
    const barbersColRef = collection(db, `barbershops/${barbershopId}/barbers`);
    
    const newBarber = {
        ...barberData,
        createdAt: serverTimestamp(),
    }
    
    try {
        const docRef = await addDoc(barbersColRef, newBarber);
        return docRef.id;
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: barbersColRef.path,
            operation: 'create',
            requestResourceData: newBarber,
        });
        errorEmitter.emit('permission-error', permissionError);
        return null;
    }
}

export function updateBarber(db: Firestore, barbershopId: string, barberId: string, barberData: Partial<BarberData>) {
    const barberRef = doc(db, `barbershops/${barbershopId}/barbers`, barberId);
    
    const updatedBarber = {
        ...barberData,
        updatedAt: serverTimestamp(),
    };
    
    updateDoc(barberRef, updatedBarber)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: barberRef.path,
        operation: 'update',
        requestResourceData: updatedBarber,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

export function deleteBarber(db: Firestore, barbershopId: string, barberId: string) {
  const barberRef = doc(db, `barbershops/${barbershopId}/barbers`, barberId);
  
  deleteDoc(barberRef)
  .catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: barberRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

    