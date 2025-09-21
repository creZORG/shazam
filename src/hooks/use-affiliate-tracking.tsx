
'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';

const TRACKING_COOKIE_KEY = 'nak_tracker';
const TRACKING_EXPIRY_HOURS = 24;

interface AffiliateData {
    code?: string | null;
    listingId?: string | null;
    trackingLinkId?: string;
    promocodeId?: string | null;
    channel?: "direct" | "referral" | "ad" | "search" | "organic_social";
}

const AffiliateContext = createContext<AffiliateData | null>(null);

export function AffiliateProvider({ children }: { children: ReactNode }) {
    const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        // This effect runs only once on mount to initialize data.
        // It prioritizes URL params over cookies.

        const linkId = searchParams.get('linkId');
        const couponFromUrl = searchParams.get('coupon');

        // Case 1: A tracking link `?linkId=...` is present. This is the highest priority.
        if (linkId) {
            const data: AffiliateData = {
                trackingLinkId: linkId,
                code: couponFromUrl || undefined,
                channel: 'referral' // Default channel for direct link clicks
            };
            try {
                // We store the tracker data in a cookie to persist it across navigation.
                setCookie(TRACKING_COOKIE_KEY, JSON.stringify(data), {
                    maxAge: TRACKING_EXPIRY_HOURS * 60 * 60
                });
                setAffiliateData(data);
                return;
            } catch (e) {
                console.error("Failed to set tracking cookie", e);
            }
        }
        
        // Case 2: No `linkId` in URL, but a tracker cookie exists from a previous link click.
        const trackerCookie = getCookie(TRACKING_COOKIE_KEY);
        if (typeof trackerCookie === 'string') {
            try {
                const parsed = JSON.parse(trackerCookie);
                if (parsed.trackingLinkId) {
                    setAffiliateData(parsed);
                    return;
                }
            } catch (e) {
                 console.error("Failed to parse tracking cookie", e);
                 deleteCookie(TRACKING_COOKIE_KEY);
            }
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once on mount

    return (
        <AffiliateContext.Provider value={affiliateData}>
            {children}
        </AffiliateContext.Provider>
    );
}

export const useAffiliateData = () => {
    return useContext(AffiliateContext);
};
