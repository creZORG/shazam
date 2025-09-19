
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Tour } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export interface FilterState {
  search?: string;
  destination?: string;
  duration?: string;
  sort?: string;
}

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}

export async function getFilteredTours(filters: FilterState): Promise<{ success: boolean; data?: Tour[]; error?: string }> {
    noStore();
    try {
        let q: any = collection(db, 'tours');
        
        q = query(q, where('status', '==', 'published'));

        if (filters.destination && filters.destination !== 'all') {
            q = query(q, where('destination', '==', filters.destination));
        }

        // Initial fetch from Firestore
        let tours = (await getDocs(q)).docs.map(serializeData) as Tour[];
        
        // Client-side filtering for search and duration
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            tours = tours.filter(tour => 
                tour.name?.toLowerCase().includes(searchTerm) ||
                tour.destination?.toLowerCase().includes(searchTerm) ||
                tour.organizerName?.toLowerCase().includes(searchTerm)
            );
        }

        if (filters.duration) {
            // This is a simplified duration filter. 
            // A more robust implementation would calculate duration from start/end dates.
            tours = tours.filter(tour => {
                const durationDays = (new Date(tour.endDate).getTime() - new Date(tour.startDate).getTime()) / (1000 * 3600 * 24);
                if (filters.duration === 'day-trip') return durationDays <= 1;
                if (filters.duration === 'weekend') return durationDays > 1 && durationDays <= 3;
                if (filters.duration === 'long-trip') return durationDays > 3;
                return true;
            });
        }
        
        tours.sort((a, b) => {
            if (filters.sort === 'price-asc') {
                return (a.price || 0) - (b.price || 0);
            }
            if (filters.sort === 'price-desc') {
                return (b.price || 0) - (a.price || 0);
            }
            // Default to date sort
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        return { success: true, data: tours };
    } catch (error: any) {
        console.error("Error fetching filtered tours:", error);
        return { success: false, error: 'Failed to fetch tours.' };
    }
}
