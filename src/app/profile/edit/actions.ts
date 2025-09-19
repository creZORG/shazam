

'use server';

import { db } from '@/lib/firebase/config';
import { collection, doc, getDocs, query, updateDoc, where, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { FirebaseUser } from '@/lib/types';

type ProfileUpdateData = Pick<FirebaseUser, 'fullName' | 'phone' | 'profilePicture' | 'socials'> & { username: string };

export async function updateUserProfile(uid: string, data: ProfileUpdateData) {
    if (!uid) {
        return { success: false, error: "Missing user ID." };
    }

    try {
        const userDocRef = doc(db, "users", uid);
        const currentUserDoc = await getDoc(userDocRef);
        
        let currentName: string | undefined;
        if (currentUserDoc.exists()) {
            currentName = currentUserDoc.data()?.name;
        }

        if (currentName !== undefined && currentName.toLowerCase() !== data.username.toLowerCase()) {
            const isAvailable = await isUsernameAvailable(data.username);
            if (!isAvailable) {
                return { success: false, error: "Username is already taken." };
            }
        }

        const updateData: Partial<FirebaseUser> = {
            name: data.username,
            fullName: data.fullName,
            phone: data.phone,
            socials: data.socials,
        };

        if (data.profilePicture) {
            updateData.profilePicture = data.profilePicture;
        }

        await updateDoc(userDocRef, updateData, { merge: true });

        revalidatePath('/profile');
        revalidatePath('/profile/edit');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating profile:", error);
        return { success: false, error: error.message || "An unknown error occurred during profile update." };
    }
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
    const lowerCaseUsername = username.toLowerCase();
    const q = query(collection(db, "users"), where("name", "==", lowerCaseUsername));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.empty;
}
