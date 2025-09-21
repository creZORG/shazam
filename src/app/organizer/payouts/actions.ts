

'use server';

import { db } from "@/lib/firebase/config";
import { collection, doc, getDocs, query, where, serverTimestamp, addDoc } from "firebase/firestore";
import { revalidatePath } from 'next/cache';
import type { FirebaseUser, Promocode, Order, EarningsAudit, PayoutRequest, SiteSettings } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { getAdminAuth } from "@/lib/firebase/server-auth";
import { cookies } from 'next/headers';
import { getSettings } from "@/app/admin/settings/actions";

async function getOrganizerId(): Promise<string | null> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;
    try {
        const auth = await getAdminAuth();
        if (!auth) throw new Error("Server auth not initialized");
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch {
        return null;
    }
}

export async function getOrganizerPayoutStats() {
    noStore();
    const organizerId = await getOrganizerId();
    if (!organizerId) return { success: false, error: 'Not authenticated.' };

    try {
        const ordersQuery = query(collection(db, 'orders'), where('organizerId', '==', organizerId), where('status', '==', 'completed'));
        const promocodesQuery = query(collection(db, 'promocodes'), where('organizerId', '==', organizerId));
        const pendingPayoutsQuery = query(collection(db, 'payoutRequests'), where('userId', '==', organizerId), where('status', '==', 'pending'));
        
        const [ordersSnapshot, promocodesSnapshot, pendingPayoutsSnapshot, settingsResult] = await Promise.all([
            getDocs(ordersQuery),
            getDocs(promocodesQuery),
            getDocs(pendingPayoutsQuery),
            getSettings()
        ]);
        
        const settings = settingsResult.settings as SiteSettings;
        const orders = ordersSnapshot.docs.map(doc => doc.data() as Order);
        const promocodes = promocodesSnapshot.docs.map(doc => doc.data() as Promocode);
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

        // Calculate NaksYetu platform fee
        const naksyetuFee = totalRevenue * (settings.platformFee / 100);
        
        // Calculate total payout to influencers for this organizer's campaigns
        const influencerPayouts = promocodes.reduce((sum, promo) => {
            if (promo.influencerId) {
                const revenue = promo.revenueGenerated || 0;
                if (promo.commissionType === 'fixed' && promo.commissionValue) {
                    return sum + (promo.usageCount * promo.commissionValue);
                } else if (promo.commissionType === 'percentage' && promo.commissionValue) {
                    return sum + (revenue * (promo.commissionValue / 100));
                }
            }
            return sum;
        }, 0);
        
        // Calculate payment processing fee if organizer pays for it
        let processingFee = 0;
        if (settings.processingFeePayer === 'organizer') {
            processingFee = orders.reduce((sum, order) => sum + order.processingFee, 0);
        }

        const netRevenue = totalRevenue - naksyetuFee - influencerPayouts - processingFee;
        
        const pendingAmount = pendingPayoutsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amountRequested, 0);
        const availableForPayout = netRevenue - pendingAmount;

        return {
            success: true,
            data: {
                totalRevenue,
                naksyetuFee,
                influencerPayouts,
                processingFee,
                netRevenue,
                pendingAmount,
                availableForPayout
            }
        };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function getOrganizerPayoutHistory() {
    noStore();
    const organizerId = await getOrganizerId();
    if (!organizerId) return { success: false, error: 'Not authenticated.' };

    try {
        const q = query(collection(db, 'payoutRequests'), where('userId', '==', organizerId));
        const snapshot = await getDocs(q);
        const payouts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                requestedAt: doc.data().requestedAt?.toDate().toISOString(),
                processedAt: doc.data().processedAt?.toDate()?.toISOString() || null,
        })) as PayoutRequest[];

        return { success: true, data: payouts.sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()) };
    } catch (error) {
         console.error("Error fetching payout history:", error);
        return { success: false, error: "Failed to load payout history." };
    }
}

export async function requestOrganizerPayout(amount: number) {
    noStore();
    const organizerId = await getOrganizerId();
    if (!organizerId) return { success: false, error: 'Not authenticated.' };

    const userDocRef = doc(db, 'users', organizerId);
    
    try {
        const [userDoc, statsResult] = await Promise.all([
            getDoc(userDocRef),
            getOrganizerPayoutStats()
        ]);

        if (!userDoc.exists()) return { success: false, error: 'User not found.' };
        if (!statsResult.success || !statsResult.data) return { success: false, error: statsResult.error || 'Could not verify balance.'};
        
        const { availableForPayout, totalRevenue, naksyetuFee, influencerPayouts } = statsResult.data;
        const user = userDoc.data() as FirebaseUser;
        
        if (amount > availableForPayout) {
            return { success: false, error: `Requested amount exceeds available balance of Ksh ${availableForPayout}.` };
        }
        if (!user.organizerName || !user.phone) {
             return { success: false, error: 'Please complete your profile with your organizer name and M-Pesa phone number before requesting a payout.' };
        }

        const earningsAudit: EarningsAudit[] = [
            { sourceId: 'total_revenue', sourceName: 'Gross Revenue from all listings', amount: totalRevenue, ticketsSold: 0, revenue: totalRevenue },
            { sourceId: 'platform_fee', sourceName: `NaksYetu Platform Fee`, amount: -naksyetuFee, ticketsSold: 0, revenue: 0 },
            { sourceId: 'influencer_payouts', sourceName: 'Total Commissions Paid to Influencers', amount: -influencerPayouts, ticketsSold: 0, revenue: 0 },
        ];

        const payoutRequest: Omit<PayoutRequest, 'id'> = {
            userId: organizerId,
            userRole: 'organizer',
            amountRequested: amount,
            status: 'pending',
            requestedAt: serverTimestamp(),
            payoutDetails: {
                fullName: user.organizerName,
                mpesaNumber: user.phone,
            },
            earningsAudit,
        };

        await addDoc(collection(db, 'payoutRequests'), payoutRequest);
        
        revalidatePath('/organizer/payouts');
        revalidatePath('/admin/payouts');

        return { success: true };

    } catch (error) {
        console.error("Error requesting payout:", error);
        return { success: false, error: 'An unexpected server error occurred.' };
    }
}
