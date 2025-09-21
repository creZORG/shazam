
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/server-config';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, increment, getDoc, runTransaction } from 'firebase/firestore';
import type { Order, Ticket, Transaction, Event, Tour, MerchOrder, Product } from '@/lib/types';
import { sendTicketEmail } from '@/services/email';

export async function POST(request: Request, { params }: { params: { secret: string } }) {
    console.log("--- M-PESA CALLBACK ENDPOINT HIT ---");
    
    // 1. Validate Secret from URL
    const secret = params.secret;
    if (secret !== process.env.MPESA_CALLBACK_SECRET) {
        console.error("!!! CRITICAL: Invalid M-Pesa callback secret received in URL. Halting execution. !!!");
        console.error(`Received Secret: ${secret}`);
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid secret" }, { status: 403 });
    }
    console.log("Callback secret validated successfully.");

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

        const transactionsRef = collection(db, 'transactions');
        const q = query(transactionsRef, where('mpesaCheckoutRequestId', '==', checkoutRequestId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error(`Transaction not found for CheckoutRequestID: ${checkoutRequestId}. This might be a test callback from Safaricom or an old request.`);
            return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
        }
        console.log(`Found matching transaction document: ${querySnapshot.docs[0].id}`);

        const transactionDoc = querySnapshot.docs[0];
        const transaction = transactionDoc.data() as Transaction;
        
        const orderRef = doc(db, 'orders', transaction.orderId);
        
        // Use a transaction to ensure idempotency and atomic updates
        await runTransaction(db, async (firestoreTransaction) => {
            const orderDoc = await firestoreTransaction.get(orderRef);
            if (orderDoc.exists() && orderDoc.data().status === 'completed') {
                console.warn(`Idempotency check: Order ${transaction.orderId} already completed. Ignoring callback for transaction ${transactionDoc.id}.`);
                return;
            }
            
            const currentTransactionDoc = await firestoreTransaction.get(transactionDoc.ref);
            const currentTransaction = currentTransactionDoc.data() as Transaction;
            if (currentTransaction.status === 'completed' || currentTransaction.status === 'failed') {
                 console.warn(`Idempotency check: Transaction ${transactionDoc.id} already processed with status: ${currentTransaction.status}. Ignoring callback.`);
                 return;
            }

            if (resultCode === 0) {
                // Success
                console.log(`Payment successful for ${checkoutRequestId}. ResultCode: 0.`);
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
                    console.log(`Extracted M-Pesa Receipt: ${updatePayload.mpesaConfirmationCode}`);
                }
                firestoreTransaction.update(transactionDoc.ref, updatePayload);

                // Determine if it's a regular order or a merch order
                const merchOrderRef = doc(db, 'merchOrders', transaction.orderId);
                const merchOrderDoc = await firestoreTransaction.get(merchOrderRef);

                if (orderDoc.exists()) {
                    console.log(`Processing associated EVENT/TOUR order: ${orderDoc.id}`);
                    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
                    firestoreTransaction.update(orderRef, { status: 'completed', updatedAt: serverTimestamp() });
                    
                    if (order.paymentType === 'full' && order.listingType === 'event') {
                        console.log("Full payment for an event detected. Generating tickets...");
                        const ticketsToCreate: Omit<Ticket, 'id'>[] = [];
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
                                firestoreTransaction.set(ticketRef, newTicket);
                                ticketsToCreate.push(newTicket);
                            }
                        }
                         // The email is sent outside the transaction for reliability.
                    }
                    if (order.promocodeId) {
                        console.log(`Updating usage count for promocode: ${order.promocodeId}`);
                        const promocodeRef = doc(db, 'promocodes', order.promocodeId);
                        firestoreTransaction.update(promocodeRef, { usageCount: increment(1), revenueGenerated: increment(order.total) });
                    }
                    if(order.trackingLinkId) {
                        console.log(`Updating usage count for tracking link: ${order.trackingLinkId}`);
                        const collectionPath = order.promocodeId ? `promocodes/${order.promocodeId}/trackingLinks` : 'trackingLinks';
                        const trackingLinkRef = doc(db, collectionPath, order.trackingLinkId);
                         firestoreTransaction.update(trackingLinkRef, { purchases: increment(1) }); 
                    }

                } else if (merchOrderDoc.exists()) {
                    console.log(`Processing associated MERCH order: ${merchOrderDoc.id}`);
                    const merchOrder = merchOrderDoc.data() as MerchOrder;
                    for (const item of merchOrder.items) {
                        const productRef = doc(db, 'products', item.productId);
                        const productDoc = await firestoreTransaction.get(productRef);
                        if (!productDoc.exists()) { throw new Error(`Product ${item.productId} not found during stock update.`); }
                        const product = productDoc.data() as Product;
                        if (product.stock < item.quantity) { throw new Error(`Insufficient stock for ${product.name}.`); }
                        console.log(`Decrementing stock for product ${item.productId} by ${item.quantity}.`);
                        firestoreTransaction.update(productRef, { stock: increment(-item.quantity) });
                    }
                    firestoreTransaction.update(merchOrderRef, { status: 'awaiting_pickup' });

                } else {
                     console.error(`Order or MerchOrder ${transaction.orderId} not found! This is a critical error.`);
                }

            } else {
                // This is a failed transaction
                console.warn(`Payment failed for ${checkoutRequestId}. ResultCode: ${resultCode}. Reason: ${resultDesc}`);
                if (orderDoc.exists()) {
                     firestoreTransaction.update(orderRef, { status: 'failed', updatedAt: serverTimestamp() });
                } else {
                    const merchOrderRef = doc(db, 'merchOrders', transaction.orderId);
                    const merchOrderDoc = await firestoreTransaction.get(merchOrderRef);
                    if (merchOrderDoc.exists()) {
                        firestoreTransaction.update(merchOrderRef, { status: 'failed', updatedAt: serverTimestamp() });
                    }
                }
                firestoreTransaction.update(transactionDoc.ref, {
                    status: 'failed',
                    failReason: resultDesc,
                    mpesaCallbackData: stkCallback,
                    updatedAt: serverTimestamp(),
                    retryCount: increment(1)
                });
            }
        }); // End of Firestore Transaction

        // --- Post-Transaction Actions (like sending emails) ---
        if (resultCode === 0) {
            const finalOrderDoc = await getDoc(orderRef);
            if (finalOrderDoc.exists()) {
                const orderData = finalOrderDoc.data() as Order;
                if (orderData.paymentType === 'full' && orderData.listingType === 'event') {
                    const ticketsSnapshot = await getDocs(query(collection(db, 'tickets'), where('orderId', '==', orderData.id)));
                    const tickets = ticketsSnapshot.docs.map(d => d.data() as Ticket);
                    if (tickets.length > 0) {
                         let eventName = 'Your Booking';
                         const eventDoc = await getDoc(doc(db, 'events', orderData.listingId));
                         if(eventDoc.exists()) eventName = (eventDoc.data() as Event).name;
                         
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

    } catch (error) {
        console.error('!!! FATAL ERROR processing M-Pesa callback:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Server Error" }, { status: 500 });
    }
}
