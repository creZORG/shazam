

'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { FirebaseUser } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { logAdminAction } from '@/services/audit-service';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            // Keep as ISO string for server components
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}


export async function getUserById(id: string): Promise<{ success: boolean; data?: FirebaseUser & { id: string }; error?: string; }> {
    noStore();
    if (!id) {
        return { success: false, error: 'User ID is required.' };
    }

    try {
        const userDocRef = doc(db, 'users', id);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return { success: false, error: 'User not found.' };
        }
        
        const data = serializeData(userDoc);

        return { success: true, data: data as FirebaseUser & { id: string } };

    } catch (error) {
        console.error('Error fetching user:', error);
        return { success: false, error: 'Failed to fetch user data.' };
    }
}


export async function updateUserRole(userId: string, newRole: FirebaseUser['role']) {
    if (!userId || !newRole) {
        return { success: false, error: "User ID and new role are required." };
    }

    if (userId === process.env.OWNER_UID) {
        return { success: false, error: "This user's role cannot be changed." };
    }

    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();
    
    if (!auth) {
        throw new Error("Server auth not initialized");
    }
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if(!userDoc.exists()) return { success: false, error: "User not found." };
        
        const oldRole = userDoc.data().role;

        await updateDoc(userDocRef, { role: newRole });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_user_role',
            targetType: 'user',
            targetId: userId,
            details: { from: oldRole, to: newRole }
        });

        revalidatePath(`/admin/users/${userId}`);
        revalidatePath(`/admin/users`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating user role:", error);
        return { success: false, error: "Failed to update user role." };
    }
}

export async function updateUserStatus(userId: string, newStatus: 'active' | 'suspended') {
     if (!userId || !newStatus) {
        return { success: false, error: "User ID and new status are required." };
    }

    if (userId === process.env.OWNER_UID) {
        return { success: false, error: "This user's status cannot be changed." };
    }
    
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();
    
    if (!auth) {
        throw new Error("Server auth not initialized");
    }
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    try {
        const userDocRef = doc(db, 'users', userId);
         const userDoc = await getDoc(userDocRef);
        if(!userDoc.exists()) return { success: false, error: "User not found." };

        const oldStatus = userDoc.data().status || 'active';

        await updateDoc(userDocRef, { status: newStatus });
        
        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_user_status',
            targetType: 'user',
            targetId: userId,
            details: { from: oldStatus, to: newStatus }
        });

        revalidatePath(`/admin/users/${userId}`);
        revalidatePath(`/admin/users`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating user status:", error);
        return { success: false, error: "Failed to update user status." };
    }
}


export async function getUserActivity(userId: string) {
    noStore();
    if (!userId) {
        return { success: false, error: 'User ID is required.' };
    }

    try {
        const ordersQuery = query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const interactionsQuery = query(collection(db, 'userEvents'), where('uid', '==', userId), orderBy('timestamp', 'desc'), limit(50));

        const [ordersSnapshot, interactionsSnapshot] = await Promise.all([
            getDocs(ordersQuery),
            getDocs(interactionsQuery)
        ]);

        const orders = ordersSnapshot.docs.map(serializeData) as Order[];
        const interactions = interactionsSnapshot.docs.map(doc => serializeData(doc) as UserEvent);

        return {
            success: true,
            data: { 
                orders, 
                interactions: interactions.sort((a,b) => b.timestamp - a.timestamp) 
            }
        };
    } catch (error) {
        console.error('Error fetching user activity:', error);
        return { success: false, error: 'Failed to fetch user activity data.' };
    }
}
