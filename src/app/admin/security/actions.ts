
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import type { AuditLog } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';


export async function getAuditLogs(): Promise<{ success: boolean; data?: AuditLog[]; error?: string; }> {
    noStore();
    try {
        const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);

        const logs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
            } as AuditLog;
        });

        return { success: true, data: logs };

    } catch (error: any) {
        console.error("Error fetching audit logs:", error);
        return { success: false, error: 'Failed to fetch audit logs.' };
    }
}
