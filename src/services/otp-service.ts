
'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, writeBatch, orderBy, limit } from 'firebase/firestore';
import { createHash, randomInt } from 'crypto';

const OTP_LIFESPAN_MINUTES = 10;
const RATE_LIMIT_WINDOW_MINUTES = 10; // Check for requests in the last 10 minutes
const MAX_REQUESTS_PER_WINDOW = 3; // Allow 3 requests per 10 minutes
const MIN_REQUEST_INTERVAL_SECONDS = 60; // Must wait 60 seconds between requests

interface OtpDocument {
    identifier: string; // e.g., email or phone number
    hashedCode: string;
    type: 'generic'; // Simplified type
    createdAt: any;
    expiresAt: any;
    used: boolean;
    ipAddress?: string;
}

function hashOtp(code: string): string {
    return createHash('sha256').update(code).digest('hex');
}

export async function checkRateLimit(identifier: string, ip: string): Promise<{ success: boolean; error?: string }> {
    const now = Timestamp.now();
    const windowStart = Timestamp.fromMillis(now.toMillis() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const intervalStart = Timestamp.fromMillis(now.toMillis() - MIN_REQUEST_INTERVAL_SECONDS * 1000);

    const q = query(
        collection(db, 'otps'),
        where('identifier', '==', identifier),
        where('createdAt', '>=', windowStart),
        orderBy('createdAt', 'desc')
    );
    
    const recentOtpsSnapshot = await getDocs(q);
    const recentOtps = recentOtpsSnapshot.docs.map(doc => doc.data());

    // Check for total requests in the window
    if (recentOtps.length >= MAX_REQUESTS_PER_WINDOW) {
        return { success: false, error: `Too many requests. Please try again in ${RATE_LIMIT_WINDOW_MINUTES} minutes.` };
    }

    // Check for requests in the last minute
    if (recentOtps.length > 0) {
        const lastOtpTime = recentOtps[0].createdAt as Timestamp;
        if (lastOtpTime > intervalStart) {
            const secondsLeft = Math.ceil(MIN_REQUEST_INTERVAL_SECONDS - (now.seconds - lastOtpTime.seconds));
            return { success: false, error: `Please wait ${secondsLeft} seconds before requesting a new code.` };
        }
    }

    return { success: true };
}


export async function generateOtp(identifier: string, type: OtpDocument['type'] = 'generic', ipAddress: string): Promise<{ code: string, expiresAt: Date }> {
    const code = randomInt(100000, 1000000).toString();
    const hashedCode = hashOtp(code);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_LIFESPAN_MINUTES * 60 * 1000);

    const otpPayload: Omit<OtpDocument, 'createdAt'> = {
        identifier,
        hashedCode,
        type,
        expiresAt: Timestamp.fromDate(expiresAt),
        used: false,
        ipAddress,
    };
    
    await addDoc(collection(db, 'otps'), {
        ...otpPayload,
        createdAt: serverTimestamp(),
    });

    return { code, expiresAt };
}


export async function validateOtp(
    identifier: string, 
    code: string,
): Promise<{ success: boolean; error?: string }> {
    const hashedCode = hashOtp(code);
    const now = Timestamp.now();

    const q = query(
        collection(db, 'otps'),
        where('identifier', '==', identifier),
        where('hashedCode', '==', hashedCode),
        where('expiresAt', '>=', now),
        where('used', '==', false),
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return { success: false, error: 'Invalid or expired OTP.' };
    }

    const otpDoc = snapshot.docs[0];
    
    // Mark as used to prevent reuse
    await updateDoc(otpDoc.ref, { used: true });

    return { success: true };
}
