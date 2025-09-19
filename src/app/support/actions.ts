
'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { auth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import type { SupportTicket } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';


interface SupportTicketPayload {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export async function submitSupportTicket(payload: SupportTicketPayload) {
    const sessionCookie = cookies().get('session')?.value;
    let userId;
    if (sessionCookie) {
        try {
            if (!auth) throw new Error("Server auth not initialized");
            const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
            userId = decodedClaims.uid;
        } catch (e) {
            console.warn("Could not verify session for support ticket, submitting anonymously.");
        }
    }

    try {
        await addDoc(collection(db, 'supportTickets'), {
            ...payload,
            userId: userId || null,
            status: 'open',
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting support ticket:", error);
        return { success: false, error: `Failed to submit ticket. Details: ${error.message}` };
    }
}


export async function getUserSupportTickets(): Promise<{ success: boolean; data?: SupportTicket[]; error?: string; }> {
    noStore();
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated.' };

    let userId;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        userId = (await auth.verifySessionCookie(sessionCookie, true)).uid;
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }

    try {
        const q = query(
            collection(db, 'supportTickets'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const tickets = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate().toISOString(),
             } as SupportTicket
        });

        return { success: true, data: tickets };

    } catch (error: any) {
        console.error("Error fetching user support tickets:", error);
        return { success: false, error: 'Failed to fetch tickets.' };
    }
}
