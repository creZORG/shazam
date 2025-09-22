
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy, doc, updateDoc, writeBatch, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import type { PartnerRequest, AdSubmission, UserRole, SupportTicket, SupportTicketReply } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/services/audit-service';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { sendSupportReplyEmail } from '@/services/email';

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

export async function getPartnerRequests(): Promise<{ success: boolean; data?: PartnerRequest[]; error?: string; }> {
    noStore();
    try {
        const q = query(
            collection(db, 'partnerRequests'), 
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => serializeData(doc) as PartnerRequest);
        return { success: true, data: requests };
    } catch (error) {
        console.error("Error fetching partner requests:", error);
        return { success: false, error: 'Failed to fetch partner requests.' };
    }
}

export async function getAdRequests(): Promise<{ success: boolean; data?: AdSubmission[]; error?: string; }> {
    noStore();
    try {
        const q = query(
            collection(db, 'adSubmissions'), 
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => serializeData(doc) as AdSubmission);
        return { success: true, data: requests };
    } catch (error) {
        console.error("Error fetching ad requests:", error);
        return { success: false, error: 'Failed to fetch ad requests.' };
    }
}

export async function updateAdStatus(adId: string, status: 'approved' | 'rejected') {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
         return { success: false, error: 'Authentication failed.' };
    }

    try {
        const adRef = doc(db, 'adSubmissions', adId);
        await updateDoc(adRef, { status });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_ad_status',
            targetType: 'ad',
            targetId: adId,
            details: { newStatus: status }
        });

        revalidatePath('/admin/requests');
        revalidatePath('/advertising/dashboard');

        return { success: true };
    } catch (error) {
        console.error("Error updating ad status:", error);
        return { success: false, error: 'Failed to update ad status.' };
    }
}

export async function trackAdClick(adId: string): Promise<{ success: boolean }> {
    if (!adId) return { success: false };

    try {
        const adRef = doc(db, 'adSubmissions', adId);
        await updateDoc(adRef, {
            clicks: increment(1)
        });
        return { success: true };
    } catch (error) {
        console.error(`Failed to track ad click for adId: ${adId}`, error);
        // This is a non-critical action for the user, so we fail silently.
        return { success: false };
    }
}


export async function approvePartnerRequest(requestId: string, userId: string, newRole: UserRole) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
         return { success: false, error: 'Authentication failed.' };
    }

    try {
        const batch = writeBatch(db);

        const requestRef = doc(db, 'partnerRequests', requestId);
        batch.update(requestRef, { status: 'approved', processedAt: Timestamp.now(), processorId: decodedClaims.uid });

        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { role: newRole });

        await batch.commit();
        
        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'approve_partner_request',
            targetType: 'user',
            targetId: userId,
            details: { approvedRole: newRole }
        });

        revalidatePath('/admin/requests');
        revalidatePath(`/admin/users/${userId}`);

        return { success: true };
    } catch (error) {
        console.error("Error approving partner request:", error);
        return { success: false, error: 'Failed to approve request.' };
    }
}

export async function denyPartnerRequest(requestId: string) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

     let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
         return { success: false, error: 'Authentication failed.' };
    }

    try {
        const requestRef = doc(db, 'partnerRequests', requestId);
        await updateDoc(requestRef, { status: 'rejected', processedAt: Timestamp.now(), processorId: decodedClaims.uid });
        
        const requestDoc = await getDoc(requestRef);
        const requestData = requestDoc.data();
        
        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'deny_partner_request',
            targetType: 'user',
            targetId: requestData?.userId,
            details: { deniedRole: requestData?.requestedRole }
        });

        revalidatePath('/admin/requests');

        return { success: true };
    } catch (error) {
        console.error("Error denying partner request:", error);
        return { success: false, error: 'Failed to deny request.' };
    }
}


export async function getSupportTickets(): Promise<{ success: boolean; data?: SupportTicket[]; error?: string; }> {
    noStore();
    try {
        const q = query(
            collection(db, 'supportTickets'), 
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);

        const ticketsPromises = snapshot.docs.map(async (doc) => {
            const ticketData = serializeData(doc) as SupportTicket;
            
            // Fetch replies subcollection
            const repliesQuery = query(collection(db, 'supportTickets', doc.id, 'replies'), orderBy('createdAt', 'asc'));
            const repliesSnapshot = await getDocs(repliesQuery);
            ticketData.replies = repliesSnapshot.docs.map(replyDoc => serializeData(replyDoc) as SupportTicketReply);
            
            return ticketData;
        });

        const tickets = await Promise.all(ticketsPromises);

        return { success: true, data: tickets };
    } catch (error) {
        console.error("Error fetching support tickets:", error);
        return { success: false, error: 'Failed to fetch support tickets.' };
    }
}

export async function updateSupportTicketStatus(ticketId: string, status: 'open' | 'closed'): Promise<{ success: boolean, error?: string }> {
     const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
         return { success: false, error: 'Authentication failed.' };
    }
    
    try {
        const ticketRef = doc(db, 'supportTickets', ticketId);
        await updateDoc(ticketRef, { status });
        
         await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_support_ticket',
            targetType: 'support',
            targetId: ticketId,
            details: { newStatus: status }
        });

        revalidatePath('/admin/requests');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to update ticket: ${error.message}`};
    }
}


export async function replyToSupportTicket(payload: { ticketId: string, message: string, userEmail: string }): Promise<{ success: boolean, data?: SupportTicketReply, error?: string }> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
         return { success: false, error: 'Authentication failed.' };
    }

    try {
        const { ticketId, message, userEmail } = payload;
        const repliesRef = collection(db, 'supportTickets', ticketId, 'replies');
        
        const newReply: Omit<SupportTicketReply, 'id'> = {
            authorId: decodedClaims.uid,
            authorName: decodedClaims.name || 'Admin',
            message,
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(repliesRef, newReply);

        await sendSupportReplyEmail({
            to: userEmail,
            ticketId: ticketId,
            replyMessage: message,
        });

        const createdReply = { ...newReply, id: docRef.id, createdAt: new Date().toISOString() };
        
        revalidatePath('/admin/requests');
        return { success: true, data: createdReply as SupportTicketReply };
    } catch (error: any) {
        return { success: false, error: `Failed to send reply. Details: ${error.message}` };
    }
}
