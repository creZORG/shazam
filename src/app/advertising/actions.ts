
'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import type { AdSubmission } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/services/notifications';

export async function submitAdForReview(data: Omit<AdSubmission, 'id' | 'userId' | 'status' | 'createdAt'>) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated. Please log in to submit an ad.' };

    let decodedClaims;
    try {
        const auth = await getAdminAuth();
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
         return { success: false, error: 'Authentication failed. Please log in again.' };
    }

    try {
        await addDoc(collection(db, 'adSubmissions'), {
            ...data,
            userId: decodedClaims.uid,
            status: 'pending',
            createdAt: serverTimestamp(),
            impressions: 0,
            clicks: 0,
        });
        
        await createNotification({
            type: 'ad_submission',
            message: `${decodedClaims.name || 'A user'} submitted a new ad campaign "${data.campaignName}" for review.`,
            link: '/admin/requests',
            targetRoles: ['admin', 'super-admin'],
        });

        revalidatePath('/admin/requests');

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting ad:", error);
        return { success: false, error: `Failed to submit ad. Details: ${error.message}` };
    }
}
