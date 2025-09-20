
'use server';

import { generateOtp, validateOtp, checkRateLimit } from '@/services/otp-service';
import { sendOtpEmail } from '@/services/email';
import { getSettings } from '@/app/admin/settings/actions';
import { headers } from 'next/headers';

/**
 * Generates and sends a 6-digit OTP to the specified email address, with rate limiting.
 * @param email The email address to send the OTP to.
 * @returns An object indicating success or failure and the OTP expiry time.
 */
export async function sendVerificationOtp(email: string): Promise<{ success: boolean; error?: string; expiresAt?: number }> {
  if (!email) {
    return { success: false, error: 'Email is required.' };
  }
  const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';

  try {
    const rateLimitCheck = await checkRateLimit(email, ip);
    if (!rateLimitCheck.success) {
      return { success: false, error: rateLimitCheck.error };
    }

    const { code, expiresAt } = await generateOtp(email, 'generic', ip);
    await sendOtpEmail({ to: email, otp: code });
    return { success: true, expiresAt: expiresAt.getTime() };
  } catch (error) {
    console.error('Error sending OTP:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP. Please try again.';
    return { success: false, error: errorMessage };
  }
}


/**
 * Validates the OTP provided by the user.
 * @param email The user's email.
 * @param otp The 6-digit code to validate.
 * @returns An object indicating success or failure.
 */
export async function verifyUserOtp(email: string, otp: string) {
  // The 'type' parameter is removed as we consolidate OTP types for simplicity
  return await validateOtp(email, otp);
}


/**
 * Checks if staff verification is required by the system settings.
 * @returns An object indicating if verification is required.
 */
export async function isVerificationRequired() {
    try {
        const { settings, error } = await getSettings();
        if (error) {
            // Fail safe: if settings can't be fetched, don't require verification.
            console.error("Could not fetch settings for verification check:", error);
            return { required: false };
        }
        return { required: !!settings?.requireStaffVerification };
    } catch (e) {
        console.error("Exception in isVerificationRequired:", e);
        return { required: false };
    }
}
