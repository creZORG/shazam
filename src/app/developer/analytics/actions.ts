
'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';

interface ErrorPayload {
    message: string;
    stack?: string;
    digest?: string;
    path: string;
    userAgent: string;
    userId?: string;
    userName?: string;
}

export async function logError(payload: ErrorPayload) {
  try {
    await addDoc(collection(db, 'errorLogs'), {
      ...payload,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Log to console if Firestore logging fails
    console.error("CRITICAL: Failed to write to errorLogs collection:", error);
  }
}

type ErrorLog = {
    path: string;
    message: string;
}

export async function getCrashAnalytics() {
    noStore();
    try {
        const snapshot = await getDocs(query(collection(db, 'errorLogs'), orderBy('timestamp', 'desc')));
        const logs = snapshot.docs.map(doc => doc.data() as ErrorLog);

        const pageCounts: Record<string, number> = {};
        const messageCounts: Record<string, number> = {};

        logs.forEach(log => {
            pageCounts[log.path] = (pageCounts[log.path] || 0) + 1;
            messageCounts[log.message] = (messageCounts[log.message] || 0) + 1;
        });
        
        const topPages = Object.entries(pageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([path, count]) => ({ path, count }));
            
        const topMessages = Object.entries(messageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([message, count]) => ({ message, count }));
            
        return { success: true, data: { topPages, topMessages } };

    } catch (error: any) {
        console.error("Error fetching crash analytics:", error);
        return { success: false, error: 'Failed to fetch crash analytics.' };
    }
}
