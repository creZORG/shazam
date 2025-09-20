

'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, writeBatch, Timestamp, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import type { Invitation, FirebaseUser } from '@/lib/types';
import { auth } from '@/lib/firebase/server-auth';

export async function getInvitationDetails(token: string): Promise<{ success: boolean; data?: Invitation; error?: string; }> {
    if (!token) {
        return { success: false, error: 'Invitation token is missing.' };
    }

    try {
        const q = query(collection(db, 'invitations'), where('token', '==', token));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { success: false, error: 'This invitation is not valid.' };
        }
        
        const inviteDoc = snapshot.docs[0];
        const inviteData = { id: inviteDoc.id, ...inviteDoc.data() } as Invitation;
        
        if (inviteData.status === 'accepted') {
            return { success: false, error: 'This invitation has already been used.' };
        }
        
        if (inviteData.status === 'void') {
            return { success: false, error: 'This invitation has been voided by the sender.' };
        }

        const expiresAt = (inviteData.expiresAt as Timestamp).toDate();
        if (expiresAt < new Date()) {
            return { success: false, error: 'This invitation has expired.' };
        }

        return { success: true, data: inviteData };

    } catch (error) {
        console.error('Error fetching invitation:', error);
        return { success: false, error: 'A server error occurred while verifying your invitation.' };
    }
}

export async function acceptInvitation(token: string, uid: string): Promise<{ success: boolean; error?: string }> {
     if (!token || !uid) {
        return { success: false, error: 'Token or user ID is missing.' };
    }

    try {
        const inviteResult = await getInvitationDetails(token);
        if (!inviteResult.success || !inviteResult.data) {
            return { success: false, error: inviteResult.error };
        }
        
        const invite = inviteResult.data;

        if (!auth) throw new Error("Server auth not initialized");
        const userRecord = await auth.getUser(uid);
        
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() as FirebaseUser : null;

        const batch = writeBatch(db);

        // Update user's role if they don't already exist or if they are just an attendee
        if (!userDoc.exists() || userData?.role === 'attendee') {
            const updatePayload: { role: string, assignedEvents?: any } = { role: invite.role };
            if (invite.role === 'verifier' && invite.eventId) {
                updatePayload.assignedEvents = arrayUnion(invite.eventId);
            }
             batch.set(userDocRef, updatePayload, { merge: true });
        } else {
             if (userData?.role !== invite.role) {
                // If user has a role other than 'attendee', don't automatically change it.
                // Exception: a user can be a verifier AND another role.
                if(invite.role !== 'verifier') {
                     return { success: false, error: `This user already has the role '${userData?.role}'. Role changes must be done manually.` };
                }
            }
             if (invite.role === 'verifier' && invite.eventId) {
                batch.update(userDocRef, { assignedEvents: arrayUnion(invite.eventId) });
            }
        }

        // Mark invitation as accepted
        const inviteDocRef = doc(db, 'invitations', invite.id!);
        batch.update(inviteDocRef, { status: 'accepted', acceptedBy: uid, email: userRecord.email });

        await batch.commit();
        
        return { success: true };

    } catch (error) {
        console.error('Error accepting invitation:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}
