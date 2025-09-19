

'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy, addDoc, serverTimestamp, increment, writeBatch, setDoc } from 'firebase/firestore';
import type { Promocode, TrackingLink, PromocodeClick, Order, ShortLink } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { subDays, format } from 'date-fns';
import { createShortLink } from '@/lib/shortlinks';


export async function getCampaignDetails(id: string) {
    noStore();
    try {
        const promocodeRef = doc(db, 'promocodes', id);
        let trackingLinksQuery;

        if (id) {
             trackingLinksQuery = query(collection(db, 'promocodes', id, 'trackingLinks'), orderBy('createdAt', 'desc'));
        } else {
            // This case might be for general tracking links not tied to a specific promocode
             trackingLinksQuery = query(collection(db, 'trackingLinks'), orderBy('createdAt', 'desc'));
        }

        const [promocodeSnap, trackingLinksSnapshot] = await Promise.all([
            id ? getDoc(promocodeRef) : Promise.resolve(null),
            getDocs(trackingLinksQuery)
        ]);

        if (id && !promocodeSnap?.exists()) {
            return { success: false, error: 'Campaign not found.' };
        }
        
        const campaign = id ? ({ id: promocodeSnap.id, ...promocodeSnap.data() } as Promocode) : null;
        const trackingLinks = trackingLinksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrackingLink));
        
        if (campaign && campaign.influencerId) {
            const userDocRef = doc(db, 'users', campaign.influencerId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                (campaign as any).influencerName = userDoc.data().name;
            }
        }
        
        return {
            success: true,
            data: {
                campaign,
                trackingLinks,
            }
        };

    } catch (e: any) {
        console.error("Error in getCampaignDetails:", e);
        return { success: false, error: e.message };
    }
}


export async function createTrackingLink(payload: { promocodeId?: string, listingType: string, listingId?: string, name: string, shortId?: string }): Promise<{ success: boolean; data?: TrackingLink; error?: string; }> {
    const { promocodeId, listingType, listingId, name, shortId } = payload;
    if (!name || !listingId) {
        return { success: false, error: "Listing ID and link name are required." };
    }
    
    let promocodeSnap;
    let promocode;
    if (promocodeId) {
        promocodeSnap = await getDoc(doc(db, 'promocodes', promocodeId));
        if (!promocodeSnap.exists()) {
             return { success: false, error: "Associated campaign not found." };
        }
        promocode = promocodeSnap.data();
    }

    try {
        const collectionRef = promocodeId ? collection(db, 'promocodes', promocodeId, 'trackingLinks') : collection(db, 'trackingLinks');
        const linkRef = doc(collectionRef);
        
        const destination = listingType === 'all' ? '/events' : `/${listingType}s/${listingId}`;
        let longUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}${destination}?linkId=${linkRef.id}`;
        
        if(promocode) {
            longUrl += `&coupon=${promocode.code}`;
        }
        
        const finalShortId = await createShortLink({
            longUrl,
            listingId,
            promocodeId: promocodeId,
            trackingLinkId: linkRef.id,
            shortId: shortId,
        });

        const newLink: Omit<TrackingLink, 'id'> = {
            name,
            listingId,
            listingType,
            clicks: 0,
            purchases: 0,
            longUrl,
            shortId: finalShortId,
            createdAt: serverTimestamp(),
        };
        if (promocodeId) newLink.promocodeId = promocodeId;

        await setDoc(linkRef, newLink);
        
        return { success: true, data: { ...newLink, id: linkRef.id, shortId: finalShortId, createdAt: new Date().toISOString() } as TrackingLink };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function trackLinkClick(payload: { promocodeId: string, trackingLinkId: string }) {
    const { promocodeId, trackingLinkId } = payload;
    if (!promocodeId || !trackingLinkId) return { success: false, error: "Missing IDs" };
    
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    try {
        const linkRef = doc(db, 'promocodes', promocodeId, 'trackingLinks', trackingLinkId);
        const linkSnap = await getDoc(linkRef);
        if (!linkSnap.exists()) {
            console.warn(`trackLinkClick: TrackingLink not found for ID "${trackingLinkId}"`);
            return { success: false, error: "Tracking link not found" };
        }
        const shortId = linkSnap.data().shortId;

        const batch = writeBatch(db);

        // Increment click count on the tracking link
        batch.update(linkRef, { clicks: increment(1) });
        
        // Log the click event
        const clickLogRef = doc(collection(db, 'promocodeClicks'));
        const clickLog: PromocodeClick = {
            promocodeId,
            trackingLinkId,
            shortId,
            timestamp: serverTimestamp(),
            ipAddress,
            userAgent
        };
        batch.set(clickLogRef, clickLog);
        
        await batch.commit();
        return { success: true };
    } catch (error) {
        // Non-critical, fail silently on server but log error
        console.error("Failed to track link click:", error);
        return { success: false };
    }
}
