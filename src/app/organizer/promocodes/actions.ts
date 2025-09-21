
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import type { FirebaseUser, Promocode } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/services/audit-service';
import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { createNotification } from '@/services/notifications';

export async function findInfluencerByUsername(username: string): Promise<{ success: boolean; data?: { uid: string, name: string, photoURL?: string }; error?: string; }> {
    if (!username) {
        return { success: false, error: 'Username is required.' };
    }

    try {
        const usersRef = collection(db, 'users');
        // This query will find users where the username is >= the search term, and < the search term + a high-unicode character.
        // It's a common trick for case-insensitive "starts-with" queries in Firestore.
        const q = query(usersRef, where('name', '>=', username), where('name', '<', username + '\uf8ff'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'No user found with that username.' };
        }

        const userDoc = querySnapshot.docs.find(doc => doc.data().name.toLowerCase() === username.toLowerCase());

        if (!userDoc) {
             return { success: false, error: 'No user found with that exact username (case-insensitive).' };
        }

        const userData = userDoc.data() as FirebaseUser;

        if (userData.role !== 'influencer' && userData.role !== 'admin' && userData.role !== 'super-admin') {
            return { success: false, error: 'This user is not an influencer.' };
        }
        
        return {
            success: true,
            data: {
                uid: userDoc.id,
                name: userData.name,
                photoURL: userData.profilePicture,
            }
        };

    } catch (error) {
        console.error("Error finding influencer:", error);
        return { success: false, error: 'A server error occurred while searching for the influencer.' };
    }
}


export async function createPromocode(data: Partial<Omit<Promocode, 'id' | 'usageCount' | 'revenueGenerated' | 'isActive' | 'createdAt' | 'updatedAt'>>) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        // Allow system-level creation for new user coupons
        if (data.organizerId !== 'NAKSYETU_SYSTEM') {
            return { success: false, error: 'Authentication failed.' };
        }
    }
    
    try {
        // Base structure for any new promocode
        const newCodeBase = {
            ...data,
            isActive: true,
            usageCount: 0,
            revenueGenerated: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Conditionally add influencer-specific fields
        if (data.influencerId) {
            (newCodeBase as any).influencerStatus = 'pending';
        } else {
            // Explicitly remove influencer fields for general codes to prevent Firestore errors
            delete (newCodeBase as any).influencerId;
            delete (newCodeBase as any).commissionType;
            delete (newCodeBase as any).commissionValue;
        }

        const docRef = await addDoc(collection(db, 'promocodes'), newCodeBase);
        
        if (decodedClaims) {
            await logAdminAction({
                adminId: decodedClaims.uid,
                adminName: decodedClaims.name || 'Admin/Organizer',
                action: 'create_promocode',
                targetType: 'promocode',
                targetId: docRef.id,
                details: { code: data.code, listingName: data.listingName, influencerId: data.influencerId || 'N/A' }
            });
        }
        
        if (data.influencerId) {
             await createNotification({
                type: 'partner_request', // Re-using for simplicity
                message: `You have been invited to a new campaign for "${data.listingName}"!`,
                link: `/influencer/campaigns`,
                targetRoles: ['influencer'],
                targetUsers: [data.influencerId]
            });
        }


        revalidatePath('/organizer/promocodes');
        if (data.influencerId) {
            revalidatePath(`/influencer/campaigns`);
        }

        return { success: true };

    } catch (error) {
        console.error("Error creating promocode:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return { success: false, error: errorMessage };
    }
}


export async function getPromocodesByOrganizer(organizerId: string) {
    if (!organizerId) return { success: false, error: 'Organizer ID is required.' };

    try {
        const q = query(collection(db, 'promocodes'), where('organizerId', '==', organizerId));
        const snapshot = await getDocs(q);
        const promocodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promocode));
        
        const influencerIds = [...new Set(promocodes.map(p => p.influencerId).filter(Boolean))] as string[];
        const influencers: Record<string, string> = {};

        if (influencerIds.length > 0) {
            // Firestore 'in' queries are limited to 30 items.
            // If you expect more influencers, you'll need to batch this.
            const influencerQuery = query(collection(db, 'users'), where('__name__', 'in', influencerIds));
            const usersSnapshot = await getDocs(influencerQuery);
            usersSnapshot.forEach(doc => {
                influencers[doc.id] = doc.data().name || 'Unnamed Influencer';
            });
        }

        const data = promocodes.map(p => {
            const revenue = p.revenueGenerated || 0;
            let payout = 0;
            if (p.commissionType === 'fixed' && p.commissionValue) {
                payout = p.usageCount * p.commissionValue;
            } else if (p.commissionType === 'percentage' && p.commissionValue) { // percentage
                payout = revenue * (p.commissionValue / 100);
            }

            return {
                ...p,
                influencerName: p.influencerId ? (influencers[p.influencerId] || 'Unknown') : 'N/A',
                revenueGenerated: revenue,
                influencerPayout: payout,
            };
        });

        return { success: true, data };
    } catch (error) {
        console.error("Error fetching promocodes:", error);
        return { success: false, error: 'Failed to fetch promocodes.' };
    }
}

export async function getUserCoupons(userId: string) {
    if (!userId) return { success: false, error: 'User ID is required.' };
    
    try {
        const q = query(
            collection(db, 'promocodes'),
            where('userId', '==', userId),
            where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);
        const coupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promocode))
            .filter(c => {
                // Manual expiration check
                if (c.expiresAt && new Date(c.expiresAt) < new Date()) return false;
                // Manual usage check
                if (c.usageLimit > 0 && c.usageCount >= c.usageLimit) return false;
                return true;
            });
            
        return { success: true, data: coupons };
    } catch (error) {
        console.error("Error fetching user coupons:", error);
        return { success: false, error: 'Failed to fetch coupons.' };
    }
}
