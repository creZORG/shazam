
'use server';

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server-config';
import { FieldValue } from 'firebase-admin/firestore';
import type { Order, Ticket, Transaction, Event, Tour, MerchOrder, Product } from '@/lib/types';
import { sendTicketEmail } from '@/services/email';

export async function POST(request: Request, { params }: { params: { secret:string } }) {
    console.log("--- M-PESA CALLBACK ENDPOINT HIT ---");

    const secret = params.secret;
    if (secret !== process.env.MPESA_CALLBACK_SECRET) {
        console.error("!!! CRITICAL: Invalid M-Pesa callback secret received in URL. Halting execution. !!!");
        console.error(`Received Secret: ${secret}`);
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid secret" }, { status: 403 });
    }
    console.log("Callback secret validated successfully.");
    
    let db;
    try {
        db = await getAdminDb();
    } catch(e: any) {
        console.error("!!! FATAL ERROR initializing Firestore Admin DB:", e);
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Server Error" }, { status: 500 });
    }

    try {
        const callbackData = await request.json();
        console.log("Received M-Pesa Callback Body:", JSON.stringify(callbackData, null, 2));

        const { Body: { stkCallback } } = callbackData;
        const checkoutRequestId = stkCallback.CheckoutRequestID;
        const resultCode = stkCallback.ResultCode;
        const resultDesc = stkCallback.ResultDesc;

        if (!checkoutRequestId) {
             console.error("Callback is missing CheckoutRequestID. Invalid payload structure.");
             return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback data" }, { status: 400 });
        }
        console.log(`Processing callback for CheckoutRequestID: ${checkoutRequestId}`);
        
        const transactionsRef = db.collection('transactions');
        const q = transactionsRef.where('mpesaCheckoutRequestId', '==', checkoutRequestId);
        const querySnapshot = await q.get();


        if (querySnapshot.empty) {
            console.error(`Transaction not found for CheckoutRequestID: ${checkoutRequestId}. This might be a test callback or an old request.`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
        }
        console.log(`Found matching transaction document: ${querySnapshot.docs[0].id}`);
        
        const transactionDoc = querySnapshot.docs[0];
        const transaction = transactionDoc.data() as Transaction;
        
        const orderRef = db.collection('orders').doc(transaction.orderId);

        await db.runTransaction(async (firestoreTransaction) => {
            const orderDoc = await firestoreTransaction.get(orderRef);
            if (orderDoc.exists && orderDoc.data()?.status === 'completed') {
                console.warn(`Idempotency check: Order ${transaction.orderId} already completed. Ignoring callback.`);
                return;
            }

            const currentTransactionDoc = await firestoreTransaction.get(transactionDoc.ref);
            const currentTransaction = currentTransactionDoc.data() as Transaction;
             if (currentTransaction.status === 'completed' || currentTransaction.status === 'failed') {
                 console.warn(`Idempotency check: Transaction ${transactionDoc.id} already processed with status: ${currentTransaction.status}. Ignoring callback.`);
                 return;
            }
            
            if (resultCode === 0) {
                console.log(`Payment successful for ${checkoutRequestId}. ResultCode: 0.`);
                const updatePayload: any = {
                    status: 'completed',
                    mpesaCallbackData: stkCallback,
                    updatedAt: FieldValue.serverTimestamp(),
                    failReason: null,
                };
                 if (stkCallback.CallbackMetadata) {
                    const metadataItem = (name: string) => stkCallback.CallbackMetadata.Item.find((item: any) => item.Name === name)?.Value;
                    updatePayload.mpesaConfirmationCode = metadataItem('MpesaReceiptNumber');
                    updatePayload.mpesaTransactionDate = metadataItem('TransactionDate');
                    updatePayload.mpesaPayerPhoneNumber = metadataItem('PhoneNumber');
                    console.log(`Extracted M-Pesa Receipt: ${updatePayload.mpesaConfirmationCode}`);
                }
                firestoreTransaction.update(transactionDoc.ref, updatePayload);
                
                const merchOrderRef = db.collection('merchOrders').doc(transaction.orderId);
                const merchOrderDoc = await firestoreTransaction.get(merchOrderRef);

                if (orderDoc.exists) {
                    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
                    firestoreTransaction.update(orderRef, { status: 'completed', updatedAt: FieldValue.serverTimestamp() });

                    const listingRef = db.collection(order.listingType === 'event' ? 'events' : 'tours').doc(order.listingId);
                    firestoreTransaction.update(listingRef, { totalRevenue: FieldValue.increment(order.total) });

                    if (order.userId) {
                        const userRef = db.collection('users').doc(order.userId);
                        firestoreTransaction.update(userRef, { totalPurchases: FieldValue.increment(order.total) });
                    }
                    
                    if (order.paymentType === 'full' && order.listingType === 'event') {
                        console.log("Full payment for an event detected. Generating tickets...");
                        for (const ticketItem of order.tickets) {
                            for (let i = 0; i < ticketItem.quantity; i++) {
                                const ticketRef = db.collection('tickets').doc();
                                firestoreTransaction.set(ticketRef, {
                                    orderId: transaction.orderId,
                                    userId: order.userId,
                                    userName: order.userName,
                                    listingId: order.listingId,
                                    ticketType: ticketItem.name,
                                    qrCode: ticketRef.id,
                                    status: 'valid',
                                    createdAt: FieldValue.serverTimestamp(),
                                    generatedBy: 'online_sale',
                                });
                            }
                        }
                    }
                    if (order.promocodeId) {
                        const promocodeRef = db.collection('promocodes').doc(order.promocodeId);
                        firestoreTransaction.update(promocodeRef, { 
                            usageCount: FieldValue.increment(1), 
                            revenueGenerated: FieldValue.increment(order.total) 
                        });
                    }
                    if(order.trackingLinkId) {
                        const collectionPath = order.promocodeId ? `promocodes/${order.promocodeId}/trackingLinks` : 'trackingLinks';
                        const trackingLinkRef = db.collection(collectionPath).doc(order.trackingLinkId);
                         firestoreTransaction.update(trackingLinkRef, { purchases: FieldValue.increment(1) }); 
                    }

                } else if (merchOrderDoc.exists) {
                    const merchOrder = merchOrderDoc.data() as MerchOrder;
                    for (const item of merchOrder.items) {
                        const productRef = db.collection('products').doc(item.productId);
                        firestoreTransaction.update(productRef, { stock: FieldValue.increment(-item.quantity) });
                    }
                    firestoreTransaction.update(merchOrderRef, { status: 'awaiting_pickup' });
                }

            } else {
                console.warn(`Payment failed for ${checkoutRequestId}. ResultCode: ${resultCode}. Reason: ${resultDesc}`);
                if (orderDoc.exists) {
                     firestoreTransaction.update(orderRef, { status: 'failed', updatedAt: FieldValue.serverTimestamp() });
                } else {
                    const merchOrderRef = db.collection('merchOrders').doc(transaction.orderId);
                    if ((await firestoreTransaction.get(merchOrderRef)).exists) {
                        firestoreTransaction.update(merchOrderRef, { status: 'failed', updatedAt: FieldValue.serverTimestamp() });
                    }
                }
                firestoreTransaction.update(transactionDoc.ref, {
                    status: 'failed',
                    failReason: resultDesc,
                    mpesaCallbackData: stkCallback,
                    updatedAt: FieldValue.serverTimestamp(),
                    retryCount: FieldValue.increment(1)
                });
            }
        });

        if (resultCode === 0) {
            const finalOrderDoc = await orderRef.get();
            if (finalOrderDoc.exists) {
                const orderData = finalOrderDoc.data() as Order;
                if (orderData.paymentType === 'full' && orderData.listingType === 'event') {
                    const ticketsSnapshot = await db.collection('tickets').where('orderId', '==', orderData.id).get();
                    const tickets = ticketsSnapshot.docs.map(d => d.data() as Ticket);
                    if (tickets.length > 0) {
                         let eventName = 'Your Booking';
                         const eventDoc = await db.collection('events').doc(orderData.listingId).get();
                         if(eventDoc.exists) eventName = (eventDoc.data() as Event).name;
                         
                         await sendTicketEmail({
                            to: orderData.userEmail,
                            attendeeName: orderData.userName,
                            orderId: orderData.id,
                            eventName: eventName,
                            tickets: tickets.map(t => ({ ticketType: t.ticketType, qrCode: t.qrCode }))
                        });
                        console.log(`Ticket email sent to ${orderData.userEmail}.`);
                    }
                }
            }
        }
        
        console.log(`--- SUCCESSFULLY PROCESSED CALLBACK for transaction ${transactionDoc.id}. Status: ${resultCode === 0 ? 'completed' : 'failed'} ---`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

    } catch (error: any) {
        console.error('!!! FATAL ERROR processing M-Pesa callback:', error);
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Server Error" }, { status: 500 });
    }
}
