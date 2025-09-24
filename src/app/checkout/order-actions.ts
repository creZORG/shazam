
'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, doc, getDoc, serverTimestamp, query, where, getDocs, writeBatch, updateDoc, increment, orderBy, limit, Timestamp, runTransaction } from 'firebase/firestore';
import type { Order, Transaction, Promocode, CheckoutFeedback, Event, TicketDefinition } from '@/lib/types';
import { initiateStkPush } from '@/services/mpesa';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { createNotification } from '@/services/notifications';
import { checkRateLimit, recordRateLimit } from '@/services/rate-limit-service';

export interface OrderPayload {
  userId?: string; // Optional for guest checkout
  userName: string;
  userEmail: string;
  listingId: string;
  organizerId: string;
  listingType: 'event' | 'tour';
  paymentType: 'full' | 'booking';
  tickets: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  platformFee: number;
  processingFee: number;
  total: number;
  promocode?: string;
  trackingLinkId?: string;
  phoneNumber: string;
  channel: "direct" | "referral" | "ad" | "search" | "organic_social";
}

async function getUserIdFromSession(): Promise<string | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return null;
    }
    try {
        const auth = await getAdminAuth();
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error("Error verifying session cookie in getUserIdFromSession:", error);
        return null;
    }
}

export async function checkForRecentOrder(listingId: string): Promise<{ recentOrder: boolean, orderId?: string }> {
    noStore();
    const userId = await getUserIdFromSession();
    if (!userId) return { recentOrder: false };

    try {
        const threeMinutesAgo = Timestamp.fromMillis(Date.now() - 3 * 60 * 1000);
        const q = query(
            collection(db, 'orders'),
            where('userId', '==', userId),
            where('listingId', '==', listingId),
            where('status', '==', 'completed'),
            where('createdAt', '>=', threeMinutesAgo),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            return { recentOrder: true, orderId: snapshot.docs[0].id };
        }
        return { recentOrder: false };

    } catch (e) {
        console.error("Error checking for recent order:", e);
        return { recentOrder: false }; // Fail silently
    }
}


export async function createOrderAndInitiatePayment(
  payload: OrderPayload
): Promise<{ success: boolean; error?: string; orderId?: string; transactionId?: string; }> {
    noStore();
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('cf-connecting-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    const userId = await getUserIdFromSession();

    if (!payload.userEmail || !payload.userName || !payload.phoneNumber) {
        return { success: false, error: 'User details are missing.' };
    }
    
    // Enforce Rate Limiting
    const rateLimitResult = await checkRateLimit(ipAddress, payload.listingId);
    if (!rateLimitResult.success) {
        return { success: false, error: rateLimitResult.error };
    }


    try {
        const { orderId, transactionId } = await runTransaction(db, async (transaction) => {
            const eventRef = doc(db, 'events', payload.listingId);
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists()) {
                throw new Error("Event not found. It may have been removed.");
            }

            const eventData = eventDoc.data() as Event;

            // Check ticket availability within the transaction
            for (const ticket of payload.tickets) {
                const ticketDef = eventData.tickets?.find(t => t.name === ticket.name);
                if (!ticketDef) {
                    throw new Error(`Ticket type "${ticket.name}" is no longer available.`);
                }
                const ticketsSoldForType = (eventData.ticketsSold && eventData.ticketsSold[ticket.name]) || 0;
                if (ticketsSoldForType + ticket.quantity > ticketDef.quantity) {
                    throw new Error(`Not enough tickets left for "${ticket.name}". Only ${ticketDef.quantity - ticketsSoldForType} available.`);
                }
            }

            // All checks passed, proceed with creating the order.
            
            let promocodeId: string | undefined = undefined;
            if (payload.promocode) {
                const q = query(collection(db, 'promocodes'), where('code', '==', payload.promocode));
                const promocodeSnapshot = await getDocs(q); // Note: getDocs is not allowed in transactions, but this is a read before write starts. Let's see if it works.
                if (!promocodeSnapshot.empty) {
                    promocodeId = promocodeSnapshot.docs[0].id;
                }
            }

            const orderRef = doc(collection(db, 'orders'));
            const orderData: Omit<Order, 'id'> = {
                userId: userId,
                userName: payload.userName,
                userEmail: payload.userEmail,
                userPhone: payload.phoneNumber,
                listingId: payload.listingId,
                organizerId: payload.organizerId,
                listingType: payload.listingType,
                paymentType: payload.paymentType,
                tickets: payload.tickets,
                subtotal: payload.subtotal,
                discount: payload.discount,
                platformFee: payload.platformFee,
                processingFee: payload.processingFee,
                total: payload.total,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'pending',
                channel: payload.channel,
                deviceInfo: { userAgent, ipAddress },
                promocodeId: promocodeId,
                trackingLinkId: payload.trackingLinkId,
                freeMerch: eventData.freeMerch,
            };
            
            transaction.set(orderRef, orderData);
            
            const transactionRef = doc(collection(db, 'transactions'));
            transaction.set(transactionRef, {
                orderId: orderRef.id,
                userId: userId,
                amount: payload.total,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'pending',
                method: 'mpesa',
                retryCount: 0,
                ipAddress,
            } as Omit<Transaction, 'id' | 'mpesaCheckoutRequestId'>);
            
            // Increment the ticketsSold counts on the event
            const soldUpdates: { [key: string]: any } = {};
            let totalTicketsInOrder = 0;
            for (const ticket of payload.tickets) {
                 soldUpdates[`ticketsSold.${ticket.name}`] = increment(ticket.quantity);
                 totalTicketsInOrder += ticket.quantity;
            }
            soldUpdates['totalTicketsSold'] = increment(totalTicketsInOrder);

            transaction.update(eventRef, soldUpdates);
            
            return { orderId: orderRef.id, transactionId: transactionRef.id };
        });

        // Actions to perform after successful transaction commit
        await recordRateLimit(ipAddress, payload.listingId);

        await createNotification({
            type: 'new_order',
            message: `${payload.userName} just placed an order for ${payload.tickets.reduce((sum, t) => sum + t.quantity, 0)} ticket(s).`,
            link: `/admin/transactions/${transactionId}`,
            targetRoles: ['admin', 'super-admin'],
            targetUsers: [payload.organizerId]
        });

        const stkPushResult = await initiateStkPush({
            phoneNumber: payload.phoneNumber,
            amount: Math.round(payload.total),
            orderId: orderId,
        });

        if (!stkPushResult.success || !stkPushResult.checkoutRequestId) {
            throw new Error(stkPushResult.error || 'Failed to initiate STK push.');
        }

        await updateDoc(doc(db, 'transactions', transactionId), { mpesaCheckoutRequestId: stkPushResult.checkoutRequestId });


        return { success: true, orderId: orderId, transactionId: transactionId };

    } catch (error) {
        console.error('Error creating order:', error);
        // If the transaction fails, we still record the attempt for rate limiting purposes.
        await recordRateLimit(ipAddress, payload.listingId);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: errorMessage };
    }
}

function translateMpesaError(reason: string | null | undefined): string {
    if (!reason) return 'An unknown error occurred.';

    if (reason.includes('1032')) {
        return "You cancelled the M-Pesa request on your phone. Please try again when you're ready.";
    }
    if (reason.includes('1037')) {
        return "Oops! The M-Pesa prompt on your phone timed out. Please try again and enter your PIN more quickly.";
    }
    if (reason.includes('2001')) {
        return "You have insufficient funds in your M-Pesa account to complete this transaction.";
    }
    if (reason.includes('The transaction is already in process')) {
        return "Another payment is already in progress for this order. Please wait a moment for it to complete.";
    }
    
    // Fallback for unknown errors
    return reason;
}

export async function getTransactionStatus(transactionId: string) {
    noStore();
    try {
        const txDoc = await getDoc(doc(db, 'transactions', transactionId));
        if (!txDoc.exists()) {
            return { success: false, error: 'Transaction not found.' };
        }
        const txData = txDoc.data() as Transaction;
        return {
            success: true,
            status: txData.status,
            failReason: translateMpesaError(txData.failReason),
            retryCount: txData.retryCount || 0
        };
    } catch(e: any) {
        return { success: false, error: e.message };
    }
}

export async function logCheckoutRating(rating: number, reason: string, orderId: string) {
    const userId = await getUserIdFromSession();
    try {
        const feedback: Partial<CheckoutFeedback> = {
            orderId,
            userId,
            rating,
            createdAt: serverTimestamp(),
        };
        if (reason) {
            feedback.reason = reason;
        }
        
        const batch = writeBatch(db);

        const feedbackRef = doc(collection(db, 'checkoutFeedback'));
        batch.set(feedbackRef, feedback);

        if (userId) {
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, { loyaltyPoints: increment(50) });
        }
        
        await batch.commit();

        return { success: true };
    } catch (e: any) {
        console.error('Failed to log checkout rating', e);
        return { success: false, error: e.message };
    }
}
