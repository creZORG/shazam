
"use server";

import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, query, updateDoc, where, getDoc, addDoc, writeBatch, serverTimestamp, increment } from "firebase/firestore";
import { revalidatePath } from 'next/cache';
import type { FirebaseUser, Promocode, EarningsAudit, PayoutRequest, UserRole, PromocodeClick } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { getAdminAuth } from "@/lib/firebase/server-auth";
import { cookies } from 'next/headers';

type ProfileUpdateData = Pick<FirebaseUser, 'fullName' | 'phone' | 'profilePicture' | 'socials' | 'privacy'> & { username: string };

export async function updateInfluencerProfile(uid: string, data: ProfileUpdateData) {
    if (!uid) {
        return { success: false, error: "Missing user ID." };
    }

    try {
        const userDocRef = doc(db, "users", uid);
        const currentUserDoc = await getDoc(userDocRef);
        
        let currentName: string | undefined;
        let currentRole: UserRole | undefined;
        if (currentUserDoc.exists()) {
            currentName = currentUserDoc.data()?.name;
            currentRole = currentUserDoc.data()?.role;
        }

        if (currentName !== undefined && currentName.toLowerCase() !== data.username.toLowerCase()) {
            const isAvailable = await isUsernameAvailable(data.username);
            if (!isAvailable) {
                return { success: false, error: "Username is already taken." };
            }
        }


        const updateData: Partial<FirebaseUser> = {
            name: data.username,
            fullName: data.fullName,
            phone: data.phone,
            socials: {
                twitter: data.socials?.twitter || '',
                instagram: data.socials?.instagram || '',
                tiktok: data.socials?.tiktok || '',
                facebook: data.socials?.facebook || '',
                linkedin: data.socials?.linkedin || '',
            },
            privacy: data.privacy
        };
        
        // If user is an attendee and completing their profile, upgrade their role to influencer
        if (currentRole === 'attendee') {
            updateData.role = 'influencer';
        }

        if (data.profilePicture) {
            updateData.profilePicture = data.profilePicture;
        }

        await updateDoc(userDocRef, updateData, { merge: true });

        revalidatePath('/influencer', 'layout');
        revalidatePath('/influencers');
        return { success: true, roleUpgraded: currentRole === 'attendee' };
    } catch (error: any) {
        console.error("Error updating influencer profile:", error);
        return { success: false, error: error.message || "An unknown error occurred during profile update." };
    }
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
    const lowerCaseUsername = username.toLowerCase();
    const q = query(collection(db, "users"), where("name", ">=", username), where("name", "<=", username + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        return true;
    }
    
    for (const doc of querySnapshot.docs) {
        if (doc.data().name.toLowerCase() === lowerCaseUsername) {
            return false; 
        }
    }

    return true;
}


async function getInfluencerCampaigns(influencerId: string): Promise<Promocode[]> {
    const q = query(collection(db, "promocodes"), where("influencerId", "==", influencerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promocode));
}

export async function getInfluencerStats() {
    noStore();
    
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return { success: false, error: 'Not authenticated. Session cookie not found.' };
    }
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        console.error("Error verifying session cookie in getInfluencerStats:", error);
        return { success: false, error: 'Authentication failed. Please log in again.' };
    }

    const influencerId = decodedClaims.uid;

    try {
        const campaigns = await getInfluencerCampaigns(influencerId);
        const campaignIds = campaigns.map(c => c.id);

        let totalEarnings = 0;
        let ticketsSold = 0;
        
        campaigns.forEach(campaign => {
            ticketsSold += campaign.usageCount;
            const revenue = campaign.revenueGenerated || 0;
            if (campaign.commissionType === 'fixed') {
                totalEarnings += campaign.usageCount * campaign.commissionValue;
            } else { // percentage
                totalEarnings += revenue * (campaign.commissionValue / 100);
            }
        });
        
        let totalClicks = 0;
        if (campaignIds.length > 0) {
            const clicksQuery = query(collection(db, 'promocodeClicks'), where('promocodeId', 'in', campaignIds));
            const clicksSnapshot = await getDocs(clicksQuery);
            totalClicks = clicksSnapshot.size;
        }
        
        const payoutRequestsQuery = query(collection(db, 'payoutRequests'), where('userId', '==', influencerId), where('status', '==', 'pending'));
        const pendingPayoutsSnapshot = await getDocs(payoutRequestsQuery);
        const pendingAmount = pendingPayoutsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amountRequested, 0);

        return { 
            success: true, 
            data: { 
                totalEarnings, 
                totalClicks, 
                ticketsSold,
                pendingPayouts: pendingAmount,
                availableForPayout: totalEarnings - pendingAmount,
                recentCampaigns: campaigns.slice(0, 5),
            } 
        };
    } catch (error) {
        console.error("Error fetching influencer stats:", error);
        return { success: false, error: "Failed to load your stats." };
    }
}


export async function getPayoutHistory() {
    noStore();
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated. Session cookie not found.' };
    const auth = await getAdminAuth();

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        return { success: false, error: 'Authentication failed. Please log in again.' };
    }
    const influencerId = decodedClaims.uid;

    try {
        const q = query(collection(db, 'payoutRequests'), where('userId', '==', influencerId));
        const snapshot = await getDocs(q);
        const payouts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                requestedAt: (data.requestedAt?.toDate ?? new Date()).toISOString(),
                processedAt: (data.processedAt?.toDate ?? null)?.toISOString(),
            }
        }) as PayoutRequest[];

        return { success: true, data: payouts.sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()) };
    } catch (error) {
         console.error("Error fetching payout history:", error);
        return { success: false, error: "Failed to load payout history." };
    }
}

export async function requestPayout(amount: number) {
    noStore();
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated. Session cookie not found.' };
    const auth = await getAdminAuth();
    
    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        return { success: false, error: 'Authentication failed. Please log in again.' };
    }
    const uid = decodedClaims.uid;
    const userDocRef = doc(db, 'users', uid);
    
    try {
        const [userDoc, statsResult] = await Promise.all([
            getDoc(userDocRef),
            getInfluencerStats()
        ]);

        if (!userDoc.exists()) return { success: false, error: 'User not found.' };
        if (!statsResult.success || !statsResult.data) return { success: false, error: statsResult.error || 'Could not verify balance.'};
        
        const { availableForPayout } = statsResult.data;
        const user = userDoc.data() as FirebaseUser;
        
        if (amount > availableForPayout) {
            return { success: false, error: `Requested amount exceeds available balance of Ksh ${availableForPayout}.` };
        }
        if (!user.fullName || !user.phone) {
             return { success: false, error: 'Please complete your profile with your full name and M-Pesa phone number before requesting a payout.' };
        }

        const campaigns = await getInfluencerCampaigns(uid);
        const earningsAudit: EarningsAudit[] = campaigns.map(c => {
            const revenue = c.revenueGenerated || 0;
            let earnings = 0;
            if (c.commissionType === 'fixed' && c.commissionValue) {
                earnings = c.usageCount * c.commissionValue;
            } else if (c.commissionType === 'percentage' && c.commissionValue) { // percentage
                earnings = revenue * (c.commissionValue / 100);
            }
            return {
                sourceId: c.id,
                sourceName: `${c.code} for ${c.listingName}`,
                amount: earnings,
                ticketsSold: c.usageCount,
                revenue: revenue
            }
        }).filter(audit => audit.amount > 0);


        const payoutRequest: Omit<PayoutRequest, 'id'> = {
            userId: uid,
            userRole: 'influencer',
            amountRequested: amount,
            status: 'pending',
            requestedAt: serverTimestamp(),
            payoutDetails: {
                fullName: user.fullName,
                mpesaNumber: user.phone,
            },
            earningsAudit,
        };

        await addDoc(collection(db, 'payoutRequests'), payoutRequest);
        
        revalidatePath('/influencer/payouts');
        revalidatePath('/admin/payouts');

        return { success: true };

    } catch (error) {
        console.error("Error requesting payout:", error);
        return { success: false, error: 'An unexpected server error occurred.' };
    }
}
