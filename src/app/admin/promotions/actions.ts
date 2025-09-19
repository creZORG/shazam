
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy, doc, collectionGroup, getDoc } from 'firebase/firestore';
import type { Event, Tour, TrackingLink, PromocodeClick, Promocode } from '@/lib/types';
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

export async function getAllTrackingLinks() {
    noStore();
    try {
        // 1. Get all general links
        const generalLinksQuery = query(collection(db, 'trackingLinks'), orderBy('createdAt', 'desc'));
        
        // 2. Get all links nested under promocodes
        const promocodeLinksQuery = query(collectionGroup(db, 'trackingLinks'), orderBy('createdAt', 'desc'));
        
        const [generalLinksSnapshot, promocodeLinksSnapshot] = await Promise.all([
            getDocs(generalLinksQuery),
            getDocs(promocodeLinksQuery)
        ]);

        const allLinksMap = new Map<string, TrackingLink>();

        // Process general links first
        generalLinksSnapshot.forEach(doc => {
            allLinksMap.set(doc.id, serializeData(doc) as TrackingLink);
        });

        // Process nested links, they will overwrite if IDs collide (which they shouldn't with Firestore's auto-IDs)
        promocodeLinksSnapshot.forEach(doc => {
            if (!allLinksMap.has(doc.id)) {
                 allLinksMap.set(doc.id, serializeData(doc) as TrackingLink);
            }
        });

        const links = Array.from(allLinksMap.values());
        links.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Batch fetch event/tour names to avoid N+1 queries
        const listingIds = [...new Set(links.map(l => l.listingId))].filter(Boolean);
        const listingsData: Record<string, string> = {};

        if (listingIds.length > 0) {
            const eventsQuery = query(collection(db, 'events'), where('__name__', 'in', listingIds));
            const toursQuery = query(collection(db, 'tours'), where('__name__', 'in', listingIds));

            const [eventsSnapshot, toursSnapshot] = await Promise.all([
                getDocs(eventsQuery),
                getDocs(toursQuery)
            ]);

            eventsSnapshot.forEach(doc => {
                listingsData[doc.id] = doc.data().name || 'Untitled Event';
            });
            toursSnapshot.forEach(doc => {
                listingsData[doc.id] = doc.data().name || 'Untitled Tour';
            });
        }
        
        const data = links.map(link => ({
            ...link,
            listingName: listingsData[link.listingId] || 'N/A',
        }));

        return { success: true, data };
    } catch (e: any) {
        console.error("Error fetching all tracking links:", e);
        return { success: false, error: 'Failed to fetch tracking links.' };
    }
}
