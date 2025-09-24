
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy, getCountFromServer } from 'firebase/firestore';
import type { Order, Event, FirebaseUser, SupportTicket } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

function serializeData(doc: any) {
    const data = doc.data();
    const serialized: { [key: string]: any } = { id: doc.id };
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            serialized[key] = data[key].toDate().toISOString();
        } else if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
            // Flatten nested objects like deviceInfo
            for(const subKey in data[key]) {
                 serialized[`${key}_${subKey}`] = data[key][subKey];
            }
        } else if (Array.isArray(data[key])) {
             serialized[key] = JSON.stringify(data[key]);
        }
        else {
            serialized[key] = data[key];
        }
    }
    return serialized;
}


export async function getFinancialReport() {
    noStore();
    try {
        const q = query(collection(db, 'orders'), where('status', '==', 'completed'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(serializeData);
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function getEventPerformanceReport() {
    noStore();
    try {
        const eventsQuery = query(collection(db, 'events'));
        const ordersQuery = query(collection(db, 'orders'), where('status', '==', 'completed'));

        const [eventsSnapshot, ordersSnapshot] = await Promise.all([
            getDocs(eventsQuery),
            getDocs(ordersQuery)
        ]);

        const orders = ordersSnapshot.docs.map(doc => doc.data() as Order);

        const report = eventsSnapshot.docs.map(doc => {
            const event = { id: doc.id, ...doc.data() } as Event;
            const eventOrders = orders.filter(o => o.listingId === event.id);
            const totalRevenue = eventOrders.reduce((sum, order) => sum + order.total, 0);
            const ticketsSold = eventOrders.reduce((sum, order) => sum + order.tickets.reduce((qSum, t) => qSum + t.quantity, 0), 0);
            return {
                eventId: event.id,
                eventName: event.name,
                eventDate: event.date,
                status: event.status,
                organizerName: event.organizerName,
                totalRevenue,
                ticketsSold,
            };
        });

        return { success: true, data: report.sort((a,b) => b.totalRevenue - a.totalRevenue) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getUserReport() {
    noStore();
    try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(serializeData);
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function getLostAndFoundReport() {
    noStore();
    try {
        const q = query(collection(db, 'supportTickets'), where('subject', '==', 'Lost & Found'));
        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;
        // In a real scenario, we would generate a more detailed report.
        // For this, we're just returning the count. A CSV could be generated here.
        return { success: true, data: [{ total_items_reported: count }] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
