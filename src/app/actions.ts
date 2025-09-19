

'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, doc, getDoc, where, orderBy, Timestamp, addDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, writeBatch, setDoc } from "firebase/firestore";
import type { Event, Tour, NightlifeEvent, Organizer, UserEvent, FirebaseUser, SiteSettings, Order, StaffNote } from '@/lib/types';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/firebase/server-auth';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';

type ListingType = 'events' | 'tours' | 'nightlifeEvents';
type Listing = Event | Tour | NightlifeEvent;

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

export async function getListings(type: ListingType) {
    console.log(`[getListings] Fetching listings for type: ${type}`);
    try {
        let q = query(collection(db, type), orderBy("updatedAt", "desc"));
        // Only filter by status if the type is 'events' or 'tours'
        if (type !== 'nightlifeEvents') {
            q = query(q, where("status", "==", "published"));
        }
        const querySnapshot = await getDocs(q);
        console.log(`[getListings] Found ${querySnapshot.docs.length} documents in Firestore for type: ${type}`);
        const listings = querySnapshot.docs.map(serializeData);
        console.log(`[getListings] Returning ${listings.length} processed listings.`);
        return { listings, error: null };
    } catch (error: any) {
        console.error(`Error fetching ${type}:`, error);
        return { listings: [], error: `Failed to fetch ${type}.` };
    }
}


export async function getListingById(type: 'event' | 'tour' | 'nightlifeEvent', id: string): Promise<{ data: Listing | null, error: string | null }> {
    const collectionNameMap = {
        'event': 'events',
        'tour': 'tours',
        'nightlifeEvent': 'nightlifeEvents'
    };
    const collectionName = collectionNameMap[type];
    
    try {
        const docRef = doc(db, collectionName, id);
        let docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            // Fallback to searching by slug, which might be the same as ID in some cases
            const q = query(collection(db, collectionName), where("slug", "==", id));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                docSnap = querySnapshot.docs[0];
            }
        }
        
        if (docSnap.exists()) {
            return { data: serializeData(docSnap) as Listing, error: null };
        } else {
            console.warn(`${type} with id or slug '${id}' not found in collection ${collectionName}.`);
            return { data: null, error: "Not found" };
        }
    } catch (error: any) {
        console.error(`Error fetching ${type} by id/slug:`, error);
        return { data: null, error: `Failed to fetch ${type}.` };
    }
}


export async function getListingsByOrganizer(organizerId: string, type: ListingType) {
     try {
        const dateField = type === 'tours' ? 'startDate' : 'date';
        const q = query(collection(db, type), where("organizerId", "==", organizerId), orderBy(dateField, "desc"));
        const querySnapshot = await getDocs(q);
        const listings = querySnapshot.docs.map(serializeData).filter((l: any) => l.status === 'published');
        return { listings, error: null };
    } catch (error: any) {
        console.error(`Error fetching ${type} for organizer ${organizerId}:`, error);
        return { listings: [], error: `Failed to fetch organizer's ${type}.` };
    }
}

export async function getOrganizerById(id: string): Promise<Organizer | null> {
    try {
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && (docSnap.data().role === 'organizer' || docSnap.data().role === 'club')) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                name: data.organizerName || data.name,
                bio: data.about || 'This organizer has not provided a bio.',
                imageUrl: data.profilePicture || `https://ui-avatars.com/api/?name=${data.name}&background=random`,
                rating: data.rating,
                gallery: data.gallery || [],
            };
        }
        return null;
    } catch (error) {
        console.error("Error fetching organizer by id:", error);
        return null;
    }
}

export async function logUserEvent(eventData: Omit<UserEvent, 'deviceInfo'>) {
    try {
        const headersList = headers();
        const userAgent = headersList.get('user-agent') || 'unknown';

        await addDoc(collection(db, 'userEvents'), {
            ...eventData,
            deviceInfo: {
                userAgent: userAgent,
            }
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error logging user event:', error);
        return { success: false, error: `Failed to log event. Details: ${error.message}` };
    }
}

export async function toggleBookmark(eventId: string, userId: string) {
  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }

  const userDocRef = doc(db, "users", userId);

  try {
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      // This case should ideally not happen if the user is authenticated
      await setDoc(userDocRef, { bookmarkedEvents: [eventId] }, { merge: true });
      revalidatePath('/profile');
      return { success: true, isBookmarked: true };
    }

    const userData = userDoc.data() as FirebaseUser;
    const isBookmarked = userData.bookmarkedEvents?.includes(eventId) || false;

    if (isBookmarked) {
      await updateDoc(userDocRef, {
        bookmarkedEvents: arrayRemove(eventId),
      });
    } else {
      // This handles both cases where the field exists or doesn't exist
      await updateDoc(userDocRef, {
        bookmarkedEvents: arrayUnion(eventId),
      });
    }
    
    // Revalidate pages where bookmark status is visible
    revalidatePath('/profile');
    revalidatePath('/events');
    revalidatePath('/tours');


    return { success: true, isBookmarked: !isBookmarked };
  } catch (error: any) {
    console.error("Error toggling bookmark:", error);
    return { success: false, error: "Failed to update bookmark." };
  }
}

export async function getSettings(): Promise<{ settings: SiteSettings | null, error: string | null }> {
    try {
        const settingsDocRef = doc(db, 'config', 'settings');
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
            return { settings: docSnap.data() as SiteSettings, error: null };
        } else {
            // Return default settings if none are found
            const defaultSettings: SiteSettings = {
                platformFee: 5,
                processingFee: 2.5,
                processingFeePayer: 'customer',
                influencerCut: 10,
            };
            return { settings: defaultSettings, error: null };
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
        return { settings: null, error: "Failed to fetch settings." };
    }
}


export async function getHotListings(): Promise<{ data: ((Event | Tour) & { type: 'event' | 'tour' })[] | null; error?: string }> {
    noStore();
    try {
        const ordersQuery = query(collection(db, 'orders'), where('status', '==', 'completed'));
        const ordersSnapshot = await getDocs(ordersQuery);
        const orders = ordersSnapshot.docs.map(doc => doc.data() as Order);

        const salesByListing: Record<string, { count: number, type: 'event' | 'tour' }> = {};
        orders.forEach(order => {
            const ticketsSold = order.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
            salesByListing[order.listingId] = {
                count: (salesByListing[order.listingId]?.count || 0) + ticketsSold,
                type: order.listingType,
            };
        });

        const topThreeIds = Object.entries(salesByListing)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 3);
            
        if (topThreeIds.length === 0) {
            return { data: [] };
        }

        const fetchPromises = topThreeIds.map(async ([id, { type }]) => {
            const docRef = doc(db, type === 'event' ? 'events' : 'tours', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...serializeData(docSnap), type } as (Event | Tour) & { type: 'event' | 'tour' };
            }
            return null;
        });

        const hotListings = (await Promise.all(fetchPromises)).filter(Boolean) as ((Event | Tour) & { type: 'event' | 'tour' })[];

        return { data: hotListings };
    } catch (error) {
        console.error("Error fetching hot listings:", error);
        return { data: null, error: 'Failed to fetch hot listings.' };
    }
}

export async function dismissStaffNote(noteId: string, userId: string) {
    if (!noteId || !userId) {
        return { success: false, error: 'Note ID and User ID are required.' };
    }
    try {
        const noteRef = doc(db, 'staffNotes', noteId);
        await updateDoc(noteRef, {
            readBy: arrayUnion({
                userId: userId,
                readAt: new Date(),
            })
        });
        revalidatePath('/', 'layout'); // Revalidate all layouts that might use this data
        return { success: true };
    } catch (error: any) {
        console.error("Error dismissing staff note:", error);
        return { success: false, error: `Failed to dismiss note: ${error.message}` };
    }
}

export async function dismissAllStaffNotes(userId: string, noteIds: string[]) {
    if (!userId || !noteIds || noteIds.length === 0) {
        return { success: false, error: 'User ID and note IDs are required.' };
    }
    
    try {
        const batch = writeBatch(db);
        const readReceipt = {
            userId,
            readAt: new Date(),
        };

        noteIds.forEach(noteId => {
            const noteRef = doc(db, 'staffNotes', noteId);
            batch.update(noteRef, {
                readBy: arrayUnion(readReceipt)
            });
        });

        await batch.commit();
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error: any) {
        console.error("Error dismissing all staff notes:", error);
        return { success: false, error: `Failed to dismiss notes: ${error.message}` };
    }
}
