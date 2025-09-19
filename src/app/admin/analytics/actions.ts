
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, getCountFromServer, orderBy } from 'firebase/firestore';
import type { FirebaseUser, Event, Promocode, Order, UserEvent } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { subDays, startOfDay, format, differenceInDays } from 'date-fns';

function safeToDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return null;
}


export async function getAnalyticsData() {
    noStore();
    try {
        const thirtyDaysAgo = subDays(new Date(), 30);
        const usersRef = collection(db, 'users');

        // --- User Growth Data ---
        const recentUsersQuery = query(
            usersRef,
            where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
        );
        const recentUsersSnapshot = await getDocs(recentUsersQuery);
        
        const signupsByDay: Record<string, number> = {};
        recentUsersSnapshot.forEach(doc => {
            const user = doc.data() as FirebaseUser;
            const signupDate = safeToDate(user.createdAt);
            if (signupDate) {
                const day = format(signupDate, 'yyyy-MM-dd');
                signupsByDay[day] = (signupsByDay[day] || 0) + 1;
            }
        });

        // Fill in missing days with 0 signups
        for (let i = 0; i < 30; i++) {
            const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
            if (!signupsByDay[day]) {
                signupsByDay[day] = 0;
            }
        }

        const userGrowthData = Object.entries(signupsByDay)
            .map(([date, count]) => ({ date, users: count }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        // --- User Roles Data ---
        const roles = ['attendee', 'organizer', 'influencer', 'club', 'verifier', 'admin', 'super-admin'];
        const roleCounts: { role: string, count: number }[] = [];

        for (const role of roles) {
            const q = query(usersRef, where('role', '==', role));
            const snapshot = await getCountFromServer(q);
            roleCounts.push({ role: role.charAt(0).toUpperCase() + role.slice(1), count: snapshot.data().count });
        }
        
        const userRolesData = roleCounts.filter(r => r.count > 0);

        // --- Revenue, Traffic, and Top Spenders Data ---
        const eventsRef = collection(db, 'events');
        const ordersQuery = query(collection(db, 'orders'), where('status', '==', 'completed'));
        const userEventsQuery = query(collection(db, 'userEvents'));
        
        const [eventsSnapshot, ordersSnapshot, userEventsSnapshot] = await Promise.all([
            getDocs(eventsRef),
            getDocs(ordersQuery),
            getDocs(userEventsQuery)
        ]);

        const events = eventsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data() } as Event));
        const orders = ordersSnapshot.docs.map(doc => doc.data() as Order);
        const userEvents = userEventsSnapshot.docs.map(doc => doc.data() as UserEvent);

        const revenueByCategory: Record<string, number> = {};
        const trafficByChannel: Record<string, number> = {};
        const spendByUser: Record<string, { totalSpent: number, orderCount: number, userName: string }> = {};

        orders.forEach(order => {
            // Revenue by category
            const event = events.find(e => e.id === order.listingId);
            if (event && event.category) {
                revenueByCategory[event.category] = (revenueByCategory[event.category] || 0) + order.total;
            }
            
            // Traffic by channel
            const channel = order.channel || 'direct';
            trafficByChannel[channel] = (trafficByChannel[channel] || 0) + 1;

            // Spend by user
            if (order.userId) {
                if (!spendByUser[order.userId]) {
                    spendByUser[order.userId] = { totalSpent: 0, orderCount: 0, userName: order.userName };
                }
                spendByUser[order.userId].totalSpent += order.total;
                spendByUser[order.userId].orderCount += 1;
            }
        });
        
        const revenueByCategoryData = Object.entries(revenueByCategory)
            .map(([category, revenue]) => ({ category, revenue: Math.round(revenue) }))
            .sort((a, b) => b.revenue - a.revenue);
            
        const trafficSourceData = Object.entries(trafficByChannel)
            .map(([channel, count]) => ({ channel: channel.charAt(0).toUpperCase() + channel.slice(1), count }))
            .sort((a, b) => b.count - a.count);
            
        const topSpendersData = Object.entries(spendByUser)
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);


        // --- Top Promocodes ---
        const promocodesQuery = query(collection(db, 'promocodes'), orderBy('revenueGenerated', 'desc'), where('usageCount', '>', 0));
        const promocodesSnapshot = await getDocs(promocodesQuery);

        const topPromocodesData = promocodesSnapshot.docs.map(doc => {
            const data = doc.data() as Promocode;
            return {
                code: data.code,
                influencerName: 'N/A', // Placeholder, needs influencer join
                usageCount: data.usageCount,
                revenueGenerated: data.revenueGenerated || 0
            }
        }).slice(0, 10);
        
        // --- Behavioral Analytics ---
        const conversionFunnel = {
            views: userEvents.filter(e => e.action === 'click_event').length,
            checkouts: userEvents.filter(e => e.action === 'start_checkout').length,
            purchases: orders.length,
        };

        const purchaseTimingCategories: Record<string, number> = {
            "Early Bird (>14 days)": 0,
            "Standard (3-14 days)": 0,
            "Last Minute (<3 days)": 0,
            "Same Day": 0,
        };

        orders.forEach(order => {
            const event = events.find(e => e.id === order.listingId);
            if(event) {
                const purchaseDate = safeToDate(order.createdAt);
                const eventDate = safeToDate(event.date);
                if (purchaseDate && eventDate) {
                    const daysBefore = differenceInDays(eventDate, purchaseDate);
                    if (daysBefore > 14) purchaseTimingCategories["Early Bird (>14 days)"]++;
                    else if (daysBefore > 2) purchaseTimingCategories["Standard (3-14 days)"]++;
                    else if (daysBefore >= 1) purchaseTimingCategories["Last Minute (<3 days)"]++;
                    else purchaseTimingCategories["Same Day"]++;
                }
            }
        });
        
        const purchaseTimingData = Object.entries(purchaseTimingCategories).map(([category, count]) => ({ category, count }));


        return {
            success: true,
            data: {
                userGrowthData,
                userRolesData,
                revenueByCategoryData,
                topPromocodesData,
                trafficSourceData,
                topSpendersData,
                conversionFunnel,
                purchaseTimingData
            }
        };

    } catch (error) {
        console.error("Error fetching analytics data:", error);
        return { success: false, error: "Failed to fetch analytics data." };
    }
}
