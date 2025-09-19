'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { cookies } from 'next/headers';
import { auth } from '@/lib/firebase/server-auth';
import type { UserRole } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/services/audit-service';

interface StaffNotePayload {
    message: string;
    type: 'info' | 'warning';
    roles: ('attendee' | 'organizer' | 'club' | 'influencer' | 'admin' | 'super-admin' | 'verifier')[];
}

export async function sendStaffNote(payload: StaffNotePayload) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return { success: false, error: 'Authentication required.' };
    }

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }
    
    const allowedRoles: UserRole[] = ['admin', 'super-admin'];
    if (!decodedClaims.role || !allowedRoles.includes(decodedClaims.role as UserRole)) {
        return { success: false, error: 'Permission denied.' };
    }

    try {
        const docRef = await addDoc(collection(db, 'staffNotes'), {
            ...payload,
            senderId: decodedClaims.uid,
            senderName: decodedClaims.name || 'Admin',
            createdAt: serverTimestamp(),
            isActive: true,
        });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'send_staff_note',
            targetType: 'content',
            targetId: docRef.id,
            details: { message: payload.message.substring(0, 50) + '...', roles: payload.roles }
        });

        revalidatePath('/admin');
        revalidatePath('/organizer');
        revalidatePath('/influencer');
        revalidatePath('/verify');
        revalidatePath('/club');

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error("Error sending staff note:", error);
        return { success: false, error: errorMessage };
    }
}