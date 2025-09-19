
'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, writeBatch } from 'firebase/firestore';
import { createHash, randomInt } from 'crypto';

const OTP_LIFESPAN_MINUTES = 10; // OTPs are valid for 10 minutes

interface OtpDocument {
    identifier: string; // e.g., email or phone number
    hashedCode: string;
    type: 'phone_verification' | 'password_reset' | 'generic';
    createdAt: any;
    expiresAt: any;
    used: boolean;
}

/**
 * Hashes an OTP code for secure storage.
 * @param code The plaintext OTP code.
 * @returns The SHA-256 hash of the code.
 */
function hashOtp(code: string): string {
    return createHash('sha256').update(code).digest('hex');
}

/**
 * Generates a 6-digit numeric OTP, stores its hash, and returns the plaintext code.
 * @param identifier The user identifier (e.g., phone number or email) this OTP is for.
 * @param type The purpose of the OTP.
 * @returns The generated 6-digit OTP code.
 */
export async function generateOtp(identifier: string, type: OtpDocument['type'] = 'generic'): Promise<string> {
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
    };
    
    await addDoc(collection(db, 'otps'), {
        ...otpPayload,
        createdAt: serverTimestamp(),
    });

    // The plaintext code is returned to be sent to the user via SMS, email, etc.
    // It is NOT stored in the database.
    return code;
}


/**
 * Validates a given OTP for a specific identifier.
 * @param identifier The user identifier (e.g., phone number or email).
 * @param code The plaintext OTP code provided by the user.
 * @param type The purpose of the OTP to validate against.
 * @returns An object indicating if the validation was successful.
 */
export async function validateOtp(
    identifier: string, 
    code: string,
    type: OtpDocument['type'] = 'generic'
): Promise<{ success: boolean; error?: string }> {
    const hashedCode = hashOtp(code);
    const now = new Date();

    const q = query(
        collection(db, 'otps'),
        where('identifier', '==', identifier),
        where('hashedCode', '==', hashedCode),
        where('type', '==', type)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return { success: false, error: 'Invalid OTP.' };
    }

    const otpDoc = snapshot.docs[0]; // Get the most recent valid code
    const otpData = otpDoc.data() as OtpDocument;

    if (otpData.used) {
        return { success: false, error: 'This OTP has already been used.' };
    }

    if ((otpData.expiresAt as Timestamp).toDate() < now) {
        return { success: false, error: 'This OTP has expired.' };
    }

    // OTP is valid. Mark it as used to prevent reuse.
    const batch = writeBatch(db);
    batch.update(otpDoc.ref, { used: true });
    await batch.commit();

    return { success: true };
}
