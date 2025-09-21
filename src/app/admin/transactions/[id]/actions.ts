
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, documentId, updateDoc } from 'firebase/firestore';
import type { Transaction, Order, FirebaseUser, Event, Tour, Ticket } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { logAdminAction } from '@/services/audit-service';
import { sendTicketStatusUpdateEmail } from '@/services/email';

type TransactionDetails = {
    transaction: Transaction & { id: string };
    order: Order & { id: string };
    user: (FirebaseUser & { uid: string }) | null;
    listing: (Event | Tour) & { id: string };
    tickets: (Ticket & { id: string })[];
}

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

export async function getTransactionDetails(transactionId: string): Promise<{ success: boolean; data?: TransactionDetails; error?: string; }> {
    noStore();
    if (!transactionId) {
        return { success: false, error: 'Transaction ID is required.' };
    }

    try {
        const txRef = doc(db, 'transactions', transactionId);
        const txSnap = await getDoc(txRef);
        if (!txSnap.exists()) return { success: false, error: 'Transaction not found.' };
        const transaction = serializeData(txSnap) as Transaction & { id: string };

        const orderRef = doc(db, 'orders', transaction.orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return { success: false, error: 'Associated order not found.' };
        const order = serializeData(orderSnap) as Order & { id: string };

        let user: (FirebaseUser & { uid: string }) | null = null;
        if (order.userId) {
            const userRef = doc(db, 'users', order.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                user = serializeData(userSnap) as FirebaseUser & { uid: string };
            }
        }

        const listingCollection = order.listingType === 'event' ? 'events' : 'tours';
        const listingRef = doc(db, listingCollection, order.listingId);
        const listingSnap = await getDoc(listingRef);
        if (!listingSnap.exists()) return { success: false, error: 'Associated listing not found.' };
        const listing = serializeData(listingSnap) as (Event | Tour) & { id: string };

        const ticketsQuery = query(collection(db, 'tickets'), where('orderId', '==', order.id));
        const ticketsSnapshot = await getDocs(ticketsQuery);
        const tickets = ticketsSnapshot.docs.map(serializeData) as (Ticket & { id: string })[];


        return {
            success: true,
            data: { transaction, order, user, listing, tickets }
        };

    } catch (error: any) {
        console.error("Error fetching transaction details:", error);
        return { success: false, error: 'Failed to fetch transaction details.' };
    }
}


export async function updateTicketStatus(ticketId: string, newStatus: 'valid' | 'invalid'): Promise<{ success: boolean; error?: string }> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated.' };

    try {
        const auth = await getAdminAuth();
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        const ticketRef = doc(db, 'tickets', ticketId);
        const ticketDoc = await getDoc(ticketRef);
        if (!ticketDoc.exists()) return { success: false, error: 'Ticket not found.' };
        
        const ticketData = ticketDoc.data() as Ticket;
        const oldStatus = ticketData.status;

        await updateDoc(ticketRef, { status: newStatus });
        
        // Log the admin action
        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_ticket_status',
            targetType: 'event', // Assuming tickets are part of an event context
            targetId: ticketData.listingId,
            details: { ticketId, from: oldStatus, to: newStatus }
        });

        // Send email notification
        const orderRef = doc(db, 'orders', ticketData.orderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
            const orderData = orderSnap.data() as Order;
            const eventRef = doc(db, 'events', ticketData.listingId);
            const eventSnap = await getDoc(eventRef);
            const eventName = eventSnap.exists() ? (eventSnap.data() as Event).name : 'your event';
            
            await sendTicketStatusUpdateEmail({
                to: orderData.userEmail,
                attendeeName: orderData.userName,
                eventName: eventName,
                ticketType: ticketData.ticketType,
                newStatus: newStatus
            });
        }


        return { success: true };
    } catch (e: any) {
        console.error("Error updating ticket status:", e);
        return { success: false, error: 'Failed to update ticket status.' };
    }
}
