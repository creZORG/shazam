
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import type { Order, Ticket, UserEvent, Event } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { auth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';

async function getOrganizerId(): Promise<string | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch {
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

export async function getEventAnalytics(eventId: string) {
    noStore();
    const organizerId = await getOrganizerId();
    if (!organizerId) {
        return { success: false, error: 'Not authenticated.' };
    }
    if (!eventId) {
        return { success: false, error: 'Event ID is required.' };
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists()) {
            return { success: false, error: 'Event not found.' };
        }
        const eventData = serializeData(eventSnap) as Event;

        // Security Check: Ensure the user is the organizer of this event
        if (eventData.organizerId !== organizerId) {
            return { success: false, error: 'Access Denied. You are not the organizer of this event.' };
        }

        const ordersQuery = query(collection(db, 'orders'), where('listingId', '==', eventId), where('status', '==', 'completed'));
        const ticketsQuery = query(collection(db, 'tickets'), where('listingId', '==', eventId));
        const viewsQuery = query(collection(db, 'userEvents'), where('eventId', '==', eventId), where('action', '==', 'click_event'));

        const [ordersSnapshot, ticketsSnapshot, viewsSnapshot] = await Promise.all([
            getDocs(ordersQuery),
            getDocs(ticketsQuery),
            getDocs(viewsQuery)
        ]);

        const orders = ordersSnapshot.docs.map(serializeData) as Order[];
        const tickets = ticketsSnapshot.docs.map(serializeData) as Ticket[];

        // --- Aggregate Data ---
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalTicketsSold = orders.reduce((sum, order) => sum + order.tickets.reduce((qSum, t) => qSum + t.quantity, 0), 0);
        const totalCapacity = eventData.tickets?.reduce((sum, t) => sum + t.quantity, 0) || 0;

        const ticketsScanned = tickets.filter(t => t.status === 'used').length;
        const attendanceRate = totalTicketsSold > 0 ? (ticketsScanned / totalTicketsSold) * 100 : 0;
        
        const pageViews = viewsSnapshot.size;
        const conversionRate = pageViews > 0 ? (orders.length / pageViews) * 100 : 0;

        const salesByTicketType = eventData.tickets?.map(ticketDef => {
            const sold = orders.reduce((sum, order) => {
                const ticketItem = order.tickets.find(t => t.name === ticketDef.name);
                return sum + (ticketItem?.quantity || 0);
            }, 0);
            return { name: ticketDef.name, sold };
        }) || [];

        const salesOverTime = orders.reduce((acc, order) => {
            const date = new Date((order.createdAt as any)).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const salesOverTimeChartData = Object.entries(salesOverTime).map(([date, sales]) => ({ date, sales })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            success: true,
            data: {
                eventName: eventData.name,
                totalRevenue,
                totalTicketsSold,
                totalCapacity,
                ticketsScanned,
                attendanceRate,
                pageViews,
                conversionRate,
                salesByTicketType,
                salesOverTime: salesOverTimeChartData,
            }
        };

    } catch (error) {
        console.error('Error fetching event analytics:', error);
        return { success: false, error: 'Failed to fetch analytics data.' };
    }
}
