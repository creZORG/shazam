
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { FirebaseUser } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

type UserWithId = FirebaseUser & { id: string };

function serializeUser(doc: any): UserWithId {
    const data = doc.data();
    if (data.createdAt && data.createdAt instanceof Timestamp) {
        data.createdAt = data.createdAt.toDate().toISOString();
    }
     if (data.lastLogin && data.lastLogin instanceof Timestamp) {
        data.lastLogin = data.lastLogin.toDate().toISOString();
    }
    return { id: doc.id, ...data } as UserWithId;
}

export async function getClubUsers() {
    noStore();
    try {
        const q = query(
            collection(db, 'users'), 
            where('role', '==', 'club'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const clubs = snapshot.docs.map(serializeUser);
        return { success: true, data: clubs };
    } catch (error) {
        console.error("Error fetching club users:", error);
        return { success: false, error: "Failed to fetch club accounts." };
    }
}
