
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy, addDoc, serverTimestamp, increment, writeBatch, setDoc } from 'firestore';
import type { Promocode, TrackingLink, PromocodeClick, Order, ShortLink } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { subDays, format } from 'date-fns';
import { createShortLink } from '@/lib/shortlinks';
import { getDocs as getFirestoreDocs, query as firestoreQuery, collection as firestoreCollection, where as firestoreWhere } from 'firebase/firestore';


export async function getCampaignDetails(id: string) {
    noStore();
    try {
        const promocodeRef = doc(db, 'promocodes', id);
        const trackingLinksQuery = query(collection(db, 'promocodes', id, 'trackingLinks'), orderBy('createdAt', 'desc'));

        const [promocodeSnap, trackingLinksSnapshot] = await Promise.all([
            getDoc(promocodeRef),
            getDocs(trackingLinksQuery)
        ]);

        if (!promocodeSnap.exists()) {
            return { success: false, error: 'Campaign not found.' };
        }
        
        const campaign = { id: promocodeSnap.id, ...promocodeSnap.data() } as Promocode;
        const trackingLinks = trackingLinksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrackingLink));
        
        if (campaign.influencerId) {
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


export async function createTrackingLink(payload: { promocodeId: string, listingType: string, listingId?: string, name: string }): Promise<{ success: boolean; data?: TrackingLink; error?: string; }> {
    const { promocodeId, listingType, listingId, name } = payload;
    if (!promocodeId || !name) {
        return { success: false, error: "Promocode ID and link name are required." };
    }
    
    try {
        const promocodeSnap = await getDoc(doc(db, 'promocodes', promocodeId));
        if (!promocodeSnap.exists()) {
             return { success: false, error: "Associated campaign not found." };
        }
        const promocode = promocodeSnap.data();


        const linkRef = doc(collection(db, 'promocodes', promocodeId, 'trackingLinks'));
        
        const destination = listingType === 'all' ? '/events' : `/${listingType}s/${listingId}`;
        const longUrl = `${destination}?coupon=${promocode.code}&linkId=${linkRef.id}`;
        
        const shortId = await createShortLink(longUrl);

        const newLink: Omit<TrackingLink, 'id'> = {
            name,
            clicks: 0,
            purchases: 0,
            longUrl,
            shortId,
            createdAt: serverTimestamp(),
        };
        await setDoc(linkRef, newLink);
        
        return { success: true, data: { ...newLink, id: linkRef.id, shortId: shortId, createdAt: new Date().toISOString() } as TrackingLink };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function trackLinkClick(payload: { couponCode: string, trackingLinkId: string }) {
    const { couponCode, trackingLinkId } = payload;
    if (!couponCode || !trackingLinkId) return { success: false, error: "Missing IDs" };
    
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    try {
        // Find the promocode to get its ID
        const promoQuery = firestoreQuery(firestoreCollection(db, "promocodes"), firestoreWhere("code", "==", couponCode));
        const promoSnapshot = await getFirestoreDocs(promoQuery);

        if (promoSnapshot.empty) {
            console.warn(`trackLinkClick: Promocode not found for code "${couponCode}"`);
            return { success: false, error: "Promocode not found" };
        }
        const promocodeId = promoSnapshot.docs[0].id;
        const promocodeDoc = promoSnapshot.docs[0].data() as Promocode;
        const shortId = (await getDoc(doc(db, 'promocodes', promocodeId, 'trackingLinks', trackingLinkId))).data()?.shortId;

        const batch = writeBatch(db);

        // Increment click count on the tracking link
        const linkRef = doc(db, 'promocodes', promocodeId, 'trackingLinks', trackingLinkId);
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
