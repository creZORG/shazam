
"use server";

import { suggestVenue, type VenueSuggestionInput } from "@/ai/flows/venue-suggestion.flow";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import type { Product } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export async function getVenueSuggestion(input: VenueSuggestionInput) {
    try {
        if(input.attendeeCount <= 0) {
            return { success: false, error: 'Please enter a valid number of attendees.' };
        }
        const suggestion = await suggestVenue(input);
        return { success: true, data: suggestion };
    } catch (error) {
        console.error("Venue Suggestion Error:", error);
        return { success: false, error: 'Failed to get a venue suggestion. Please try again.' };
    }
}

export async function getProductsForSelect(): Promise<{ success: boolean; data?: { id: string; name: string }[]; error?: string; }> {
    noStore();
    try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name
        }));
        return { success: true, data: products };
    } catch (error) {
        console.error("Error fetching products for select:", error);
        return { success: false, error: 'Failed to fetch products.' };
    }
}
