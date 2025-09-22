

'use server';

import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  increment,
  Timestamp,
  runTransaction,
  orderBy,
  limit,
  updateDoc,
  documentId
} from 'firebase/firestore';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import type { FirebaseUser, Ticket, Event, UserEvent, Order, Tour } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

async function getUserIdFromSession(): Promise<string | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;
    try {
        const auth = await getAdminAuth();
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error("Error verifying session cookie:", error);
        return null;
    }
}

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

export async function getTicketDetails(orderId: string) {
    noStore();
    if (!orderId) {
        return { success: false, error: 'Order ID is required' };
    }

    try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
             return { success: false, error: 'Order not found.' };
        }
        const orderData = serializeData(orderSnap) as Order;

        const ticketsQuery = query(collection(db, 'tickets'), where('orderId', '==', orderId));
        const ticketsSnapshot = await getDocs(ticketsQuery);

        if (ticketsSnapshot.empty) {
            return { success: false, error: 'No tickets found for this order.' };
        }

        const tickets = ticketsSnapshot.docs.map(doc => serializeData(doc) as Ticket);
        
        const eventIds = [...new Set(tickets.map(t => t.listingId))];
        let events: Record<string, Event> = {};
        if (eventIds.length > 0) {
            const eventsQuery = query(collection(db, 'events'), where(documentId(), 'in', eventIds));
            const eventDocs = await getDocs(eventsQuery);
            eventDocs.forEach(doc => {
                events[doc.id] = serializeData(doc) as Event;
            });
        }
        
        const ticketsWithEvents = tickets.map(ticket => ({ ...ticket, event: events[ticket.listingId], order: orderData })).filter(t => t.event);

        return { success: true, data: ticketsWithEvents };

    } catch(e: any) {
        return { success: false, error: e.message };
    }
}

export async function getUserProfileData() {
  noStore();
  const userId = await getUserIdFromSession();
  if (!userId) {
    return { success: false, error: 'Not authenticated.' };
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found.' };
    }
    
    const userData = userDoc.data() as FirebaseUser;

    const ticketsSnapshot = await getDocs(query(collection(db, 'tickets'), where('userId', '==', userId), orderBy('createdAt', 'desc')));
    
    const allTickets = ticketsSnapshot.docs.map(doc => serializeData(doc) as Ticket);
    
    const purchasedTickets = allTickets.filter(t => t.status === 'valid');

    const listingIds = [...new Set(allTickets.map(t => t.listingId))].filter(Boolean);

    const listings: Record<string, Event | Tour> = {};
    if (listingIds.length > 0) {
        const batchSize = 30; // Firestore 'in' query limit
        for (let i = 0; i < listingIds.length; i += batchSize) {
            const batchIds = listingIds.slice(i, i + batchSize);
            
            const eventsQuery = query(collection(db, 'events'), where(documentId(), 'in', batchIds));
            const toursQuery = query(collection(db, 'tours'), where(documentId(), 'in', batchIds));

            const [eventDocs, tourDocs] = await Promise.all([
                getDocs(eventsQuery),
                getDocs(toursQuery)
            ]);
            
            eventDocs.forEach(doc => {
                listings[doc.id] = { ...(serializeData(doc) as Event), type: 'event' };
            });
            tourDocs.forEach(doc => {
                listings[doc.id] = { ...(serializeData(doc) as Tour), type: 'tour' };
            });
        }
    }

    const purchased = purchasedTickets.map(ticket => ({
      ...ticket,
      listing: listings[ticket.listingId],
    })).filter(t => t.listing);
    
    return {
      success: true,
      data: {
        purchased,
        loyaltyPoints: userData.loyaltyPoints || 0,
      },
    };

  } catch (error) {
    console.error("Error fetching profile data:", error);
    return { success: false, error: 'Failed to load profile data.' };
  }
}

export async function canUserRateEvent(userId: string, eventId: string): Promise<boolean> {
    if (!userId || !eventId) return false;

    try {
        const ticketsQuery = query(
            collection(db, 'tickets'),
            where('userId', '==', userId),
            where('listingId', '==', eventId)
        );
        const snapshot = await getDocs(ticketsQuery);
        return !snapshot.empty;
    } catch {
        return false;
    }
}


export async function rateEvent(targetId: string, rating: number): Promise<{success: boolean, error?: string, newAverage?: number}> {
    const userId = await getUserIdFromSession();
    if (!userId) return { success: false, error: 'You must be logged in to rate.' };
    
    if (rating < 1 || rating > 5) return { success: false, error: 'Invalid rating value.' };

    try {
        // Determine if it's an event or a tour
        let docRef = doc(db, 'events', targetId);
        let docSnap = await getDoc(docRef);
        let isEvent = true;

        if (!docSnap.exists()) {
            docRef = doc(db, 'tours', targetId);
            docSnap = await getDoc(docRef);
            isEvent = false;
            if (!docSnap.exists()) {
                 throw new Error("Listing not found.");
            }
        }
        
        const listingData = docSnap.data() as Event | Tour;
        const eventDate = new Date(isEvent ? (listingData as Event).date : (listingData as Tour).startDate);
        if (eventDate > new Date()) {
            return { success: false, error: 'You can only rate an event after it has occurred.' };
        }

        const canRate = await canUserRateEvent(userId, targetId);
        if (!canRate) {
            return { success: false, error: "You must have purchased a ticket to rate this event." };
        }
        
        const newAverage = await runTransaction(db, async (transaction) => {
            const freshDoc = await transaction.get(docRef);
            if (!freshDoc.exists()) {
                 throw new Error("Listing not found.");
            }

            const listingData = freshDoc.data() as Event | Tour;
            const currentRating = listingData.rating || { average: 0, count: 0 };
            
            // This is a simplified rating model. A real one would prevent duplicate ratings.
            const newCount = currentRating.count + 1;
            const newAverage = ((currentRating.average * currentRating.count) + rating) / newCount;
            
            transaction.update(docRef, {
                'rating.average': newAverage,
                'rating.count': newCount,
            });

            return newAverage;
        });

        return { success: true, newAverage };
        
    } catch (error: any) {
        console.error("Error submitting rating:", error);
        return { success: false, error: error.message || 'Failed to submit rating.' };
    }
}


export async function upgradeToInfluencer(): Promise<{ success: boolean; error?: string }> {
    const userId = await getUserIdFromSession();
    if (!userId) return { success: false, error: 'Not authenticated.' };

    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return { success: false, error: 'User not found.' };
        }

        const userData = userDoc.data() as FirebaseUser;

        if (userData.role !== 'attendee') {
            return { success: false, error: `You already have the role: ${userData.role}.` };
        }
        
        if (!userData.fullName || !userData.phone || !userData.profilePicture) {
            return { success: false, error: 'Profile is not complete. Please fill out your full name, phone, and profile picture.' };
        }

        await updateDoc(userDocRef, {
            role: 'influencer'
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error upgrading to influencer:", error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}
