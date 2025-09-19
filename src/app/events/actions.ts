
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export interface FilterState {
  search?: string;
  location?: string;
  category?: string;
  age?: string;
  day?: string;
  dateRange?: string;
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

export async function getFilteredEvents(filters: FilterState): Promise<{ success: boolean; data?: Event[]; error?: string }> {
    noStore();
    try {
        let q: any = collection(db, 'events');
        
        q = query(q, where('status', '==', 'published'));

        if (filters.location && filters.location !== 'all') {
            q = query(q, where('subCounty', '==', filters.location));
        }
        if (filters.category && filters.category !== 'all') {
            q = query(q, where('category', '==', filters.category));
        }
        if (filters.age && filters.age !== 'all') {
            q = query(q, where('ageCategory', '==', filters.age));
        }

        // Date range filtering
        if (filters.dateRange && filters.dateRange !== 'all') {
            const now = new Date();
            let startDate = new Date(now);
            let endDate = new Date(now);
            
            switch(filters.dateRange) {
                case 'today':
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'tomorrow':
                     startDate.setDate(now.getDate() + 1);
                     startDate.setHours(0, 0, 0, 0);
                     endDate.setDate(now.getDate() + 1);
                     endDate.setHours(23, 59, 59, 999);
                    break;
                case 'this-week':
                    endDate.setDate(now.getDate() + (7 - now.getDay()));
                    endDate.setHours(23, 59, 59, 999);
                    break;
                 case 'next-week':
                    startDate.setDate(now.getDate() + (8 - now.getDay()));
                    startDate.setHours(0,0,0,0);
                    endDate.setDate(startDate.getDate() + 6);
                    endDate.setHours(23,59,59,999);
                    break;
                case 'this-month':
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
            }

            q = query(q, where('date', '>=', startDate.toISOString()), where('date', '<=', endDate.toISOString()));
        }

        // Initial fetch from Firestore based on server-filterable fields
        let events = (await getDocs(q)).docs.map(serializeData) as Event[];
        
        // Now, apply client-side text search on the results
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            events = events.filter(event => 
                event.name?.toLowerCase().includes(searchTerm) ||
                event.venue?.toLowerCase().includes(searchTerm) ||
                event.organizerName?.toLowerCase().includes(searchTerm)
            );
        }

        // Sorting logic remains client-side as it can depend on calculated fields (like min price)
        events.sort((a, b) => {
            const priceA = a.tickets?.[0]?.price ?? 0;
            const priceB = b.tickets?.[0]?.price ?? 0;
            if (filters.sort === 'price-asc') {
                return priceA - priceB;
            }
            if (filters.sort === 'price-desc') {
                return priceB - priceA;
            }
            // Default to date sort
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });


        return { success: true, data: events };
    } catch (error: any) {
        console.error("Error fetching filtered events:", error);
        return { success: false, error: 'Failed to fetch events.' };
    }
}
