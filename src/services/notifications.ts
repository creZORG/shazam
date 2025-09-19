
'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { Notification, UserRole } from '@/lib/types';

type NotificationPayload = {
    type: Notification['type'];
    message: string;
    link: string;
    targetRoles: UserRole[];
    targetUsers?: string[];
}

export async function createNotification(payload: NotificationPayload) {
    try {
        await addDoc(collection(db, 'notifications'), {
            ...payload,
            createdAt: serverTimestamp(),
            readBy: [],
        });
    } catch (error) {
        console.error("Failed to create notification:", error);
    }
}
