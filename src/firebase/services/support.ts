

'use client';
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  deleteDoc,
  Firestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {
  FirestorePermissionError,
} from '@/firebase/errors';
import type { SupportTicket, SupportTicketResponse } from '@/lib/definitions';

type SupportTicketData = Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'assignedTo'>;
type SupportTicketResponseData = Omit<SupportTicketResponse, 'id' | 'createdAt'>;


export async function createSupportTicket(db: Firestore, ticketData: SupportTicketData) {
    const ticketsColRef = collection(db, `support_tickets`);
    const newTicketId = doc(ticketsColRef).id;
    
    const newTicket = {
        title: ticketData.title,
        description: ticketData.description,
        barbershopId: ticketData.barbershopId,
        status: "open" as const,
        priority: "medium" as const,
        category: ticketData.category,
        createdBy: ticketData.createdBy,
        clientEmail: ticketData.clientEmail,
        clientName: ticketData.clientName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    const ticketDocRef = doc(db, 'support_tickets', newTicketId);

    try {
        await setDoc(ticketDocRef, newTicket);
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: ticketDocRef.path,
            operation: 'create',
            requestResourceData: newTicket,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw new Error("Falha ao criar o ticket no banco de dados.");
    }

    return newTicketId;
}

export function updateSupportTicket(db: Firestore, ticketId: string, dataToUpdate: Partial<SupportTicketData & {status: SupportTicket['status']}>) {
    const ticketRef = doc(db, 'support_tickets', ticketId);
    
    const updatedTicket = {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
    };
    
    updateDoc(ticketRef, updatedTicket)
    .catch((serverError) => {
         const permissionError = new FirestorePermissionError({
            path: ticketRef.path,
            operation: 'update',
            requestResourceData: updatedTicket,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export function deleteSupportTicket(db: Firestore, ticketId: string) {
    const ticketRef = doc(db, 'support_tickets', ticketId);
    
    deleteDoc(ticketRef)
    .catch((serverError) => {
         const permissionError = new FirestorePermissionError({
            path: ticketRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function addResponseToTicket(db: Firestore, ticketId: string, responseData: SupportTicketResponseData) {
    const responsesColRef = collection(db, `support_tickets/${ticketId}/responses`);
    
    const newResponse = {
        message: responseData.message,
        createdBy: responseData.createdBy,
        isAdmin: responseData.isAdmin,
        createdAt: serverTimestamp(),
    };

    addDoc(responsesColRef, newResponse)
    .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: responsesColRef.path,
            operation: 'create',
            requestResourceData: newResponse,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}
