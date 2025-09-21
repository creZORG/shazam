
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, doc, updateDoc, orderBy, where, Timestamp } from "firebase/firestore";
import type { Tour, Order, UserEvent } from '@/lib/types';
import { logAdminAction } from '@/services/audit-service';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';

export type TourWithStats = Tour & {
    id: string;
    status: string;
    totalRevenue: number;
    views: number;
};

export async function getAllTours() {
    noStore();
    try {
        const toursQuery = query(collection(db, "tours"), orderBy("updatedAt", "desc"));
        const toursSnapshot = await getDocs(toursQuery);
        const tours = toursSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Tour & { id: string, status: string })[];

        if (tours.length === 0) {
            return { success: true, data: [] };
        }

        // Get all relevant orders and userEvents in single queries
        const tourIds = tours.map(t => t.id);
        const ordersQuery = query(collection(db, "orders"), where('listingId', 'in', tourIds), where('status', '==', 'completed'));
        const viewsQuery = query(collection(db, "userEvents"), where('eventId', 'in', tourIds), where('action', '==', 'click_event'));

        const [ordersSnapshot, viewsSnapshot] = await Promise.all([
            getDocs(ordersQuery),
            getDocs(viewsQuery)
        ]);

        const ordersByTourId = new Map<string, Order[]>();
        ordersSnapshot.forEach(doc => {
            const order = doc.data() as Order;
            const existing = ordersByTourId.get(order.listingId) || [];
            existing.push(order);
            ordersByTourId.set(order.listingId, existing);
        });
        
        const viewsByTourId = new Map<string, number>();
        viewsSnapshot.forEach(doc => {
            const event = doc.data() as UserEvent;
            viewsByTourId.set(event.eventId, (viewsByTourId.get(event.eventId) || 0) + 1);
        });


        // Combine data
        const toursWithStats: TourWithStats[] = tours.map(tour => {
            const tourOrders = ordersByTourId.get(tour.id) || [];
            const totalRevenue = tourOrders.reduce((sum, order) => sum + order.total, 0);
            const views = viewsByTourId.get(tour.id) || 0;

            return {
                ...tour,
                totalRevenue,
                views
            };
        });

        return { success: true, data: toursWithStats };
    } catch (error: any) {
        console.error("Error fetching all tours:", error);
        return { success: false, error: `Failed to fetch tours. Details: ${error.message}` };
    }
}

export async function updateTourStatus(tourId: string, status: 'published' | 'rejected' | 'taken-down' | 'archived') {
    if (!tourId || !status) {
        return { success: false, error: 'Tour ID and status are required.' };
    }

    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();
    
    if (!auth) {
        throw new Error("Server auth not initialized");
    }
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    try {
        const tourDocRef = doc(db, "tours", tourId);
        await updateDoc(tourDocRef, {
            status: status,
        });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_tour_status',
            targetType: 'tour',
            targetId: tourId,
            details: { newStatus: status }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating tour status:", error);
        return { success: false, error: `Failed to update tour status. Details: ${error.message}` };
    }
}
