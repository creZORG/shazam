
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy, collectionGroup } from 'firebase/firestore';
import type { Transaction, Order } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

type SearchableTransaction = Transaction & {
    order?: Order;
};

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

export async function searchTransactions(
  searchTerm: string,
  searchType: 'email' | 'phone' | 'receipt'
): Promise<{ success: boolean; data?: SearchableTransaction[]; error?: string; }> {
    noStore();
    if (!searchTerm) {
        return { success: false, error: 'Search term is required.' };
    }

    try {
        let transactions: SearchableTransaction[] = [];
        let orderMap: { [orderId: string]: Order } = {};
        let transactionDocs: any[] = [];

        if (searchType === 'email' || searchType === 'phone') {
            const ordersQuery = query(
                collection(db, 'orders'),
                where(searchType === 'email' ? 'userEmail' : 'userPhone', '==', searchTerm)
            );
            const ordersSnapshot = await getDocs(ordersQuery);
            if (ordersSnapshot.empty) return { success: true, data: [] };
            
            const orderIds = ordersSnapshot.docs.map(doc => {
                const orderData = serializeData(doc) as Order;
                orderMap[doc.id] = orderData;
                return doc.id;
            });
            
            // Firestore 'in' query is limited to 30 items. For more, batching would be needed.
            if(orderIds.length > 0) {
                 const transactionsQuery = query(collection(db, 'transactions'), where('orderId', 'in', orderIds));
                 const transactionsSnapshot = await getDocs(transactionsQuery);
                 transactionDocs = transactionsSnapshot.docs;
            }

        } else { // search by receipt
            const q = query(collection(db, 'transactions'), where('mpesaConfirmationCode', '==', searchTerm));
            const snapshot = await getDocs(q);
            transactionDocs = snapshot.docs;

            if (!snapshot.empty) {
                const orderIds = snapshot.docs.map(doc => doc.data().orderId);
                 if (orderIds.length > 0) {
                    const ordersQuery = query(collection(db, 'orders'), where('__name__', 'in', orderIds));
                    const ordersSnapshot = await getDocs(ordersQuery);
                    ordersSnapshot.forEach(doc => {
                        orderMap[doc.id] = serializeData(doc) as Order;
                    });
                 }
            }
        }
        
        transactions = transactionDocs.map(doc => {
            const tx = serializeData(doc) as Transaction;
            return {
                ...tx,
                order: orderMap[tx.orderId],
            };
        });

        // Sort by date descending
        transactions.sort((a,b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

        return { success: true, data: transactions };
        
    } catch (error: any) {
        console.error("Error searching transactions:", error);
        return { success: false, error: 'Failed to search transactions.' };
    }
}
