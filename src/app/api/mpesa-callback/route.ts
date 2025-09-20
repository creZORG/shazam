
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/server-config';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import type { Order, Ticket, Transaction, Event, Tour } from '@/lib/types';
import { sendTicketEmail } from '@/services/email';

export async function POST(request: Request) {
    try {
        const callbackData = await request.json();
        console.log("Received M-Pesa Callback:", JSON.stringify(callbackData, null, 2));

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
            
            // Destructure and save all available metadata fields
            if (stkCallback.CallbackMetadata) {
                const metadataItem = (name: string) => stkCallback.CallbackMetadata.Item.find((item: any) => item.Name === name)?.Value;
                
                updatePayload.mpesaConfirmationCode = metadataItem('MpesaReceiptNumber');
                updatePayload.mpesaTransactionDate = metadataItem('TransactionDate'); // YYYYMMDDHHMMSS format
                updatePayload.mpesaPayerPhoneNumber = metadataItem('PhoneNumber');
            }

            batch.update(transactionRef, updatePayload);

            const orderRef = doc(db, 'orders', transaction.orderId);
            const orderDoc = await orderRef.get();
            if (!orderDoc.exists()) {
                console.error(`Order ${transaction.orderId} not found!`);
                await batch.commit();
                return NextResponse.json({ message: 'Order not found' }, { status: 404 });
            }
            const order = { id: orderDoc.id, ...orderDoc.data() } as Order;

            batch.update(orderRef, { status: 'completed', updatedAt: serverTimestamp() });
            
            // Only generate tickets for full payments
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
                 // Fetch event name for the email
                let eventName = 'Your Booking';
                const listingCollection = order.listingType === 'event' ? 'events' : 'tours';
                try {
                    const eventDocRef = doc(db, listingCollection, order.listingId);
                    const eventDoc = await eventDocRef.get();
                    if (eventDoc.exists()) {
                        eventName = (eventDoc.data() as Event | Tour).name;
                    }
                } catch (e) {
                    console.error("Could not fetch listing name for email.", e);
                }

                await sendTicketEmail({
                    to: order.userEmail,
                    attendeeName: order.userName,
                    orderId: order.id,
                    eventName: eventName,
                    tickets: createdTickets.map(t => ({ ticketType: t.ticketType, qrCode: t.qrCode }))
                });
            }
            
            // Increment promocode usage and revenue
            if (order.promocodeId) {
                const promocodeRef = doc(db, 'promocodes', order.promocodeId);
                batch.update(promocodeRef, {
                    usageCount: increment(1),
                    revenueGenerated: increment(order.total),
                });
            }
            
            // Increment tracking link purchases
            if(order.trackingLinkId) {
                const collectionPath = order.promocodeId ? `promocodes/${order.promocodeId}/trackingLinks` : 'trackingLinks';
                const trackingLinkRef = doc(db, collectionPath, order.trackingLinkId);
                const trackingLinkDoc = await getDoc(trackingLinkRef);
                if (trackingLinkDoc.exists()) {
                    batch.update(trackingLinkRef, { purchases: increment(1) });
                }
            }

        } else {
            // This is a failed transaction
            const orderRef = doc(db, 'orders', transaction.orderId);
            batch.update(orderRef, { status: 'failed', updatedAt: serverTimestamp() });
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
