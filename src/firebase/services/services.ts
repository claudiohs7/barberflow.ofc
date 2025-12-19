
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
import type { Service } from '@/lib/definitions';

type ServiceData = Omit<Service, 'id'>;

export function createService(db: Firestore, barbershopId: string, serviceData: ServiceData) {
    const servicesColRef = collection(db, `barbershops/${barbershopId}/services`);
    
    const newService = {
        ...serviceData,
        createdAt: serverTimestamp(),
    }
    
    addDoc(servicesColRef, newService)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: servicesColRef.path,
        operation: 'create',
        requestResourceData: newService,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

export function updateService(db: Firestore, barbershopId: string, serviceId: string, serviceData: Partial<ServiceData>) {
    const serviceRef = doc(db, `barbershops/${barbershopId}/services`, serviceId);
    
    const updatedService = {
        ...serviceData,
        updatedAt: serverTimestamp(),
    };
    
    updateDoc(serviceRef, updatedService)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: serviceRef.path,
        operation: 'update',
        requestResourceData: updatedService,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

export function deleteService(db: Firestore, barbershopId: string, serviceId: string) {
  const serviceRef = doc(db, `barbershops/${barbershopId}/services`, serviceId);
  
  deleteDoc(serviceRef)
  .catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: serviceRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
