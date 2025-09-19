
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy } from "firebase/firestore";
import type { FirebaseUser, PayoutRequest } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { auth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { logAdminAction } from '@/services/audit-service';

export type PayoutRequestWithUser = PayoutRequest & { userName: string };

export async function getPayoutRequests(): Promise<{ success: boolean; data?: PayoutRequestWithUser[], error?: string; }> {
    noStore();
    try {
        const payoutQuery = query(collection(db, 'payoutRequests'), orderBy('requestedAt', 'desc'));
        const snapshot = await getDocs(payoutQuery);
        
        if (snapshot.empty) {
            return { success: true, data: [] };
        }

        const requests = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                requestedAt: (data.requestedAt as Timestamp).toDate().toISOString(),
                processedAt: data.processedAt ? (data.processedAt as Timestamp).toDate().toISOString() : null,
            } as PayoutRequest;
        });

        // Fetch user data for each request
        const userIds = [...new Set(requests.map(req => req.userId))];
        const users: Record<string, string> = {};
        
        // Firestore 'in' query has a limit of 30 items. Batch if necessary.
        if (userIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('__name__', 'in', userIds));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
                users[doc.id] = (doc.data() as FirebaseUser).name || 'Unknown User';
            });
        }
        
        const dataWithUsers = requests.map(req => ({
            ...req,
            userName: users[req.userId] || 'Unknown User',
        }));

        return { success: true, data: dataWithUsers };

    } catch (error: any) {
        console.error("Error fetching payout requests:", error);
        return { success: false, error: 'Failed to fetch payout requests.' };
    }
}

export async function updatePayoutStatus(requestId: string, status: 'accepted' | 'rejected', rejectionReason?: string) {
    noStore();
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        if (decodedClaims.role !== 'super-admin') {
            return { success: false, error: 'Permission denied.' };
        }
    } catch (e) {
         return { success: false, error: 'Authentication failed.' };
    }

    try {
        const payoutRef = doc(db, 'payoutRequests', requestId);
        
        const updatePayload: any = {
            status,
            processedAt: Timestamp.now(),
            processorId: decodedClaims.uid,
        };

        if (status === 'rejected') {
            updatePayload.rejectionReason = rejectionReason || 'No reason provided.';
        }

        await updateDoc(payoutRef, updatePayload);

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Super Admin',
            action: 'update_payout_status',
            targetType: 'payout',
            targetId: requestId,
            details: { newStatus: status, reason: rejectionReason }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating payout status:", error);
        return { success: false, error: 'Failed to update payout status.' };
    }
}
