
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy, doc } from 'firebase/firestore';
import type { Event, Tour, TrackingLink, PromocodeClick } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { subDays, startOfDay, format } from 'date-fns';


function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

export async function getPublishedEvents(): Promise<{ success: boolean; data?: (Event & { id: string })[]; error?: string; }> {
    noStore();
    try {
        const q = query(collection(db, 'events'), where('status', '==', 'published'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => serializeData(doc)) as (Event & { id: string })[];
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getPublishedTours(): Promise<{ success: boolean; data?: (Tour & { id: string })[]; error?: string; }> {
    noStore();
    try {
        const q = query(collection(db, 'tours'), where('status', '==', 'published'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => serializeData(doc)) as (Tour & { id: string })[];
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function getLinkAnalytics(linkId: string, promocodeId?: string) {
    noStore();
    if (!linkId) return { success: false, error: 'Link ID is required.' };

    try {
        const collectionPath = promocodeId 
            ? `promocodes/${promocodeId}/trackingLinks` 
            : 'trackingLinks';
        
        const linkRef = doc(db, collectionPath, linkId);
        const linkSnap = await getDoc(linkRef);

        if (!linkSnap.exists()) {
            return { success: false, error: 'Tracking link not found.' };
        }

        const linkData = serializeData(linkSnap) as TrackingLink;
        
        // Fetch clicks
        const clicksQuery = query(
            collection(db, 'promocodeClicks'), 
            where('trackingLinkId', '==', linkId),
            orderBy('timestamp', 'desc')
        );
        const clicksSnap = await getDocs(clicksQuery);
        const clicks = clicksSnap.docs.map(doc => serializeData(doc)) as PromocodeClick[];

        // Aggregate clicks per day
        const clicksByDay: Record<string, number> = {};
        const thirtyDaysAgo = subDays(new Date(), 30);

        clicks.forEach(click => {
            const clickDate = new Date(click.timestamp as any);
            if (clickDate >= thirtyDaysAgo) {
                const day = format(clickDate, 'yyyy-MM-dd');
                clicksByDay[day] = (clicksByDay[day] || 0) + 1;
            }
        });
        
        const chartData = Object.entries(clicksByDay)
            .map(([date, count]) => ({ date, clicks: count }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        return {
            success: true,
            data: {
                link: linkData,
                recentClicks: clicks.slice(0, 50),
                clicksByDay: chartData,
            }
        };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
