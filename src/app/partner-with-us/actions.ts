

'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, getDocs, query, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { auth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import type { UserRole, FirebaseUser, PartnerRequest } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/services/notifications';

async function getUserFromSession(): Promise<(FirebaseUser & {uid: string}) | null> {
     const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return null;
    }
    try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return {
            uid: decodedClaims.uid,
            name: decodedClaims.name || 'Unnamed User',
            email: decodedClaims.email || '',
            profilePicture: decodedClaims.picture || '',
        } as (FirebaseUser & {uid: string});
    } catch (error) {
        console.error("Error verifying session cookie:", error);
        return null;
    }
}


export async function requestPartnerRole(role: UserRole) {
    const user = await getUserFromSession();

    if (!user) {
        return { success: false, error: 'Not authenticated. Please log in to make a request.' };
    }

    try {
        // Check if a pending request already exists for this user
        const q = query(
            collection(db, 'partnerRequests'), 
            where('userId', '==', user.uid),
            where('status', '==', 'pending')
        );
        const existingRequests = await getDocs(q);

        if (!existingRequests.empty) {
            return { success: false, error: 'You already have a pending partner request. Please wait for it to be reviewed.' };
        }

        await addDoc(collection(db, 'partnerRequests'), {
            userId: user.uid,
            user: {
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
            },
            requestedRole: role,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        
        await createNotification({
            type: 'partner_request',
            message: `${user.name} has requested to become a ${role}.`,
            link: '/admin/requests',
            targetRoles: ['admin', 'super-admin'],
        });

        revalidatePath('/admin/requests');

        return { success: true };
    } catch (error: any) {
        console.error("Error creating partner request:", error);
        return { success: false, error: `Failed to submit request. Details: ${error.message}` };
    }
}

export async function getPartnerRequests(): Promise<{success: boolean, data?: PartnerRequest[]}> {
    const user = await getUserFromSession();
    if (!user) return { success: false };

    try {
         const q = query(
            collection(db, 'partnerRequests'), 
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate().toISOString(),
        } as PartnerRequest));
        return { success: true, data: requests };
    } catch (e) {
        return { success: false }
    }
}
