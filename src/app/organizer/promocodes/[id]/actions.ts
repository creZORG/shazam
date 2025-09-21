

'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Promocode } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/services/audit-service';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/server-auth';

export async function getPromocodeById(id: string): Promise<{ success: boolean; data?: Promocode; error?: string; }> {
    if (!id) {
        return { success: false, error: 'Promocode ID is required.' };
    }

    try {
        const docRef = doc(db, 'promocodes', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { success: false, error: 'Promocode not found.' };
        }

        const data = { id: docSnap.id, ...docSnap.data() } as Promocode;
        
        // Fetch influencer name
        if (data.influencerId) {
            const userDocRef = doc(db, 'users', data.influencerId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                (data as any).influencerName = userDoc.data().name;
            }
        }

        return { success: true, data };
    } catch (error) {
        console.error("Error fetching promocode:", error);
        return { success: false, error: 'Failed to fetch promocode data.' };
    }
}

export async function updatePromocodeStatus(id: string, isActive: boolean) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

    try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        const docRef = doc(db, 'promocodes', id);
        await updateDoc(docRef, {
            isActive: isActive,
            updatedAt: serverTimestamp(),
        });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin/Organizer',
            action: 'update_promocode_status',
            targetType: 'promocode',
            targetId: id,
            details: { newStatus: isActive ? 'active' : 'void' }
        });

        revalidatePath(`/organizer/promocodes/${id}`);
        revalidatePath(`/organizer/promocodes`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating promocode status:", error);
        return { success: false, error: `Failed to update status. Details: ${error.message}` };
    }
}


export async function updatePromocodeExpiry(id: string, expiresAt: string | null) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

     try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

        const docRef = doc(db, 'promocodes', id);
        await updateDoc(docRef, {
            expiresAt: expiresAt,
            updatedAt: serverTimestamp(),
        });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin/Organizer',
            action: 'update_promocode_expiry',
            targetType: 'promocode',
            targetId: id,
            details: { newExpiry: expiresAt }
        });

        revalidatePath(`/organizer/promocodes/${id}`);
        revalidatePath(`/organizer/promocodes`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating promocode expiry:", error);
        return { success: false, error: `Failed to update expiry. Details: ${error.message}` };
    }
}
