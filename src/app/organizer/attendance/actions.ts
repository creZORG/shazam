

'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, getDoc, doc, Timestamp, orderBy, addDoc, serverTimestamp, writeBatch, documentId, updateDoc } from 'firebase/firestore';
import type { Order, Ticket, Event, Tour, FirebaseUser, TicketDefinition } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

async function getOrganizerId() {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;
    try {
        const auth = await getAdminAuth();
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch {
        return null;
    }
}

export async function getPublishedEvents() {
    noStore();
    const organizerId = await getOrganizerId();
    if (!organizerId) return { success: false, error: 'Not authenticated' };

    try {
        const now = new Date().toISOString();

        const eventsQuery = query(
            collection(db, 'events'),
            where('organizerId', '==', organizerId),
            where('status', 'in', ['published', 'submitted for review']),
            where('date', '>=', now)
        );
        const toursQuery = query(
            collection(db, 'tours'),
            where('organizerId', '==', organizerId),
            where('status', 'in', ['published', 'submitted for review']),
            where('startDate', '>=', now)
        );

        const [eventsSnapshot, toursSnapshot] = await Promise.all([
            getDocs(eventsQuery),
            getDocs(toursQuery)
        ]);
        
        const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, date: doc.data().date }));
        const tours = toursSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, date: doc.data().startDate }));
        
        const allListings = [...events, ...tours];
        
        // Sort by date, most recent first
        allListings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return { success: true, data: allListings };
    } catch (e: any) {
        console.error("Error in getPublishedEvents:", e)
        return { success: false, error: e.message };
    }
}

type ScannedTicketInfo = Ticket & { verifierName?: string };
type VerifierStats = { verifierId: string; verifierName: string; scanCount: number; }

export async function getAttendanceStats(eventId: string) {
    noStore();
    const organizerId = await getOrganizerId();
    if (!organizerId) return { success: false, error: 'Not authenticated' };
    
    try {
        // Check both events and tours collections
        let eventRef = doc(db, 'events', eventId);
        let eventSnap = await getDoc(eventRef);
        let eventData: Event | Tour | null = null;

        if (eventSnap.exists() && eventSnap.data().organizerId === organizerId) {
            eventData = eventSnap.data() as Event;
        } else {
            eventRef = doc(db, 'tours', eventId);
            eventSnap = await getDoc(eventRef);
            if (eventSnap.exists() && eventSnap.data().organizerId === organizerId) {
                 eventData = eventSnap.data() as Tour;
            }
        }
        
        if (!eventData) {
            return { success: false, error: 'Event or Tour not found or you do not have permission to view it.' };
        }

        const ticketsQuery = query(collection(db, 'tickets'), where('listingId', '==', eventId));
        const ticketsSnapshot = await getDocs(ticketsQuery);
        const allTickets = ticketsSnapshot.docs.map(doc => serializeData(doc) as Ticket);

        const scannedTickets = allTickets.filter(t => t.status === 'used').sort((a,b) => new Date(b.validatedAt).getTime() - new Date(a.validatedAt).getTime());
        const verifierIds = [...new Set(scannedTickets.map(t => t.validatedBy).filter(Boolean))] as string[];
        
        const verifiers: Record<string, string> = {};
        if (verifierIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', verifierIds));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
                verifiers[doc.id] = (doc.data() as FirebaseUser).name || 'Unknown Verifier';
            });
        }
        
        const scannedTicketsWithVerifier: ScannedTicketInfo[] = scannedTickets.map(ticket => ({
            ...ticket,
            verifierName: ticket.validatedBy ? verifiers[ticket.validatedBy] : 'Manual/Gate'
        }));
        
        const verifierStats = verifierIds.reduce((acc, id) => {
            const name = verifiers[id] || 'Unknown';
            if (!acc[id]) {
                acc[id] = { verifierId: id, verifierName: name, scanCount: 0 };
            }
            return acc;
        }, {} as Record<string, VerifierStats>);

        scannedTickets.forEach(ticket => {
            if (ticket.validatedBy && verifierStats[ticket.validatedBy]) {
                verifierStats[ticket.validatedBy].scanCount++;
            }
        });


        const totalSold = allTickets.filter(t => t.generatedBy === 'online_sale').length;
        const generatedAtGate = allTickets.filter(t => t.generatedBy === 'organizer').length;
        
        const totalCapacity = 'tickets' in eventData 
            ? (eventData as Event).tickets?.reduce((sum, t) => sum + t.quantity, 0) || 0
            : 0; // Tours don't have a ticket-based capacity in this model

        return {
            success: true,
            data: {
                totalCapacity: totalCapacity,
                totalSold: totalSold,
                generatedAtGate,
                scanned: scannedTickets.length,
                scannedTickets: scannedTicketsWithVerifier,
                ticketDefinitions: (eventData as Event).tickets || [],
                verifierStats: Object.values(verifierStats).sort((a,b) => b.scanCount - a.scanCount),
            }
        };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function generateManualTicket(eventId: string, ticketsToGenerate: { name: string, quantity: number }[]) {
    const organizerId = await getOrganizerId();
    if (!organizerId) return { success: false, error: 'Not authenticated' };
    
    if (!ticketsToGenerate || ticketsToGenerate.length === 0) {
        return { success: false, error: 'No tickets specified for generation.' };
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists() || eventSnap.data().organizerId !== organizerId) {
            return { success: false, error: 'Event not found or permission denied.' };
        }
        
        const batch = writeBatch(db);

        // 1. Create Order
        const orderRef = doc(collection(db, 'orders'));
        const orderData: Omit<Order, 'id'> = {
            userId: organizerId, // Assign to organizer
            userName: 'Gate Sale',
            userEmail: 'gatesale@naksyetu.com',
            userPhone: 'N/A',
            listingId: eventId,
            organizerId: organizerId,
            listingType: 'event',
            tickets: ticketsToGenerate.map(t => ({ ...t, price: 0 })),
            subtotal: 0,
            discount: 0,
            platformFee: 0,
            processingFee: 0,
            total: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'completed',
            channel: 'direct',
            deviceInfo: { userAgent: 'manual_generation' },
        };
        batch.set(orderRef, orderData);

        // 2. Create and Validate Tickets
        for (const ticket of ticketsToGenerate) {
            for (let i = 0; i < ticket.quantity; i++) {
                const ticketRef = doc(collection(db, 'tickets'));
                const ticketData: Omit<Ticket, 'id'> = {
                    orderId: orderRef.id,
                    userId: organizerId,
                    userName: 'Gate Sale',
                    listingId: eventId,
                    ticketType: ticket.name,
                    qrCode: ticketRef.id,
                    status: 'used', 
                    createdAt: serverTimestamp(),
                    validatedAt: serverTimestamp(),
                    validatedBy: organizerId,
                    generatedBy: 'organizer',
                };
                batch.set(ticketRef, ticketData);
            }
        }
        
        await batch.commit();
        
        revalidatePath('/organizer/attendance');
        return { success: true, orderId: orderRef.id };

    } catch (e: any) {
        console.error('Error generating manual ticket:', e);
        return { success: false, error: 'Failed to generate ticket.' };
    }
}
