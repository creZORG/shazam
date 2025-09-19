
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Event, Tour } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

export async function getPublishedEvents(): Promise<{ success: boolean; data?: (Event & { id: string })[]; error?: string; }> {
    noStore();
    try {
        const q = query(collection(db, 'events'), where('status', '==', 'published'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => serializeData(doc)) as (Event & { id: string })[];
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getPublishedTours(): Promise<{ success: boolean; data?: (Tour & { id: string })[]; error?: string; }> {
    noStore();
    try {
        const q = query(collection(db, 'tours'), where('status', '==', 'published'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => serializeData(doc)) as (Tour & { id: string })[];
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
