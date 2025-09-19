
'use server';

import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { AuditLog } from '@/lib/types';

type LogPayload = Omit<AuditLog, 'id' | 'timestamp'>;

/**
 * Logs an administrative action to the auditLogs collection in Firestore.
 * @param payload - The data for the audit log entry.
 */
export async function logAdminAction(payload: LogPayload): Promise<void> {
  try {
    const auditLogData: AuditLog = {
      ...payload,
      timestamp: serverTimestamp(),
    };
    await addDoc(collection(db, 'auditLogs'), auditLogData);
  } catch (error) {
    console.error("Failed to write to audit log:", error);
    // In a production app, you might want to add more robust error handling here,
    // like sending an alert to an admin or using a fallback logging mechanism.
  }
}
