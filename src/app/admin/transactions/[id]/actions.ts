
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, documentId } from 'firebase/firestore';
import type { Transaction, Order, FirebaseUser, Event, Tour } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

type TransactionDetails = {
    transaction: Transaction & { id: string };
    order: Order & { id: string };
    user: (FirebaseUser & { uid: string }) | null;
    listing: (Event | Tour) & { id: string };
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

        return {
            success: true,
            data: { transaction, order, user, listing }
        };

    } catch (error: any) {
        console.error("Error fetching transaction details:", error);
        return { success: false, error: 'Failed to fetch transaction details.' };
    }
}
