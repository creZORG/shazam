
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import type { Invitation, FirebaseUser, AuditLog, UserEvent } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

async function serializeData(doc: any): Promise<any> {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}


export async function getInvitationDetails(invitationId: string): Promise<{ success: boolean; data?: Invitation; error?: string; }> {
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

        // If the invite has been accepted, fetch acceptor's details
        if (inviteData.status === 'accepted' && inviteData.acceptedBy) {
            const userRef = doc(db, 'users', inviteData.acceptedBy as any);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                 const userData = userSnap.data() as FirebaseUser;
                 (inviteData.acceptedBy as any) = {
                     uid: userSnap.id,
                     name: userData.name,
                     email: userData.email,
                     photoURL: userData.profilePicture
                 };
            }
        }
        
        return { success: true, data: inviteData };

    } catch (error: any) {
        console.error("Error fetching invitation details:", error);
        return { success: false, error: 'Failed to fetch invitation details.' };
    }
}
