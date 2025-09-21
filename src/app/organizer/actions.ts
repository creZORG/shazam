
'use server';

import { getAdminAuth } from '@/lib/firebase/server-auth';
import { db } from '@/lib/firebase/config';
import type { Tour, Event, Order, FirebaseUser, UserRole, EventTicketingType } from '@/lib/types';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  getDoc,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';
import { logAdminAction } from '@/services/audit-service';


type WithOrganizer = {
  organizerId: string;
  status: 'draft' | 'submitted for review' | 'published' | 'rejected' | 'archived' | 'taken-down';
  createdAt: any;
  updatedAt: any;
};

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


export async function updateOrganizerProfile(uid: string, data: { organizerName: string, about: string }) {
    if (!uid) return { success: false, error: "User not found." };
    if (!data.organizerName || !data.about) return { success: false, error: "All fields are required." };

    try {
        const userDocRef = doc(db, "users", uid);
        await updateDoc(userDocRef, {
            organizerName: data.organizerName,
            about: data.about
        });
        revalidatePath('/organizer', 'layout');
        return { success: true };
    } catch(error: any) {
        console.error("Error updating organizer profile:", error);
        return { success: false, error: "Failed to update profile." };
    }
}


export async function getListings(organizerId: string) {
  if (!organizerId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const eventsQuery = query(
      collection(db, 'events'),
      where('organizerId', '==', organizerId)
    );
    const toursQuery = query(
      collection(db, 'tours'),
      where('organizerId', '==', organizerId)
    );

    const [eventsSnapshot, toursSnapshot] = await Promise.all([
      getDocs(eventsQuery),
      getDocs(toursQuery),
    ]);

    const allListings = [
      ...eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event & { id: string, status: string, updatedAt?: any})),
      ...toursSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tour & { id: string, status: string, updatedAt?: any})),
    ];
    
    allListings.sort((a, b) => ((b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0)));

    const listingsByStatus = {
        all: allListings,
        published: allListings.filter(l => l.status === 'published'),
        drafts: allListings.filter(l => l.status === 'draft'),
        review: allListings.filter(l => l.status === 'submitted for review'),
        rejected: allListings.filter(l => l.status === 'rejected'),
        archived: allListings.filter(l => l.status === 'archived'),
    };

    return { success: true, data: listingsByStatus };
  } catch (error) {
    console.error('Error fetching listings:', error);
    return { success: false, error: 'Failed to fetch listings.' };
  }
}

async function saveListing(
  collectionName: 'events' | 'tours',
  data: (Partial<Event & Tour> & { id?: string; organizerId?: string }),
  status: 'draft' | 'submitted for review'
) {
  const userId = await getUserIdFromSession();

  if (!userId) {
     return { success: false, error: 'User not authenticated.' };
  }
  
  const { id, organizerId, ...listingDataPayload } = data;

  const name = isEvent(data) ? data.name : data.name;
  const slug = name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);
  const organizerName = userDoc.exists() ? userDoc.data().organizerName || userDoc.data().name : 'Unknown Organizer';
  
  const isNew = !id;
  const docRef = isNew ? doc(collection(db, collectionName)) : doc(db, collectionName, id);

  const listingData: Omit<WithOrganizer, 'createdAt'> & Partial<Event & Tour> & { createdAt?: any, slug?: string, organizerName?: string, ticketingType?: EventTicketingType } = {
    ...listingDataPayload,
    organizerId: userId,
    organizerName,
    slug,
    status: status,
    updatedAt: serverTimestamp(),
  };

  if (isNew) {
    listingData.createdAt = serverTimestamp();
  }
  
  if (isEvent(data)) {
    listingData.ticketingType = 'naksyetu';
  }


  try {
    await setDoc(docRef, listingData, { merge: true });
    revalidatePath('/organizer/listings');
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error(`Error saving ${collectionName}:`, error);
    return { success: false, error: `Failed to save ${collectionName}. Details: ${error.message}` };
  }
}

function isEvent(data: any): data is Event {
    return 'venue' in data;
}

export async function saveEvent(
  data: Partial<Event> & { id?: string; organizerId?: string },
  status: 'draft' | 'submitted for review'
) {
  return saveListing('events', data, status);
}

export async function saveTour(
  data: Partial<Tour> & { id?: string; organizerId?: string },
  status: 'draft' | 'submitted for review'
) {
    return saveListing('tours', data, status);
}

export async function getListingById(type: 'event' | 'tour', id: string) {
    try {
        const docRef = doc(db, type === 'event' ? 'events' : 'tours', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Convert Firestore Timestamp to ISO string for date input
            if (data.date && typeof data.date.toDate === 'function') {
                 data.date = data.date.toDate().toISOString().split('T')[0];
            } else if (data.date && typeof data.date === 'string' && data.date.includes('T')) {
                // Handle ISO string format
                data.date = data.date.split('T')[0];
            }
            return { success: true, data: { id: docSnap.id, ...data } };
        } else {
            return { success: false, error: "Listing not found." };
        }
    } catch (error: any) {
        console.error("Error fetching listing:", error);
        return { success: false, error: `Failed to fetch listing. Details: ${error.message}` };
    }
}

export async function updateListingStatus(listingId: string, type: 'event' | 'tour', status: 'taken-down' | 'submitted for review' | 'archived') {
    if (!listingId || !status) {
        return { success: false, error: 'Listing ID and status are required.' };
    }
    const organizerId = await getUserIdFromSession();
    if (!organizerId) return { success: false, error: 'Not authenticated' };

    try {
        const collectionName = type === 'event' ? 'events' : 'tours';
        const listingDocRef = doc(db, collectionName, listingId);
        
        const docSnap = await getDoc(listingDocRef);
        if(!docSnap.exists() || docSnap.data().organizerId !== organizerId) {
            return { success: false, error: 'Permission denied.' };
        }

        await updateDoc(listingDocRef, {
            status: status,
            updatedAt: serverTimestamp(),
        });
        revalidatePath('/organizer/listings');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating listing status:", error);
        return { success: false, error: `Failed to update listing status. Details: ${error.message}` };
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

export async function getOrganizerGlobalStats() {
    noStore();
    
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return { success: false, error: 'Not authenticated. Please log in.' };
    }
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        console.error("Error verifying session cookie in getOrganizerGlobalStats:", error);
        return { success: false, error: 'Authentication failed. Please log in again.' };
    }

    const organizerId = decodedClaims.uid;


    try {
        const eventsQuery = query(collection(db, 'events'), where('organizerId', '==', organizerId), where('status', '==', 'published'));
        const ordersQuery = query(collection(db, 'orders'), where('organizerId', '==', organizerId), where('status', '==', 'completed'));
        
        const [eventsSnapshot, ordersSnapshot] = await Promise.all([
            getDocs(eventsQuery),
            getDocs(ordersQuery),
        ]);

        const events = eventsSnapshot.docs.map(serializeData) as Event[];
        const orders = ordersSnapshot.docs.map(serializeData) as Order[];

        // --- Aggregate Global Stats ---
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalTicketsSold = orders.reduce((sum, order) => sum + order.tickets.reduce((qSum, t) => qSum + t.quantity, 0), 0);
        const totalEvents = events.length;
        
        // --- Per-Event Stats ---
        const eventStats = events.map(event => {
            const eventOrders = orders.filter(o => o.listingId === event.id);
            const revenue = eventOrders.reduce((sum, order) => sum + order.total, 0);
            const ticketsSold = eventOrders.reduce((sum, order) => sum + order.tickets.reduce((qSum, t) => qSum + t.quantity, 0), 0);
            return {
                id: event.id,
                name: event.name,
                revenue,
                ticketsSold,
            };
        });

        const topEvents = eventStats.sort((a, b) => b.revenue - a.revenue);

        return {
            success: true,
            data: {
                totalRevenue,
                totalTicketsSold,
                totalEvents,
                topEvents,
            }
        };

    } catch (error) {
        console.error('Error fetching organizer global stats:', error);
        return { success: false, error: 'Failed to fetch global analytics data.' };
    }
}


export async function getOrganizerTourStats() {
    noStore();
    
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated.' };
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        return { success: false, error: 'Authentication failed.' };
    }
    const organizerId = decodedClaims.uid;

    try {
        const toursQuery = query(collection(db, 'tours'), where('organizerId', '==', organizerId), where('status', '==', 'published'));
        const ordersQuery = query(collection(db, 'orders'), where('organizerId', '==', organizerId), where('listingType', '==', 'tour'), where('status', '==', 'completed'));
        
        const [toursSnapshot, ordersSnapshot] = await Promise.all([
            getDocs(toursQuery),
            getDocs(ordersQuery),
        ]);

        const tours = toursSnapshot.docs.map(serializeData) as Tour[];
        const orders = ordersSnapshot.docs.map(serializeData) as Order[];

        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalBookings = orders.length;
        const totalTours = tours.length;
        
        const tourStats = tours.map(tour => {
            const tourOrders = orders.filter(o => o.listingId === tour.id);
            const revenue = tourOrders.reduce((sum, order) => sum + order.total, 0);
            const bookings = tourOrders.length;
            return {
                id: tour.id,
                name: tour.name,
                revenue,
                bookings,
            };
        });

        const topTours = tourStats.sort((a, b) => b.revenue - a.revenue);

        return {
            success: true,
            data: {
                totalRevenue,
                totalBookings,
                totalTours,
                topTours,
            }
        };

    } catch (error) {
        console.error('Error fetching organizer tour stats:', error);
        return { success: false, error: 'Failed to fetch tour analytics data.' };
    }
}


interface AssignVerifierPayload {
    username: string;
    eventId: string;
}

export async function assignVerifier(payload: AssignVerifierPayload) {
    const { username, eventId } = payload;
    
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch(e) {
        return { success: false, error: 'Authentication failed. Please log in again.' };
    }
    const organizerId = decodedClaims.uid;

    try {
        // 1. Check if organizer has permissions
        const organizerDoc = await getDoc(doc(db, 'users', organizerId));
        if (!organizerDoc.exists() || !['organizer', 'admin', 'super-admin'].includes(organizerDoc.data()?.role)) {
            return { success: false, error: 'Permission Denied. You must be an organizer to perform this action.' };
        }
        
        // 2. Find the user to be assigned
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('name', '==', username));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            return { success: false, error: `User with username "${username}" not found.` };
        }
        
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data() as FirebaseUser;
        
        // 3. Verify the user is a verifier
        if (userData.role !== 'verifier' && userData.role !== 'admin' && userData.role !== 'super-admin') {
            return { success: false, error: `User "${username}" does not have verification permissions.` };
        }
        
        // 4. Check if already assigned
        if (userData.assignedEvents?.includes(eventId)) {
            return { success: false, error: `This user is already a verifier for this event.`};
        }

        // 5. Update user with the new event
        await updateDoc(userDoc.ref, {
            assignedEvents: arrayUnion(eventId)
        });
        
        revalidatePath('/organizer/listings');
        return { success: true, message: `User "${username}" has been assigned as a verifier.` };

    } catch (error) {
        console.error('Error in assignVerifier:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: errorMessage };
    }
}
