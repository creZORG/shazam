

'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, getDoc, doc, Timestamp, orderBy, updateDoc, writeBatch, serverTimestamp, documentId } from 'firebase/firestore';
import type { Order, Ticket, UserEvent, Event, Tour, FirebaseUser, Product } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/server-auth';
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

type ListingDetails = {
    listing: (Event | Tour) & { id: string };
    stats: {
        totalRevenue: number;
        totalTicketsSold: number;
        pageViews: number;
        conversionRate: number;
        salesByTicketType: { name: string; sold: number; total: number }[];
        attendance: {
            total: number;
            scanned: number;
            rate: number;
        };
    };
    attendees: (Ticket & { user?: FirebaseUser })[];
    organizer: FirebaseUser | null;
}

export async function getListingDetailsForAdmin(listingId: string, listingType: 'event' | 'tour'): Promise<{ success: boolean; data?: ListingDetails; error?: string; }> {
    noStore();
    if (!listingId || !listingType) {
        return { success: false, error: 'Listing ID and type are required.' };
    }

    try {
        const collectionName = listingType === 'event' ? 'events' : 'tours';
        const listingRef = doc(db, collectionName, listingId);
        const listingSnap = await getDoc(listingRef);

        if (!listingSnap.exists()) {
            return { success: false, error: 'Listing not found.' };
        }
        const listingData = serializeData(listingSnap) as Event | Tour;
        
        const organizerId = listingData.organizerId;
        let organizer: FirebaseUser | null = null;
        if(organizerId) {
            const orgDoc = await getDoc(doc(db, 'users', organizerId));
            if(orgDoc.exists()) {
                organizer = serializeData(orgDoc) as FirebaseUser;
            }
        }


        const ordersQuery = query(collection(db, 'orders'), where('listingId', '==', listingId), where('status', '==', 'completed'));
        const ticketsQuery = query(collection(db, 'tickets'), where('listingId', '==', listingId));
        const viewsQuery = query(collection(db, 'userEvents'), where('eventId', '==', listingId), where('action', '==', 'click_event'));

        const [ordersSnapshot, ticketsSnapshot, viewsSnapshot] = await Promise.all([
            getDocs(ordersQuery),
            getDocs(ticketsQuery),
            getDocs(viewsQuery)
        ]);

        const orders = ordersSnapshot.docs.map(serializeData) as Order[];
        const tickets = ticketsSnapshot.docs.map(serializeData) as Ticket[];
        
        const userIds = [...new Set(tickets.map(t => t.userId).filter(Boolean))] as string[];
        const users: Record<string, FirebaseUser> = {};
        if (userIds.length > 0) {
            // Firestore 'in' query limit is 30. If you expect more users, you'll need to batch this.
            const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', userIds));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
                users[doc.id] = serializeData(doc) as FirebaseUser;
            });
        }
        
        const attendees = tickets.map(ticket => ({ ...ticket, user: ticket.userId ? users[ticket.userId] : undefined }));


        // --- Aggregate Data ---
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalTicketsSold = tickets.length;
        const pageViews = viewsSnapshot.size;
        const conversionRate = pageViews > 0 ? (orders.length / pageViews) * 100 : 0;
        
        let salesByTicketType: { name: string; sold: number; total: number; }[] = [];
        if (listingType === 'event') {
             salesByTicketType = (listingData as Event).tickets?.map(ticketDef => {
                const sold = tickets.filter(t => t.ticketType === ticketDef.name).length;
                return { name: ticketDef.name, sold: sold, total: ticketDef.quantity };
            }) || [];
        }

        const scannedTickets = tickets.filter(t => t.status === 'used').length;

        const stats = {
            totalRevenue,
            totalTicketsSold,
            pageViews,
            conversionRate,
            salesByTicketType,
            attendance: {
                total: totalTicketsSold,
                scanned: scannedTickets,
                rate: totalTicketsSold > 0 ? (scannedTickets / totalTicketsSold) * 100 : 0
            }
        };

        return {
            success: true,
            data: { listing: {id: listingSnap.id, ...listingData}, stats, attendees, organizer }
        };

    } catch (error: any) {
        console.error("Error fetching listing details for admin:", error);
        return { success: false, error: 'Failed to fetch listing details.' };
    }
}

export async function updateListingStatus(listingId: string, type: 'event' | 'tour', status: 'published' | 'rejected' | 'taken-down' | 'archived') {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated.' };
    const auth = await getAdminAuth();

    try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        const collectionName = type === 'event' ? 'events' : 'tours';
        const listingDocRef = doc(db, collectionName, listingId);
        await updateDoc(listingDocRef, { status: status, updatedAt: serverTimestamp() });
        
        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: `update_${type}_status`,
            targetType: type,
            targetId: listingId,
            details: { newStatus: status }
        });

        revalidatePath(`/admin/listings/${listingId}`);
        revalidatePath(`/admin/${type}s`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Failed to update status.' };
    }
}


export async function generateManualTicketForAdmin(
    eventId: string, 
    ticketsToGenerate: { name: string; quantity: number }[],
    status: 'valid' | 'used'
): Promise<{ success: boolean; error?: string, orderId?: string }> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

    let admin;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        admin = { uid: decodedClaims.uid, name: decodedClaims.name || 'Admin' };
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }
    
    if (!ticketsToGenerate || ticketsToGenerate.length === 0) {
        return { success: false, error: 'No tickets specified for generation.'};
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
            return { success: false, error: 'Event not found.' };
        }
        const eventData = eventSnap.data();
        
        const batch = writeBatch(db);

        const orderRef = doc(collection(db, 'orders'));
        batch.set(orderRef, {
            userId: admin.uid,
            userName: 'Gate Sale (Admin)',
            userEmail: 'admin@mov33.com',
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
            deviceInfo: { userAgent: 'admin_gate_sale' },
        });

        for (const ticket of ticketsToGenerate) {
            for (let i = 0; i < ticket.quantity; i++) {
                const ticketRef = doc(collection(db, 'tickets'));
                const ticketPayload: Partial<Ticket> = {
                    orderId: orderRef.id,
                    userId: admin.uid,
                    userName: 'Gate Sale (Admin)',
                    listingId: eventId,
                    ticketType: ticket.name,
                    qrCode: ticketRef.id,
                    status: status,
                    createdAt: serverTimestamp(),
                    generatedBy: 'admin',
                };
                 if (status === 'used') {
                    ticketPayload.validatedAt = serverTimestamp();
                    ticketPayload.validatedBy = admin.uid;
                }
                batch.set(ticketRef, ticketPayload);
            }
        }

        await logAdminAction({
            adminId: admin.uid,
            adminName: admin.name,
            action: 'generate_manual_ticket',
            targetType: 'event',
            targetId: eventId,
            details: { tickets: ticketsToGenerate, status }
        });
        
        await batch.commit();
        
        revalidatePath(`/admin/listings/${eventId}`);
        return { success: true, orderId: orderRef.id };

    } catch (e: any) {
        console.error('Error generating manual ticket for admin:', e);
        return { success: false, error: 'Failed to generate ticket.' };
    }
}

export async function updateListingMerch(listingId: string, type: 'event' | 'tour', merch: { productId: string; productName: string; } | null) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated.' };
    const auth = await getAdminAuth();
    
    try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        const collectionName = type === 'event' ? 'events' : 'tours';
        const listingDocRef = doc(db, collectionName, listingId);
        await updateDoc(listingDocRef, { freeMerch: merch });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_free_merch',
            targetType: type,
            targetId: listingId,
            details: { newMerch: merch }
        });

        revalidatePath(`/admin/listings/${listingId}`);
        revalidatePath(`/${type}s/${listingId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Failed to update free merchandise.' };
    }
}

export async function getProductsForSelect(): Promise<{ success: boolean; data?: Product[], error?: string }> {
    noStore();
    try {
        const q = query(collection(db, "products"), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => serializeData(doc) as Product);
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: 'Failed to fetch products' };
    }
}


export async function updateEventGallery(listingId: string, galleryUrls: string[]) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated.' };
    const auth = await getAdminAuth();
    try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        const docRef = doc(db, "events", listingId);
        await updateDoc(docRef, {
            gallery: galleryUrls
        });
        
        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin/Organizer',
            action: 'update_event_gallery',
            targetType: 'event',
            targetId: listingId,
            details: { imageCount: galleryUrls.length }
        });

        revalidatePath(`/events/${listingId}`);
        revalidatePath(`/organizer/listings/${listingId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating gallery:", error);
        return { success: false, error: "Failed to update event gallery." };
    }
}


export async function updateVerificationStatus(listingId: string, type: 'event' | 'tour', isVerified: boolean) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated.' };
    const auth = await getAdminAuth();
    
    try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        const collectionName = type === 'event' ? 'events' : 'tours';
        const listingDocRef = doc(db, collectionName, listingId);
        await updateDoc(listingDocRef, { isVerified });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_verification_status',
            targetType: type,
            targetId: listingId,
            details: { isVerified }
        });

        revalidatePath(`/admin/listings/${listingId}`);
        revalidatePath(`/${type}s/${listingId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Failed to update verification status.' };
    }
}
