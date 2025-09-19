

'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { customAlphabet } from 'nanoid';
import type { ShortLink } from './types';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

interface CreateShortLinkPayload {
    longUrl: string;
    invitationId?: string; // New field to directly link to an invitation
}

/**
 * Creates a unique short ID and stores the long URL and tracking info in Firestore.
 * @param payload - The data for the short link.
 * @returns The generated short ID.
 * @throws If a unique ID cannot be generated after 5 attempts.
 */
export async function createShortLink(payload: CreateShortLinkPayload): Promise<string> {
    const { longUrl, invitationId } = payload;
    let shortId = nanoid();
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    // Check for uniqueness, retry if a collision occurs
    while (attempts < MAX_ATTEMPTS) {
        const checkDoc = await getDoc(doc(db, 'shortLinks', shortId));
        if (!checkDoc.exists()) {
            break; // Unique ID found
        }
        shortId = nanoid();
        attempts++;
    }
    
    if (attempts === MAX_ATTEMPTS) {
        throw new Error("Could not generate a unique short link ID after several attempts.");
    }
    
    const linkData: ShortLink = { 
        longUrl,
        createdAt: serverTimestamp() 
    };

    if (invitationId) {
        linkData.invitationId = invitationId;
    }

    await setDoc(doc(db, 'shortLinks', shortId), linkData);
    
    return shortId;
}
