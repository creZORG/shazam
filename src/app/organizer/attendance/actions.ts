

'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, getDoc, doc, Timestamp, orderBy, addDoc, serverTimestamp, writeBatch, documentId, updateDoc } from 'firebase/firestore';
import type { Order, Ticket, Event, Tour, FirebaseUser, TicketDefinition, VerificationScan } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/services/audit-service';

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

export async function getEventsForAttendancePage() {
    noStore();
    const organizerId = await getOrganizerId();
    if (!organizerId) return { success: false, error: 'Not authenticated' };

    try {
        const eventsQuery = query(
            collection(db, 'events'),
            where('organizerId', '==', organizerId),
            where('status', '==', 'published')
        );

        const eventsSnapshot = await getDocs(eventsQuery);
        if (eventsSnapshot.empty) {
            return { success: true, data: [] };
        }

        const eventIds = eventsSnapshot.docs.map(doc => doc.id);
        
        const ticketsQuery = query(collection(db, 'tickets'), where('listingId', 'in', eventIds));
        const ticketsSnapshot = await getDocs(ticketsQuery);
        
        const ticketsByEvent: Record<string, Ticket[]> = {};
        ticketsSnapshot.forEach(doc => {
            const ticket = doc.data() as Ticket;
            if (!ticketsByEvent[ticket.listingId]) {
                ticketsByEvent[ticket.listingId] = [];
            }
            ticketsByEvent[ticket.listingId].push(ticket);
        });

        const data = eventsSnapshot.docs.map(doc => {
            const event = serializeData(doc) as Event;
            const eventTickets = ticketsByEvent[event.id] || [];
            const ticketsSold = eventTickets.length;
            const ticketsScanned = eventTickets.filter(t => t.status === 'used').length;
            return {
                id: event.id,
                name: event.name,
                date: event.date,
                imageUrl: event.imageUrl,
                ticketsSold,
                ticketsScanned,
            };
        });

        // Sort by date, most recent first
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { success: true, data };
    } catch (e: any) {
        console.error("Error in getEventsForAttendancePage:", e)
        return { success: false, error: e.message };
    }
}


type ScannedTicketInfo = VerificationScan & { verifierName?: string };
type VerifierStats = { verifierId: string; verifierName: string; scanCount: number; }

export async function getAttendanceStats(eventId: string) {
    noStore();
    const organizerId = await getOrganizerId();
    if (!organizerId) return { success: false, error: 'Not authenticated' };
    
    try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (!eventSnap.exists() || eventSnap.data().organizerId !== organizerId) {
            return { success: false, error: 'Event not found or you do not have permission to view it.' };
        }
        
        const eventData = serializeData(eventSnap) as Event;

        const ticketsQuery = query(collection(db, 'tickets'), where('listingId', '==', eventId));
        const allTicketsSnapshot = await getDocs(ticketsQuery);
        const allTickets = allTicketsSnapshot.docs.map(doc => serializeData(doc) as Ticket);

        const verificationHistoryQuery = query(collection(db, 'verificationHistory'), where('eventId', '==', eventId), orderBy('timestamp', 'desc'));
        const verificationHistorySnapshot = await getDocs(verificationHistoryQuery);
        const scans = verificationHistorySnapshot.docs.map(doc => serializeData(doc) as VerificationScan);

        const successfulScans = scans.filter(s => s.status === 'success');
        const verifierIds = [...new Set(scans.map(s => s.verifierId).filter(Boolean))] as string[];
        
        const verifiers: Record<string, string> = {};
        if (verifierIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', verifierIds));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
                verifiers[doc.id] = (doc.data() as FirebaseUser).name || 'Unknown Verifier';
            });
        }
        
        const checkInHistory: ScannedTicketInfo[] = successfulScans.map(scan => ({
            ...scan,
            verifierName: scan.verifierId ? verifiers[scan.verifierId] : 'Manual/Gate'
        }));
        
        const verifierStats = verifierIds.reduce((acc, id) => {
            const name = verifiers[id] || 'Unknown';
            if (!acc[id]) {
                acc[id] = { verifierId: id, verifierName: name, scanCount: 0 };
            }
            return acc;
        }, {} as Record<string, VerifierStats>);

        scans.forEach(scan => {
            if (scan.verifierId && verifierStats[scan.verifierId]) {
                verifierStats[scan.verifierId].scanCount++;
            }
        });

        const totalSoldOnline = allTickets.filter(t => t.generatedBy === 'online_sale').length;
        const generatedAtGate = allTickets.filter(t => t.generatedBy === 'organizer' || t.generatedBy === 'admin').length;
        const totalTicketsAvailable = totalSoldOnline + generatedAtGate;
        const totalCapacity = 'tickets' in eventData 
            ? (eventData as Event).tickets?.reduce((sum, t) => sum + t.quantity, 0) || 0
            : 0;

        return {
            success: true,
            data: {
                eventName: eventData.name,
                event: eventData,
                totalCapacity: totalCapacity,
                totalSoldOnline: totalSoldOnline,
                generatedAtGate,
                totalAttended: successfulScans.length,
                overallAttendance: totalTicketsAvailable > 0 ? (successfulScans.length / totalTicketsAvailable) * 100 : 0,
                checkInHistory: checkInHistory,
                verifierStats: Object.values(verifierStats).sort((a,b) => b.scanCount - a.scanCount),
            }
        };

    } catch (e: any) {
        console.error("Error fetching attendance stats:", e);
        return { success: false, error: e.message };
    }
}


export async function generateManualTicketForOrganizer(
    eventId: string, 
    ticketsToGenerate: { name: string; quantity: number }[]
): Promise<{ success: boolean; error?: string }> {
    const organizerId = await getOrganizerId();
    if (!organizerId) {
        return { success: false, error: 'Not authenticated' };
    }
    
    if (!ticketsToGenerate || ticketsToGenerate.length === 0) {
        return { success: false, error: 'No tickets specified for generation.'};
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists() || eventSnap.data().organizerId !== organizerId) {
            return { success: false, error: 'Event not found or permission denied.' };
        }
        const eventData = eventSnap.data();
        
        const batch = writeBatch(db);
        const orderRef = doc(collection(db, 'orders'));

        batch.set(orderRef, {
            userId: organizerId,
            userName: 'Gate Sale (Organizer)',
            userEmail: 'organizer@naksyetu.com',
            userPhone: 'N/A',
            listingId: eventId,
            organizerId: eventData.organizerId,
            listingType: 'event',
            tickets: ticketsToGenerate.map(t => ({...t, price: 0})),
            total: 0, subtotal: 0, discount: 0, platformFee: 0, processingFee: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'completed',
            channel: 'direct',
            deviceInfo: { userAgent: 'organizer_gate_sale' },
        });

        for (const ticket of ticketsToGenerate) {
            for (let i = 0; i < ticket.quantity; i++) {
                const ticketRef = doc(collection(db, 'tickets'));
                const ticketPayload: Partial<Ticket> = {
                    orderId: orderRef.id,
                    userId: organizerId,
                    userName: 'Gate Sale (Organizer)',
                    listingId: eventId,
                    ticketType: ticket.name,
                    qrCode: ticketRef.id,
                    status: 'used',
                    createdAt: serverTimestamp(),
                    generatedBy: 'organizer',
                    validatedAt: serverTimestamp(),
                    validatedBy: organizerId,
                };
                batch.set(ticketRef, ticketPayload);
            }
        }
        
        await batch.commit();
        
        revalidatePath(`/organizer/attendance/${eventId}`);
        return { success: true };

    } catch (e: any) {
        console.error('Error generating manual ticket for organizer:', e);
        return { success: false, error: 'Failed to generate ticket.' };
    }
}
