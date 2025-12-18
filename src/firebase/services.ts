
'use client';
import {
  doc,
  setDoc,
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
  type SecurityRuleContext,
} from '@/firebase/errors';
import type {
  Barber,
  Service,
  Appointment,
  Client,
  Expense,
  Barbershop,
} from '@/lib/definitions';

// Barbershop Services
export function createBarbershop(
  db: Firestore,
  barbershopData: Omit<Barbershop, 'id' | 'plan' | 'status' | 'expiryDate' | 'trialStart'>,
  userId: string
) {
  const barbershopRef = doc(db, 'barbershops', userId);
  const newBarbershop = { ...barbershopData, ownerId: userId, createdAt: serverTimestamp() };
  
  // Use .catch() to handle and enrich permission errors
  setDoc(barbershopRef, newBarbershop)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: barbershopRef.path,
        operation: 'create',
        requestResourceData: newBarbershop,
      });

      // Emit the contextual error globally
      errorEmitter.emit('permission-error', permissionError);
    });
}
