
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc } from "firebase/firestore";
import type { Product } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export async function getProductById(id: string): Promise<{ success: boolean; data?: Product; error?: string; }> {
    noStore();
    try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const productData = { id: docSnap.id, ...docSnap.data() } as Product;
            return { success: true, data: productData };
        } else {
            return { success: false, error: "Product not found." };
        }
    } catch (error: any) {
        return { success: false, error: `Failed to fetch product: ${error.message}` };
    }
}
