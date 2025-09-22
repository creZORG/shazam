

'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { revalidatePath } from 'next/cache';
import type { SiteSettings } from '@/lib/types';
import { logAdminAction } from '@/services/audit-service';
import { getAdminAuth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';

export async function getSettings(): Promise<{ settings: SiteSettings | null, error: string | null }> {
    try {
        const settingsDocRef = doc(db, 'config', 'settings');
        const docSnap = await getDoc(settingsDocRef);

        const defaultSettings: SiteSettings = {
            platformFee: 5,
            processingFee: 2.5,
            processingFeePayer: 'customer',
            influencerCut: 10,
            loyaltyPointRate: 10, // Default: 1 point per 10 Ksh
        };

        if (docSnap.exists()) {
            const settings = docSnap.data() as SiteSettings;
            // Merge defaults with existing settings to ensure new fields are present
            return { settings: { ...defaultSettings, ...settings }, error: null };
        } else {
            return { settings: defaultSettings, error: null };
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
        return { settings: null, error: "Failed to fetch settings." };
    }
}

export async function updateSettings(settings: Partial<SiteSettings>) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    
    const auth = await getAdminAuth();
    if (!auth) {
        throw new Error("Server auth not initialized");
    }
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    try {
        const settingsDocRef = doc(db, 'config', 'settings');
        await setDoc(settingsDocRef, settings, { merge: true });
        
        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Super Admin',
            action: 'update_system_settings',
            targetType: 'settings',
            targetId: 'site_settings',
            details: { updatedSettings: settings }
        });
        
        // Revalidate paths where settings might be used
        revalidatePath('/checkout');
        revalidatePath('/admin/settings');
        revalidatePath('/', 'layout'); // Revalidate all layouts to update logos
        
        return { success: true };
    } catch (error: any) {
        console.error("Error updating settings:", error);
        return { success: false, error: `Failed to update settings. Details: ${error.message}` };
    }
}
