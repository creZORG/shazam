
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import type { Event } from '@/lib/types';
import { logAdminAction } from '@/services/audit-service';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';

export async function getAllEvents() {
    try {
        const q = query(collection(db, "events"), orderBy("updatedAt", "desc"));
        const querySnapshot = await getDocs(q);
        const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Event & { id: string, status: string })[];
        return { success: true, data: events };
    } catch (error: any) {
        console.error("Error fetching all events:", error);
        return { success: false, error: `Failed to fetch events. Details: ${error.message}` };
    }
}

export async function updateEventStatus(eventId: string, status: 'published' | 'rejected' | 'taken-down' | 'archived') {
    if (!eventId || !status) {
        return { success: false, error: 'Event ID and status are required.' };
    }

    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();
    
    if (!auth) {
        throw new Error("Server auth not initialized");
    }
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    try {
        const eventDocRef = doc(db, "events", eventId);
        await updateDoc(eventDocRef, {
            status: status,
        });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_event_status',
            targetType: 'event',
            targetId: eventId,
            details: { newStatus: status }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating event status:", error);
        return { success: false, error: `Failed to update event status. Details: ${error.message}` };
    }
}
