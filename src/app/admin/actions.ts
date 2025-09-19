
'use server';

import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { FirebaseUser, Order } from '@/lib/types';
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


export async function getAdminDashboardData() {
    noStore();
    try {
        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
        const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        
        const allUsersQuery = query(collection(db, 'users'));
        const allEventsQuery = query(collection(db, 'events'));

        const [
            recentUsersSnapshot, 
            ordersSnapshot, 
            allUsersSnapshot,
            allEventsSnapshot
        ] = await Promise.all([
            getDocs(usersQuery),
            getDocs(ordersQuery),
            getDocs(allUsersQuery),
            getDocs(allEventsQuery),
        ]);

        const recentUsers = recentUsersSnapshot.docs.map(serializeData) as FirebaseUser[];
        const recentOrders = ordersSnapshot.docs.slice(0, 5).map(serializeData) as Order[];
        
        const orders = ordersSnapshot.docs.map(serializeData) as Order[];

        // --- Aggregate Stats ---
        const totalUsers = allUsersSnapshot.size;
        const totalEvents = allEventsSnapshot.size;
        const totalRevenue = orders
            .filter(o => o.status === 'completed')
            .reduce((sum, order) => sum + order.total, 0);

        // --- Chart Data ---
        const salesOverTime = orders
            .filter(o => o.status === 'completed')
            .reduce((acc, order) => {
                const date = new Date(order.createdAt).toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + order.total;
                return acc;
            }, {} as Record<string, number>);

        const salesChartData = Object.entries(salesOverTime)
            .map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        return {
            success: true,
            data: {
                totalUsers,
                totalRevenue,
                totalEvents,
                recentUsers,
                recentOrders,
                salesChartData,
            }
        };

    } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        return { success: false, error: "Failed to fetch dashboard data." };
    }
}
