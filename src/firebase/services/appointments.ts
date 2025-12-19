
'use client';
import {
  doc,
  addDoc,
  collection,
  updateDoc,
  deleteDoc,
  Firestore,
  serverTimestamp,
  getDoc,
  getDocs,
  query,
  Timestamp,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {
  FirestorePermissionError,
} from '@/firebase/errors';
import type { Appointment, Barbershop, Barber, Service, Client, MessageTemplate } from '@/lib/definitions';


// Updated to accept partial data for guest appointments
type AppointmentData = Partial<Omit<Appointment, 'id'>>;

export async function createAppointment(db: Firestore, barbershopId: string, appointmentData: AppointmentData) {
    const appointmentsColRef = collection(db, `barbershops/${barbershopId}/appointments`);
    
    const newAppointment = {
        clientId: appointmentData.clientId !== undefined ? appointmentData.clientId : null,
        clientName: appointmentData.clientName || 'Convidado',
        clientPhone: appointmentData.clientPhone || '',
        barberId: appointmentData.barberId,
        serviceIds: appointmentData.serviceIds,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        status: appointmentData.status || 'confirmed',
        totalDuration: appointmentData.totalDuration,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }

    try {
        await addDoc(appointmentsColRef, newAppointment);
    } catch (serverError) {
         const permissionError = new FirestorePermissionError({
            path: appointmentsColRef.path,
            operation: 'create',
            requestResourceData: newAppointment,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
}

export function updateAppointment(db: Firestore, barbershopId: string, appointmentId: string, appointmentData: Partial<AppointmentData>) {
    const appointmentRef = doc(db, `barbershops/${barbershopId}/appointments`, appointmentId);
    
    const updatedAppointment = {
        ...appointmentData,
        updatedAt: serverTimestamp(),
    };
    
    updateDoc(appointmentRef, updatedAppointment)
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: appointmentRef.path,
        operation: 'update',
        requestResourceData: updatedAppointment,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

export function deleteAppointment(db: Firestore, barbershopId: string, appointmentId: string) {
  const appointmentRef = doc(db, `barbershops/${barbershopId}/appointments`, appointmentId);
  
  deleteDoc(appointmentRef)
  .catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: appointmentRef.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

    