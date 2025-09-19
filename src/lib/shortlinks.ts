

'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { customAlphabet } from 'nanoid';
import type { ShortLink } from './types';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

interface CreateShortLinkPayload {
    longUrl: string;
    listingId: string;
    shortId?: string; // Optional custom ID
    invitationId?: string;
    promocodeId?: string;
    trackingLinkId?: string;
}

/**
 * Creates a unique short ID and stores the long URL and tracking info in Firestore.
 * @param payload - The data for the short link.
 * @returns The generated or provided short ID.
 * @throws If a custom ID is provided and already exists, or if a unique ID cannot be generated.
 */
export async function createShortLink(payload: CreateShortLinkPayload): Promise<string> {
    let finalShortId: string;

    if (payload.shortId) {
        // If a custom ID is provided, check for its existence
        const checkDoc = await getDoc(doc(db, 'shortLinks', payload.shortId));
        if (checkDoc.exists()) {
            throw new Error(`The custom link path "${payload.shortId}" is already taken.`);
        }
        finalShortId = payload.shortId;
    } else {
        // Otherwise, generate a random one and ensure it's unique
        let attempts = 0;
        const MAX_ATTEMPTS = 5;
        let randomId = nanoid();

        while (attempts < MAX_ATTEMPTS) {
            const checkDoc = await getDoc(doc(db, 'shortLinks', randomId));
            if (!checkDoc.exists()) {
                finalShortId = randomId;
                break;
            }
            randomId = nanoid();
            attempts++;
        }
        
        if (!finalShortId!) {
            throw new Error("Could not generate a unique short link ID after several attempts.");
        }
    }
    
    const linkData: Partial<ShortLink> = { 
        longUrl: payload.longUrl,
        listingId: payload.listingId,
        createdAt: serverTimestamp() 
    };

    if (payload.invitationId) linkData.invitationId = payload.invitationId;
    if (payload.promocodeId) linkData.promocodeId = payload.promocodeId;
    if (payload.trackingLinkId) linkData.trackingLinkId = payload.trackingLinkId;

    await setDoc(doc(db, 'shortLinks', finalShortId!), linkData);
    
    return finalShortId!;
}
