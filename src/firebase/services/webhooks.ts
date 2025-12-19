
'use client';
import {
  doc,
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
} from '@/firebase/errors';
import type { Webhook } from '@/lib/definitions';

type WebhookData = Omit<Webhook, 'id' | 'lastUsed' | 'lastStatus'>;
type UpdatableWebhookData = Omit<Webhook, 'id'>;

export function createWebhook(db: Firestore, barbershopId: string, webhookData: WebhookData) {
    const webhooksColRef = collection(db, `barbershops/${barbershopId}/webhooks`);
    
    const newWebhook = {
        ...webhookData,
        lastStatus: 'pending' as const,
        lastUsed: null,
        createdAt: serverTimestamp(),
    }
    
    addDoc(webhooksColRef, newWebhook)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: webhooksColRef.path,
        operation: 'create',
        requestResourceData: newWebhook,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

export function updateWebhook(db: Firestore, barbershopId: string, webhookId: string, webhookData: Partial<UpdatableWebhookData>) {
    const webhookRef = doc(db, `barbershops/${barbershopId}/webhooks`, webhookId);
    
    const updatedWebhook: Record<string, any> = { ...webhookData };
    if (webhookData.lastUsed) {
        updatedWebhook.lastUsed = Timestamp.fromDate(webhookData.lastUsed);
    }
    updatedWebhook.updatedAt = serverTimestamp();
    
    updateDoc(webhookRef, updatedWebhook)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: webhookRef.path,
        operation: 'update',
        requestResourceData: updatedWebhook,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

export function deleteWebhook(db: Firestore, barbershopId: string, webhookId: string) {
  const webhookRef = doc(db, `barbershops/${barbershopId}/webhooks`, webhookId);
  
  deleteDoc(webhookRef)
  .catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: webhookRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
