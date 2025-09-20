
'use server';

import { generateOtp, validateOtp } from '@/services/otp-service';
import { sendOtpEmail } from '@/services/email';
import { getSettings } from '@/app/admin/settings/actions';

/**
 * Generates and sends a 6-digit OTP to the specified email address.
 * @param email The email address to send the OTP to.
 * @returns An object indicating success or failure.
 */
export async function sendVerificationOtp(email: string) {
  if (!email) {
    return { success: false, error: 'Email is required.' };
  }

  try {
    const code = await generateOtp(email, 'generic');
    await sendOtpEmail({ to: email, otp: code });
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { success: false, error: 'Failed to send OTP. Please try again.' };
  }
}

/**
 * Validates the OTP provided by the user.
 * @param email The user's email.
 * @param otp The 6-digit code to validate.
 * @returns An object indicating success or failure.
 */
export async function verifyUserOtp(email: string, otp: string) {
  return await validateOtp(email, otp, 'generic');
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
