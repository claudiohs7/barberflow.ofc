
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
  Timestamp,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {
  FirestorePermissionError,
  type SecurityRuleContext,
} from '@/firebase/errors';
import type { Expense } from '@/lib/definitions';

// Since the date from the form is a string, we expect a string here.
type ExpenseFormData = Omit<Expense, 'id' | 'barbershopId' | 'date'> & { date: string };


export function createExpense(db: Firestore, barbershopId: string, expenseData: ExpenseFormData) {
    const expensesColRef = collection(db, `barbershops/${barbershopId}/expenses`);
    const newExpense = {
        ...expenseData,
        barbershopId,
        date: Timestamp.fromDate(new Date(expenseData.date + 'T00:00:00')),
        createdAt: serverTimestamp(),
    }
    
    addDoc(expensesColRef, newExpense)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: expensesColRef.path,
        operation: 'create',
        requestResourceData: newExpense,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

export function updateExpense(db: Firestore, barbershopId: string, expenseId: string, expenseData: ExpenseFormData) {
    const expenseRef = doc(db, `barbershops/${barbershopId}/expenses`, expenseId);
    const updatedExpense = {
        ...expenseData,
        date: Timestamp.fromDate(new Date(expenseData.date + 'T00:00:00')),
        updatedAt: serverTimestamp(),
    };
    
    updateDoc(expenseRef, updatedExpense)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: expenseRef.path,
        operation: 'update',
        requestResourceData: updatedExpense,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

export function deleteExpense(db: Firestore, barbershopId: string, expenseId: string) {
  const expenseRef = doc(db, `barbershops/${barbershopId}/expenses`, expenseId);
  
  deleteDoc(expenseRef)
  .catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: expenseRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
