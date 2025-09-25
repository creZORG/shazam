
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, runTransaction, Timestamp } from 'firebase/firestore';
import type { Event, Tour, RatingToken, Rating } from '@/lib/types';
import { uploadImage } from '@/app/organizer/events/create/cloudinary-actions';

/**
 * Validates a rating token and retrieves associated event/tour details.
 */
export async function getRatingTokenDetails(token: string): Promise<{ success: boolean, data?: { listing: Event | Tour, tokenData: RatingToken }, error?: string }> {
    if (!token) {
        return { success: false, error: "Invalid rating link." };
    }
    try {
        const tokenRef = doc(db, 'ratingTokens', token);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
            return { success: false, error: 'This rating link is invalid or has already been used.' };
        }

        const tokenData = tokenSnap.data() as RatingToken;

        if (tokenData.used) {
            return { success: false, error: 'You have already submitted a rating for this event.' };
        }

        const collectionPath = tokenData.listingType === 'event' ? 'events' : 'tours';
        const listingRef = doc(db, collectionPath, tokenData.listingId);
        const listingSnap = await getDoc(listingRef);
        
        if (!listingSnap.exists()) {
             return { success: false, error: 'The event associated with this link could not be found.' };
        }
        
        const listing = { id: listingSnap.id, ...listingSnap.data() } as Event | Tour;
        return { success: true, data: { listing, tokenData } };

    } catch (e: any) {
        console.error("Error fetching rating token details:", e);
        return { success: false, error: "A server error occurred." };
    }
}


interface SubmitRatingPayload {
    token: string;
    listingId: string;
    listingType: 'event' | 'tour';
    organizerId: string;
    rating: number;
    comment?: string;
    imageUrls?: string[];
}
/**
 * Submits a rating for an event/tour using a validated token.
 */
export async function submitRating(payload: SubmitRatingPayload) {
    const { token, listingId, listingType, organizerId, rating, comment, imageUrls } = payload;
    
    if (rating < 1 || rating > 5) {
        return { success: false, error: 'Invalid rating value.' };
    }

    try {
        await runTransaction(db, async (transaction) => {
            const tokenRef = doc(db, 'ratingTokens', token);
            const tokenDoc = await transaction.get(tokenRef);
            if (!tokenDoc.exists() || tokenDoc.data()?.used) {
                throw new Error("This rating link is invalid or has already been used.");
            }

            const collectionPath = listingType === 'event' ? 'events' : 'tours';
            const listingRef = doc(db, collectionPath, listingId);
            const listingDoc = await transaction.get(listingRef);

            if (!listingDoc.exists()) {
                throw new Error("The associated event or tour could not be found.");
            }
            
            // 1. Create the new rating document
            const ratingRef = doc(collection(db, 'ratings'));
            const newRating: Rating = {
                listingId,
                organizerId,
                rating,
                comment: comment || null,
                imageUrls: imageUrls || [],
                createdAt: Timestamp.now(),
                userId: tokenDoc.data()?.userId || 'anonymous',
            };
            transaction.set(ratingRef, newRating);

            // 2. Update the aggregate rating on the event/tour
            const currentRating = listingDoc.data()?.rating || { average: 0, count: 0 };
            const newCount = currentRating.count + 1;
            const newAverage = ((currentRating.average * currentRating.count) + rating) / newCount;
            
            transaction.update(listingRef, {
                'rating.average': newAverage,
                'rating.count': newCount,
            });

            // 3. Mark the token as used
            transaction.update(tokenRef, { used: true });
        });

        return { success: true };
    } catch (e: any) {
        console.error("Error submitting rating:", e);
        return { success: false, error: e.message || "Failed to submit your rating." };
    }
}

