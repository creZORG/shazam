
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { FirebaseUser, Promocode } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export type InfluencerLeaderboardEntry = {
    uid: string;
    name: string;
    profilePicture?: string;
    totalRevenue: number;
    ticketsSold: number;
    socials?: FirebaseUser['socials'];
    privacy?: FirebaseUser['privacy'];
    createdAt: string; 
}

export async function getInfluencerLeaderboard(): Promise<{ success: boolean; data?: InfluencerLeaderboardEntry[], error?: string; }> {
    noStore();
    try {
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'influencer'));
        const usersSnapshot = await getDocs(usersQuery);
        
        if (usersSnapshot.empty) {
            return { success: true, data: [] };
        }

        const influencers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as FirebaseUser));
        
        const promocodesQuery = query(collection(db, 'promocodes'));
        const promocodesSnapshot = await getDocs(promocodesQuery);
        const allPromocodes = promocodesSnapshot.docs.map(doc => doc.data() as Promocode);

        const leaderboard: InfluencerLeaderboardEntry[] = influencers.map(influencer => {
            const influencerPromocodes = allPromocodes.filter(p => p.influencerId === influencer.uid);
            
            const totalRevenue = influencerPromocodes.reduce((sum, p) => sum + (p.revenueGenerated || 0), 0);
            const ticketsSold = influencerPromocodes.reduce((sum, p) => sum + p.usageCount, 0);

            const createdAtTimestamp = influencer.createdAt;
            let createdAtISO = '';
            if (createdAtTimestamp && createdAtTimestamp.toDate) {
                createdAtISO = createdAtTimestamp.toDate().toISOString();
            } else if (typeof createdAtTimestamp === 'number') {
                createdAtISO = new Date(createdAtTimestamp).toISOString();
            } else if (typeof createdAtTimestamp === 'string') {
                createdAtISO = createdAtTimestamp;
            }


            return {
                uid: influencer.uid,
                name: influencer.name,
                profilePicture: influencer.profilePicture,
                socials: influencer.socials,
                privacy: influencer.privacy,
                totalRevenue,
                ticketsSold,
                createdAt: createdAtISO
            };
        });
        
        return { success: true, data: leaderboard };

    } catch (error) {
        console.error('Error fetching influencer leaderboard:', error);
        return { success: false, error: 'Failed to fetch influencer data.' };
    }
}
