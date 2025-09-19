
'use server';

import { db } from '@/lib/firebase/config';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { auth } from '@/lib/firebase/server-auth';
import type { NightlifeEvent } from '@/lib/types';


async function getUserIdFromSession(): Promise<string | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return null;
    }
    try {
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error("Error verifying session cookie:", error);
        return null;
    }
}

export async function updateClubProfile(uid: string, data: { clubName: string, location: string, photos: string[] }) {
    if (!uid) return { success: false, error: "User not found." };
    if (!data.clubName || !data.location) return { success: false, error: "Club name and location are required." };

    try {
        const userDocRef = doc(db, "users", uid);
        await updateDoc(userDocRef, {
            organizerName: data.clubName, // Use organizerName to store club name for consistency
            about: data.location,      // Use about to store location
            gallery: data.photos,      // Use gallery to store club photos
        });
        revalidatePath('/club', 'layout');
        return { success: true };
    } catch(error: any) {
        console.error("Error updating club profile:", error);
        return { success: false, error: "Failed to update profile." };
    }
}


export async function createNightlifeEvent(data: Omit<NightlifeEvent, 'id' | 'clubName' | 'clubId'>) {
    const userId = await getUserIdFromSession();
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    const clubName = userDoc.exists() ? userDoc.data().organizerName : 'Unknown Club';
    
    if (!clubName) {
        return { success: false, error: 'Club profile is not complete. Please set your club name in settings.' };
    }

    try {
        await addDoc(collection(db, 'nightlifeEvents'), {
            ...data,
            clubId: userId,
            clubName: clubName,
            status: 'published',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        revalidatePath('/club');
        revalidatePath('/nightlife');
        return { success: true };
    } catch (error: any) {
        console.error("Error creating nightlife event:", error);
        return { success: false, error: `Failed to create event. Details: ${error.message}` };
    }
}

    