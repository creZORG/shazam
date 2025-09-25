
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import type { AdSubmission } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';

export async function getMyAdSubmissions(): Promise<{ success: boolean; data?: AdSubmission[]; error?: string; }> {
    noStore();
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated.' };
    const auth = await getAdminAuth();

    let userId;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        userId = (await auth.verifySessionCookie(sessionCookie, true)).uid;
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }

    try {
        const q = query(
            collection(db, 'adSubmissions'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const ads = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString()
            } as AdSubmission;
        });

        return { success: true, data: ads };
    } catch (error) {
        console.error("Error fetching user's ad submissions:", error);
        return { success: false, error: 'Failed to fetch ad submissions.' };
    }
}
