'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, getDoc, doc, Timestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import type { FirebaseUser, VerificationScan } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { revalidatePath } from 'next/cache';

interface AssignVerifierPayload {
    username: string;
    eventId: string;
}

export async function assignVerifierByAdmin(payload: AssignVerifierPayload) {
    const { username, eventId } = payload;
    
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('name', '==', username));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            return { success: false, error: `User with username "${username}" not found.` };
        }
        
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data() as FirebaseUser;
        
        // Upgrade role if user is an attendee
        if (userData.role === 'attendee') {
            await updateDoc(userDoc.ref, { 
                role: 'verifier',
                assignedEvents: arrayUnion(eventId)
            });
        } else {
            await updateDoc(userDoc.ref, {
                assignedEvents: arrayUnion(eventId)
            });
        }
        
        revalidatePath(`/admin/listings/${eventId}`);
        return { success: true, message: `User "${username}" has been assigned as a verifier.` };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function getVerifierStatsForEvent(eventId: string) {
    noStore();
    try {
        const assignedUsersQuery = query(collection(db, 'users'), where('assignedEvents', 'array-contains', eventId));
        const verificationsQuery = query(collection(db, 'verificationHistory'), where('eventId', '==', eventId));

        const [usersSnapshot, verificationsSnapshot] = await Promise.all([
            getDocs(assignedUsersQuery),
            getDocs(verificationsQuery)
        ]);

        const verifiers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as FirebaseUser));
        const scans = verificationsSnapshot.docs.map(doc => doc.data() as VerificationScan);

        const stats = verifiers.map(verifier => {
            const verifierScans = scans.filter(scan => scan.verifierId === verifier.uid);
            return {
                ...verifier,
                stats: {
                    total: verifierScans.length,
                    valid: verifierScans.filter(s => s.status === 'success').length,
                    invalid: verifierScans.filter(s => s.status === 'error').length,
                }
            }
        });

        return { success: true, data: stats };

    } catch (error) {
        console.error("Error getting verifier stats:", error);
        return { success: false, error: "Failed to fetch verifier statistics." };
    }
}
