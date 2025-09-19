
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import type { Order, Tour, UserEvent, Transaction } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

export async function getTourAnalytics(tourId: string) {
    noStore();
    if (!tourId) {
        return { success: false, error: 'Tour ID is required.' };
    }

    try {
        const tourRef = doc(db, 'tours', tourId);
        const tourSnap = await getDoc(tourRef);

        if (!tourSnap.exists()) {
            return { success: false, error: 'Tour not found.' };
        }
        const tourData = serializeData(tourSnap) as Tour;

        const ordersQuery = query(collection(db, 'orders'), where('listingId', '==', tourId), where('status', '==', 'completed'));
        const viewsQuery = query(collection(db, 'userEvents'), where('eventId', '==', tourId), where('action', '==', 'click_event'));

        const [ordersSnapshot, viewsSnapshot] = await Promise.all([
            getDocs(ordersQuery),
            getDocs(viewsQuery)
        ]);

        const orders = ordersSnapshot.docs.map(serializeData) as Order[];

        // --- Aggregate Data ---
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalBookings = orders.length;

        const revenueFromFullPayment = orders.filter(o => o.paymentType === 'full').reduce((sum, order) => sum + order.total, 0);
        const revenueFromBookingFee = orders.filter(o => o.paymentType === 'booking').reduce((sum, order) => sum + order.total, 0);
        
        const pageViews = viewsSnapshot.size;
        const conversionRate = pageViews > 0 ? (orders.length / pageViews) * 100 : 0;

        const salesOverTime = orders.reduce((acc, order) => {
            const date = new Date((order.createdAt as any)).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const salesOverTimeChartData = Object.entries(salesOverTime).map(([date, sales]) => ({ date, sales })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const revenueDistribution = [
            { name: 'Full Payments', value: revenueFromFullPayment, fill: 'var(--color-full)'},
            { name: 'Booking Fees', value: revenueFromBookingFee, fill: 'var(--color-booking)'},
        ];

        return {
            success: true,
            data: {
                tourName: tourData.name,
                totalRevenue,
                totalBookings,
                pageViews,
                conversionRate,
                revenueDistribution,
                salesOverTime: salesOverTimeChartData,
            }
        };

    } catch (error) {
        console.error('Error fetching tour analytics:', error);
        return { success: false, error: 'Failed to fetch analytics data.' };
    }
}

export async function getTourAttendeeReport(tourId: string): Promise<{ success: boolean; data?: any[]; error?: string; }> {
    noStore();
    if (!tourId) {
        return { success: false, error: 'Tour ID is required.' };
    }

    try {
        const ordersQuery = query(
            collection(db, 'orders'),
            where('listingId', '==', tourId),
            where('status', '==', 'completed')
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const orders = ordersSnapshot.docs.map(serializeData) as Order[];

        if (orders.length === 0) {
            return { success: true, data: [] };
        }

        const orderIds = orders.map(o => o.id);
        const transactionsQuery = query(
            collection(db, 'transactions'),
            where('orderId', 'in', orderIds),
            where('status', '==', 'completed')
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactions = transactionsSnapshot.docs.map(serializeData) as Transaction[];

        const transactionsByOrderId: Record<string, Transaction> = {};
        transactions.forEach(t => {
            transactionsByOrderId[t.orderId] = t;
        });

        const reportData = orders.map(order => ({
            'Name': order.userName,
            'Phone': order.userPhone,
            'Email': order.userEmail,
            'Payment_Type': order.paymentType,
            'Amount_Paid': order.total,
            'Mpesa_Receipt': transactionsByOrderId[order.id]?.mpesaConfirmationCode || 'N/A',
            'Booking_Date': new Date(order.createdAt).toLocaleString(),
        }));
        
        return { success: true, data: reportData };
        
    } catch (error: any) {
        return { success: false, error: 'Failed to generate report.' };
    }
}
