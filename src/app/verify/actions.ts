

'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, getDoc, doc, Timestamp, orderBy, addDoc, serverTimestamp, writeBatch, documentId, updateDoc } from 'firebase/firestore';
import type { Order, Ticket, Event, Tour, FirebaseUser, TicketDefinition } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function validateTicket(
  ticketId: string,
  currentEventId: string
): Promise<{ success: boolean; message: string; data?: { eventName: string, ticketType: string, attendeeName: string } }> {
  try {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
      return { success: false, message: 'Authentication failed. Please log in.' };
    }
    const auth = await getAdminAuth();
    
    if (!auth) throw new Error("Server auth not initialized");
    const session = await auth.verifySessionCookie(sessionCookie, true);

    if (!session) {
      return { success: false, message: 'Authentication failed. Please log in.' };
    }
    const verifierId = session.uid;
    const verifierDoc = await getDoc(doc(db, 'users', verifierId));
    if (!verifierDoc.exists()) {
        return { success: false, message: 'Verifier account not found.' };
    }
    const verifier = verifierDoc.data() as FirebaseUser;


    if (!ticketId) {
      return { success: false, message: 'Invalid QR Code. Ticket ID is missing.' };
    }

    const ticketRef = doc(db, 'tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
      return { success: false, message: 'Ticket not found. This QR code is invalid.' };
    }

    const ticket = ticketSnap.data() as Ticket;
    
    // Check if ticket is for the current event
    if (ticket.listingId !== currentEventId) {
        const otherEventDoc = await getDoc(doc(db, 'events', ticket.listingId));
        const otherEventName = otherEventDoc.exists() ? otherEventDoc.data().name : 'another event';
        const message = `This ticket is for "${otherEventName}", not the current event.`
        await addDoc(collection(db, 'verificationHistory'), {
            verifierId,
            eventId: currentEventId,
            ticketId,
            status: 'error',
            message,
            timestamp: serverTimestamp()
        });
        return { success: false, message};
    }
    
    // Check permissions
    const isGlobalVerifier = ['admin', 'super-admin', 'organizer'].includes(verifier.role);
    const isAssignedToEvent = verifier.assignedEvents?.includes(ticket.listingId);

    if (verifier.role === 'verifier' && !isGlobalVerifier && !isAssignedToEvent) {
        return { success: false, message: 'Permission Denied. You are not assigned to verify tickets for this event.' };
    }

    if (ticket.status !== 'valid') {
      const statusMessage = ticket.status === 'used' ? `This ticket has already been used at ${new Date((ticket.validatedAt as any).seconds * 1000).toLocaleTimeString()}.` : `This ticket status is: ${ticket.status}.`;
       await addDoc(collection(db, 'verificationHistory'), {
            verifierId,
            eventId: currentEventId,
            ticketId,
            status: 'error',
            message: statusMessage,
            timestamp: serverTimestamp()
        });
      return { success: false, message: statusMessage };
    }

    // Fetch event and user details for the response
    const eventRef = doc(db, 'events', ticket.listingId);
    const userRef = doc(db, 'users', ticket.userId as string);

    const [eventSnap, userSnap] = await Promise.all([
      getDoc(eventRef),
      getDoc(userRef)
    ]);

    const eventName = eventSnap.exists() ? (eventSnap.data() as Event).name : 'Unknown Event';
    const attendeeName = ticket.userName || (userSnap.exists() ? userSnap.data().name : 'Unknown Attendee');
    const ticketType = ticket.ticketType;
    
    // Perform the update and log history
    const batch = writeBatch(db);
    batch.update(ticketRef, {
      status: 'used',
      validatedAt: serverTimestamp(),
      validatedBy: verifierId,
    });
    const historyRef = doc(collection(db, 'verificationHistory'));
    batch.set(historyRef, {
        verifierId,
        eventId: currentEventId,
        ticketId,
        status: 'success',
        message: 'Ticket successfully validated!',
        details: { eventName, attendeeName, ticketType },
        timestamp: serverTimestamp()
    });
    await batch.commit();
    
    revalidatePath(`/verify/scan/${currentEventId}`);

    return {
      success: true,
      message: 'Ticket successfully validated!',
      data: { eventName, ticketType, attendeeName }
    };
  } catch (error) {
    console.error('Error validating ticket:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return { success: false, message: `Validation failed: ${errorMessage}` };
  }
}

export async function getAssignedEvents(userId: string) {
    if (!userId) return { success: false, error: 'User not found' };

    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return { success: false, error: 'User not found' };

        const assignedEventIds = userDoc.data()?.assignedEvents || [];
        if (assignedEventIds.length === 0) {
            return { success: true, data: [] };
        }
        
        const eventsQuery = query(collection(db, 'events'), where(documentId(), 'in', assignedEventIds));
        const eventsSnapshot = await getDocs(eventsQuery);
        
        const events = eventsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            date: doc.data().date,
        } as {id: string, name: string, date: string}));

        return { success: true, data: events };

    } catch (error) {
         console.error('Error fetching assigned events:', error);
        return { success: false, error: 'Failed to fetch assigned events' };
    }
}
