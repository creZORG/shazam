
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, orderBy, getDocs, Timestamp, documentId } from 'firebase/firestore';
import type { Transaction, Order, FirebaseUser, Event, UserEvent, Tour, Ticket } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { sendTicketEmail } from '@/services/email';

type TransactionDetails = {
    transaction: Transaction & { id: string };
    order: Order & { id: string };
    user: (FirebaseUser & { uid: string }) | null;
    listing: (Event | Tour) & { id: string };
    userActivity: UserEvent[];
    tickets: Ticket[];
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
        // 1. Fetch Transaction
        const txRef = doc(db, 'transactions', transactionId);
        const txSnap = await getDoc(txRef);
        if (!txSnap.exists()) return { success: false, error: 'Transaction not found.' };
        const transaction = serializeData(txSnap) as Transaction & { id: string };

        // 2. Fetch Order
        const orderRef = doc(db, 'orders', transaction.orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return { success: false, error: 'Associated order not found.' };
        const order = serializeData(orderSnap) as Order & { id: string };

        // 3. Fetch User (if exists)
        let user: (FirebaseUser & { uid: string }) | null = null;
        if (order.userId) {
            const userRef = doc(db, 'users', order.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                user = serializeData(userSnap) as FirebaseUser & { uid: string };
            }
        }

        // 4. Fetch Event/Tour
        const listingCollection = order.listingType === 'event' ? 'events' : 'tours';
        const listingRef = doc(db, listingCollection, order.listingId);
        const listingSnap = await getDoc(listingRef);
        if (!listingSnap.exists()) return { success: false, error: 'Associated listing not found.' };
        const listing = serializeData(listingSnap) as (Event | Tour) & { id: string };


        // 5. Fetch User Activity before the transaction
        let userActivity: UserEvent[] = [];
        if (order.userId) {
            const activityQuery = query(
                collection(db, 'userEvents'),
                where('uid', '==', order.userId),
                where('eventId', '==', order.listingId),
                where('timestamp', '<', new Date(transaction.createdAt as any).getTime()), // Activity before transaction
                orderBy('timestamp', 'desc')
            );
            const activitySnapshot = await getDocs(activityQuery);
            userActivity = activitySnapshot.docs.map(doc => serializeData(doc) as UserEvent);
        }
        
        // 6. Fetch Generated Tickets for completed orders
        let tickets: Ticket[] = [];
        if (transaction.status === 'completed') {
            const ticketsQuery = query(collection(db, 'tickets'), where('orderId', '==', order.id));
            const ticketsSnapshot = await getDocs(ticketsQuery);
            tickets = ticketsSnapshot.docs.map(d => serializeData(d) as Ticket);
        }

        return {
            success: true,
            data: { transaction, order, user, listing, userActivity, tickets }
        };

    } catch (error: any) {
        console.error("Error fetching transaction details:", error);
        return { success: false, error: 'Failed to fetch transaction details.' };
    }
}


interface ResendEmailPayload {
    orderId: string;
    to: string;
    eventName: string;
}

export async function resendTicketEmail(payload: ResendEmailPayload): Promise<{ success: boolean; error?: string }> {
    const { orderId, to, eventName } = payload;
    if (!orderId || !to || !eventName) {
        return { success: false, error: 'Missing required information for resend.' };
    }

    try {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (!orderSnap.exists()) {
            return { success: false, error: 'Order not found.' };
        }
        const order = orderSnap.data() as Order;

        const ticketsQuery = query(collection(db, 'tickets'), where('orderId', '==', orderId));
        const ticketsSnapshot = await getDocs(ticketsQuery);
        if (ticketsSnapshot.empty) {
            return { success: false, error: 'No tickets found for this order to send.' };
        }
        const tickets = ticketsSnapshot.docs.map(doc => doc.data() as Ticket);

        await sendTicketEmail({
            to,
            attendeeName: order.userName,
            orderId: orderId,
            eventName: eventName,
            tickets: tickets.map(t => ({ ticketType: t.ticketType, qrCode: t.qrCode }))
        });

        return { success: true };
    } catch (e: any) {
        console.error('Error resending ticket email:', e);
        return { success: false, error: 'Failed to resend email.' };
    }
}
