
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/server-config';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, increment, getDoc, runTransaction } from 'firebase/firestore';
import type { Order, Ticket, Transaction, Event, Tour, MerchOrder, Product } from '@/lib/types';
import { sendTicketEmail } from '@/services/email';

export async function POST(request: Request) {
    try {
        const callbackData = await request.json();
        console.log("Received M-Pesa Callback:", JSON.stringify(callbackData, null, 2));

        // Security check for the secret within the payload
        const secret = callbackData.secret;
        if (secret !== process.env.MPESA_CALLBACK_SECRET) {
            console.error("Invalid M-Pesa callback secret received in payload.");
            return NextResponse.json({ message: 'Invalid secret' }, { status: 403 });
        }
        
        const { Body: { stkCallback } } = callbackData;
        const checkoutRequestId = stkCallback.CheckoutRequestID;
        const resultCode = stkCallback.ResultCode;
        const resultDesc = stkCallback.ResultDesc;

        if (!checkoutRequestId) {
             console.error("Callback missing CheckoutRequestID.");
             return NextResponse.json({ message: 'Invalid callback data' }, { status: 400 });
        }

        const transactionsRef = collection(db, 'transactions');
        const q = query(transactionsRef, where('mpesaCheckoutRequestId', '==', checkoutRequestId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error(`Transaction not found for CheckoutRequestID: ${checkoutRequestId}`);
            return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
        }

        const transactionDoc = querySnapshot.docs[0];
        const transaction = transactionDoc.data() as Transaction;
        
        // --- VULNERABILITY FIX: IDEMPOTENCY CHECKS ---
        // 1. Primary check on the associated Order to ensure it hasn't been completed already.
        const orderRef = doc(db, 'orders', transaction.orderId);
        const orderDoc = await orderRef.get();
        if (orderDoc.exists() && orderDoc.data().status === 'completed') {
            console.warn(`Order ${transaction.orderId} already completed. Ignoring callback for transaction ${transactionDoc.id}.`);
            return NextResponse.json({ message: 'Order already processed.' });
        }
        
        // 2. Secondary check on the transaction itself.
        if (transaction.status === 'completed' || transaction.status === 'failed') {
            console.warn(`Transaction ${transactionDoc.id} already processed with status: ${transaction.status}`);
            return NextResponse.json({ message: 'Transaction already processed' });
        }
        
        const batch = writeBatch(db);
        const transactionRef = doc(db, 'transactions', transactionDoc.id);

        if (resultCode === 0) {
            // Success
            const updatePayload: any = {
                status: 'completed',
                mpesaCallbackData: stkCallback,
                updatedAt: serverTimestamp(),
                failReason: null,
            };
            
            if (stkCallback.CallbackMetadata) {
                const metadataItem = (name: string) => stkCallback.CallbackMetadata.Item.find((item: any) => item.Name === name)?.Value;
                updatePayload.mpesaConfirmationCode = metadataItem('MpesaReceiptNumber');
                updatePayload.mpesaTransactionDate = metadataItem('TransactionDate');
                updatePayload.mpesaPayerPhoneNumber = metadataItem('PhoneNumber');
            }
            batch.update(transactionRef, updatePayload);

            // Determine if it's a regular order or a merch order
            const merchOrderRef = doc(db, 'merchOrders', transaction.orderId);
            const merchOrderDoc = await getDoc(merchOrderRef);

            if (orderDoc.exists()) {
                const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
                batch.update(orderRef, { status: 'completed', updatedAt: serverTimestamp() });
                
                if (order.paymentType === 'full') {
                    const createdTickets: Omit<Ticket, 'id'>[] = [];
                    for (const ticketItem of order.tickets) {
                        for (let i = 0; i < ticketItem.quantity; i++) {
                            const ticketRef = doc(collection(db, 'tickets'));
                            const newTicket: Omit<Ticket, 'id'> = {
                                orderId: transaction.orderId,
                                userId: order.userId,
                                userName: order.userName,
                                listingId: order.listingId,
                                ticketType: ticketItem.name,
                                qrCode: ticketRef.id,
                                status: 'valid',
                                createdAt: serverTimestamp(),
                                generatedBy: 'online_sale',
                            };
                            batch.set(ticketRef, newTicket);
                            createdTickets.push(newTicket);
                        }
                    }
                    let eventName = 'Your Booking';
                    const listingCollection = order.listingType === 'event' ? 'events' : 'tours';
                    try {
                        const eventDocRef = doc(db, listingCollection, order.listingId);
                        const eventDoc = await eventDocRef.get();
                        if (eventDoc.exists()) { eventName = (eventDoc.data() as Event | Tour).name; }
                    } catch (e) { console.error("Could not fetch listing name for email.", e); }

                    await sendTicketEmail({
                        to: order.userEmail,
                        attendeeName: order.userName,
                        orderId: order.id,
                        eventName: eventName,
                        tickets: createdTickets.map(t => ({ ticketType: t.ticketType, qrCode: t.qrCode }))
                    });
                }
                if (order.promocodeId) {
                    const promocodeRef = doc(db, 'promocodes', order.promocodeId);
                    batch.update(promocodeRef, { usageCount: increment(1), revenueGenerated: increment(order.total) });
                }
                if(order.trackingLinkId) {
                    const collectionPath = order.promocodeId ? `promocodes/${order.promocodeId}/trackingLinks` : 'trackingLinks';
                    const trackingLinkRef = doc(db, collectionPath, order.trackingLinkId);
                    const trackingLinkDoc = await getDoc(trackingLinkRef);
                    if (trackingLinkDoc.exists()) { batch.update(trackingLinkRef, { purchases: increment(1) }); }
                }

            } else if (merchOrderDoc.exists()) {
                // This is a Merchandise Order
                await runTransaction(db, async (firestoreTransaction) => {
                    const merchOrder = merchOrderDoc.data() as MerchOrder;
                    for (const item of merchOrder.items) {
                        const productRef = doc(db, 'products', item.productId);
                        const productDoc = await firestoreTransaction.get(productRef);
                        if (!productDoc.exists()) { throw new Error(`Product ${item.productId} not found during stock update.`); }
                        const product = productDoc.data() as Product;
                        if (product.stock < item.quantity) { throw new Error(`Insufficient stock for ${product.name}.`); }
                        firestoreTransaction.update(productRef, { stock: increment(-item.quantity) });
                    }
                    firestoreTransaction.update(merchOrderRef, { status: 'awaiting_pickup' });
                });

            } else {
                console.error(`Order or MerchOrder ${transaction.orderId} not found!`);
                await batch.commit(); // commit the transaction update at least
                return NextResponse.json({ message: 'Order/MerchOrder not found' }, { status: 404 });
            }

        } else {
            // This is a failed transaction
            if (orderDoc.exists()) {
                 batch.update(orderRef, { status: 'failed', updatedAt: serverTimestamp() });
            } else {
                // It might be a merch order, mark it as failed too if it exists.
                const merchOrderRef = doc(db, 'merchOrders', transaction.orderId);
                const merchOrderDoc = await getDoc(merchOrderRef);
                if (merchOrderDoc.exists()) {
                     batch.update(merchOrderRef, { status: 'failed', updatedAt: serverTimestamp() });
                }
            }

            batch.update(transactionRef, {
                status: 'failed',
                failReason: resultDesc,
                mpesaCallbackData: stkCallback,
                updatedAt: serverTimestamp(),
                retryCount: increment(1)
            });
        }
        
        await batch.commit();

        console.log(`Successfully processed callback for transaction ${transactionDoc.id}. Status: ${resultCode === 0 ? 'completed' : 'failed'}`);
        return NextResponse.json({ message: 'Callback received successfully' });

    } catch (error) {
        console.error('Error processing M-Pesa callback:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
    }
}

    