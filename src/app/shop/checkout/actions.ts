
'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, doc, writeBatch, serverTimestamp, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import type { MerchOrder, Transaction, Product } from '@/lib/types';
import { initiateStkPush } from '@/services/mpesa';
import { nanoid } from 'nanoid';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

export interface MerchOrderPayload {
  userName: string;
  userEmail: string;
  phoneNumber: string;
  items: {
      productId: string;
      productName: string;
      size: string;
      color: string;
      quantity: number;
      price: number;
  }[];
  total: number;
}

async function getUserIdFromSession(): Promise<string | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;
    try {
        const auth = await getAdminAuth();
        if (!auth) throw new Error("Server auth not initialized");
        return (await auth.verifySessionCookie(sessionCookie, true)).uid;
    } catch (error) {
        return null;
    }
}

export async function createMerchOrder(payload: MerchOrderPayload) {
    const userId = await getUserIdFromSession();
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    try {
        const productRef = doc(db, 'products', payload.items[0].productId);

        // Use a transaction to ensure atomicity for checking stock and creating the order
        const { orderId, transactionId } = await runTransaction(db, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error("Product not found.");
            }

            const product = productDoc.data() as Product;
            const requestedQuantity = payload.items[0].quantity;

            if (product.stock < requestedQuantity) {
                throw new Error("Insufficient stock for this item.");
            }

            const orderRef = doc(collection(db, 'merchOrders'));
            const orderData: Omit<MerchOrder, 'id'> = {
                userId: userId || undefined,
                userName: payload.userName,
                userEmail: payload.userEmail,
                paymentType: 'merchandise',
                items: payload.items,
                total: payload.total,
                status: 'pending', // Status is now pending until payment is confirmed
                confirmationCode: nanoid(8).toUpperCase(),
                createdAt: serverTimestamp(),
            };
            transaction.set(orderRef, orderData);
            
            const transactionRef = doc(collection(db, 'transactions'));
            const transactionData: Omit<Transaction, 'id'> = {
                orderId: orderRef.id,
                userId: userId,
                amount: payload.total,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'pending',
                method: 'mpesa',
                retryCount: 0,
                ipAddress,
            }
            transaction.set(transactionRef, transactionData);
            
            // Link transaction to merch order
            transaction.update(orderRef, { transactionId: transactionRef.id });

            // Decrement the stock within the transaction
            transaction.update(productRef, { stock: product.stock - requestedQuantity });

            return { orderId: orderRef.id, transactionId: transactionRef.id };
        });

        // Initiate STK Push after the transaction is successful
        const stkPushResult = await initiateStkPush({
            phoneNumber: payload.phoneNumber,
            amount: Math.round(payload.total),
            orderId: orderId,
        });

        if (!stkPushResult.success || !stkPushResult.checkoutRequestId) {
            throw new Error(stkPushResult.error || 'Failed to initiate M-Pesa payment.');
        }

        await updateDoc(doc(db, 'transactions', transactionId), { mpesaCheckoutRequestId: stkPushResult.checkoutRequestId });

        return { success: true, orderId, transactionId };

    } catch (error: any) {
        console.error('Error creating merchandise order:', error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}
