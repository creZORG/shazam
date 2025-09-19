
'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import { cookies } from 'next/headers';
import { auth } from '@/lib/firebase/server-auth';
import type { UserRole, StaffNote, FirebaseUser } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';


interface StaffNotePayload {
    message: string;
    type: 'info' | 'warning';
    roles: UserRole[];
}

export async function sendStaffNote(payload: StaffNotePayload) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return { success: false, error: 'Authentication required.' };
    }

    try {
        if (!auth) throw new Error("Server auth not initialized");
        await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }

    // The role is already verified by the /developer layout, so we can proceed.

    try {
        const docRef = await addDoc(collection(db, 'staffNotes'), {
            ...payload,
            // senderId: decodedClaims.uid,
            // senderName: decodedClaims.name || 'Developer',
            createdAt: serverTimestamp(),
            isActive: true,
        });

        // This won't immediately show up for users, but it clears any server-side caches
        // for pages that might eventually display these notes.
        revalidatePath('/admin');
        revalidatePath('/organizer');
        revalidatePath('/influencer');
        revalidatePath('/verify');
        revalidatePath('/club');
        revalidatePath('/developer/communication');

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error("Error sending staff note:", error);
        return { success: false, error: errorMessage };
    }
}


type SentNote = StaffNote & {
    readByDetails: {
        userName: string;
        readAt: string;
    }[];
}

export async function getSentNotes(): Promise<{ success: boolean; data?: SentNote[]; error?: string; }> {
    noStore();
    try {
        const q = query(collection(db, 'staffNotes'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const notes = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
            } as StaffNote
        });
        
        // Get all user IDs from all readBy arrays
        const userIds = new Set<string>();
        notes.forEach(note => {
            if(note.readBy) {
                note.readBy.forEach(reader => userIds.add(reader.userId));
            }
        });

        const users: Record<string, string> = {};
        if (userIds.size > 0) {
            const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(userIds)));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
                users[doc.id] = (doc.data() as FirebaseUser).name || 'Unknown';
            });
        }
        
        const sentNotes: SentNote[] = notes.map(note => ({
            ...note,
            readByDetails: note.readBy?.map(reader => ({
                userName: users[reader.userId] || 'Unknown',
                readAt: (reader.readAt as Timestamp).toDate().toISOString(),
            })).sort((a,b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime()) || [],
        }));


        return { success: true, data: sentNotes };
    } catch (error) {
        console.error("Error fetching sent notes:", error);
        return { success: false, error: 'Failed to fetch sent notes.' };
    }
}
