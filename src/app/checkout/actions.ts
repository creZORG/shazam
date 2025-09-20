
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Promocode } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';

const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MINUTES = 1;

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

  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('cf-connecting-ip') || 'unknown';

  try {
    // --- Rate Limiting Logic ---
    const attemptsCollection = collection(db, 'promoCodeAttempts');
    const now = Timestamp.now();
    const windowStart = Timestamp.fromMillis(now.toMillis() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

    const qRateLimit = query(
        attemptsCollection,
        where('ipAddress', '==', ip),
        where('timestamp', '>=', windowStart)
    );
    
    const attemptsSnapshot = await getDocs(qRateLimit);

    if (attemptsSnapshot.size >= RATE_LIMIT_COUNT) {
        return { success: false, error: 'Too many attempts. Please try again in a minute.' };
    }
    
    await addDoc(attemptsCollection, { ipAddress: ip, timestamp: serverTimestamp() });
    
    // --- Original Logic ---
    if (!code || !listingId) {
        return { success: false, error: 'Promo code and listing ID are required.' };
    }

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
        const expiryDate = (promocode.expiresAt as any).toDate ? (promocode.expiresAt as any).toDate() : new Date(promocode.expiresAt);
        if (expiryDate < new Date()) {
            return { success: false, error: 'This promo code has expired.' };
        }
    }

    if (promocode.usageLimit > 0 && promocode.usageCount >= promocode.usageLimit) {
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
