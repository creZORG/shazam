
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Promocode } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export async function validatePromocode(
  code: string,
  listingId: string
): Promise<{
  success: boolean;
  error?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}> {
  noStore();
  if (!code || !listingId) {
    return { success: false, error: 'Promo code and listing ID are required.' };
  }

  try {
    const q = query(
      collection(db, 'promocodes'),
      where('code', '==', code.toUpperCase())
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, error: 'This promo code is not valid.' };
    }

    const promocodeDoc = snapshot.docs[0];
    const promocode = { id: promocodeDoc.id, ...promocodeDoc.data() } as Promocode;

    // Check if the code is for a specific listing OR if it's a sitewide code
    if (promocode.listingId && promocode.listingId !== listingId) {
        return { success: false, error: 'This code is not valid for this event.' };
    }

    if (!promocode.isActive) {
      return { success: false, error: 'This promo code is no longer active.' };
    }
    
    if (promocode.influencerId && promocode.influencerStatus !== 'accepted') {
        return { success: false, error: 'This promo code is not ready yet. Try again later.'}
    }

    if (promocode.expiresAt) {
        const expiryDate = new Date(promocode.expiresAt);
        if (expiryDate < new Date()) {
            return { success: false, error: 'This promo code has expired.' };
        }
    }

    if (promocode.usageCount >= promocode.usageLimit) {
      return { success: false, error: 'This promo code has reached its usage limit.' };
    }

    return {
      success: true,
      discountType: promocode.discountType,
      discountValue: promocode.discountValue,
    };
  } catch (error) {
    console.error('Error validating promocode:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
