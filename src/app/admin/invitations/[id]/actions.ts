
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, orderBy, getDocs, Timestamp, updateDoc } from 'firebase/firestore';
import type { Invitation, FirebaseUser, AuditLog, UserEvent, PromocodeClick, TrackingLink } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { auth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { logAdminAction } from '@/services/audit-service';

async function serializeData(doc: any): Promise<any> {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

type InvitationDetails = Invitation & {
    acceptedBy?: {
        uid: string;
        name: string;
        email: string;
        photoURL?: string;
    };
    activity?: PromocodeClick[];
}

export async function getInvitationDetails(invitationId: string): Promise<{ success: boolean; data?: InvitationDetails; error?: string; }> {
    noStore();
    if (!invitationId) {
        return { success: false, error: 'Invitation ID is required.' };
    }

    try {
        const inviteRef = doc(db, 'invitations', invitationId);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
            return { success: false, error: 'Invitation not found.' };
        }
        
        const inviteData = await serializeData(inviteSnap) as Invitation;
        const resultData: InvitationDetails = { ...inviteData };

        // If the invite has been accepted, fetch acceptor's details
        if (inviteData.status === 'accepted' && inviteData.acceptedBy) {
            const userRef = doc(db, 'users', inviteData.acceptedBy as any);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                 const userData = userSnap.data() as FirebaseUser;
                 resultData.acceptedBy = {
                     uid: userSnap.id,
                     name: userData.name,
                     email: userData.email || 'N/A',
                     photoURL: userData.profilePicture
                 };
            }
        }
        
        // Fetch click activity
        if (inviteData.shortId) {
            const activityQuery = query(
                collection(db, 'promocodeClicks'),
                where('shortId', '==', inviteData.shortId)
            );
            const activitySnapshot = await getDocs(activityQuery);
            const activities = await Promise.all(activitySnapshot.docs.map(d => serializeData(d)));
            
            // Sort in code to avoid complex-query index issues
            activities.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            resultData.activity = activities as PromocodeClick[];
        }


        return { success: true, data: resultData };

    } catch (error: any) {
        console.error("Error fetching invitation details:", error);
        return { success: false, error: 'Failed to fetch invitation details.' };
    }
}

export async function voidInvitation(invitationId: string): Promise<{ success: boolean; error?: string; }> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }

    try {
        const inviteRef = doc(db, 'invitations', invitationId);
        const inviteSnap = await getDoc(inviteRef);
        if (!inviteSnap.exists()) return { success: false, error: 'Invitation not found.' };

        await updateDoc(inviteRef, { status: 'void' });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'void_invitation',
            targetType: 'invitation',
            targetId: invitationId,
            details: { invitedEmail: inviteSnap.data().email }
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Failed to void invitation.' };
    }
}
