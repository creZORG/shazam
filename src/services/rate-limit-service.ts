
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, addDoc, serverTimestamp, runTransaction, doc } from 'firebase/firestore';
import type { RateLimit } from '@/lib/types';

const RATE_LIMIT_WINDOW_MINUTES = 10;
const MAX_ATTEMPTS_PER_WINDOW = 5;

/**
 * Checks if a given IP address has exceeded the rate limit for a specific event.
 * @param ipAddress The IP address of the user.
 * @param eventId The ID of the event they are trying to purchase tickets for.
 * @returns An object indicating success or failure.
 */
export async function checkRateLimit(ipAddress: string, eventId: string): Promise<{ success: boolean; error?: string }> {
    if (ipAddress === 'unknown') {
        // Cannot rate limit unknown IPs, so we allow the request.
        return { success: true };
    }

    const key = `${ipAddress}_${eventId}`;
    const now = Timestamp.now();
    const windowStart = Timestamp.fromMillis(now.toMillis() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

    const q = query(
        collection(db, 'rateLimits'),
        where('key', '==', key),
        where('expiresAt', '>=', now)
    );
    
    const snapshot = await getDocs(q);

    if (snapshot.size >= MAX_ATTEMPTS_PER_WINDOW) {
        return { success: false, error: 'You have made too many purchase attempts for this event. Please wait a few minutes before trying again.' };
    }

    return { success: true };
}

/**
 * Records a checkout attempt for rate limiting purposes.
 * @param ipAddress The IP address of the user.
 * @param eventId The ID of the event.
 */
export async function recordRateLimit(ipAddress: string, eventId: string): Promise<void> {
     if (ipAddress === 'unknown') {
        return;
    }
    
    try {
        const key = `${ipAddress}_${eventId}`;
        const expiresAt = Timestamp.fromMillis(Date.now() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

        await addDoc(collection(db, 'rateLimits'), {
            key,
            createdAt: serverTimestamp(),
            expiresAt,
        });

    } catch (error) {
        console.error("Failed to record rate limit attempt:", error);
        // This is a non-critical background task, so we don't throw an error to the user.
    }
}
