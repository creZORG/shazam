
'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { trackLinkClick } from '@/app/admin/promotions/actions';

const AFFILIATE_STORAGE_KEY = 'nak_affiliate_promo_code';
const TRACKING_EXPIRY_HOURS = 24;

interface AffiliateData {
    code: string | null;
    listingId: string | null;
    trackingLinkId?: string;
    expiry: number;
    channel: "direct" | "referral" | "ad" | "search" | "organic_social";
}

const AffiliateContext = createContext<AffiliateData | null>(null);

export function AffiliateProvider({ children }: { children: ReactNode }) {
    const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
    const searchParams = useSearchParams();
    const pathname = usePathname();

    useEffect(() => {
        // This effect runs only once on the client side to initialize data
        // from either URL params or localStorage.
        const coupon = searchParams.get('coupon');
        const trackingLinkId = searchParams.get('linkId');
        const customSlug = pathname.startsWith('/l/') ? pathname.split('/').pop() : null;

        const source = searchParams.get('utm_source');
        const medium = searchParams.get('utm_medium');
        
        let channel: AffiliateData['channel'] = 'referral';
        if (medium === 'cpc' || medium === 'paid') channel = 'ad';
        if (source === 'facebook' || source === 'instagram' || source === 'twitter') channel = 'organic_social';

        // From a short link click
        if (customSlug) {
             const expiry = new Date().getTime() + TRACKING_EXPIRY_HOURS * 60 * 60 * 1000;
             const data: AffiliateData = { code: coupon, listingId: null, trackingLinkId, expiry, channel };
             localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(data));
             setAffiliateData(data);
             // No need to call trackLinkClick here, as the /l/[shortId] route handler does it.
             return;
        }

        // From a direct link with coupon
        if (coupon) {
            const listingId = pathname.split('/').pop() || null;
            if (listingId) {
                const expiry = new Date().getTime() + TRACKING_EXPIRY_HOURS * 60 * 60 * 1000;
                const data: AffiliateData = { code: coupon, listingId, trackingLinkId, expiry, channel };
                localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(data));
                setAffiliateData(data);
                return;
            }
        }
        
        // If no params, try to load from localStorage
        const storedData = localStorage.getItem(AFFILIATE_STORAGE_KEY);
        if (storedData) {
            try {
                const data: AffiliateData = JSON.parse(storedData);
                if (new Date().getTime() < data.expiry) {
                    setAffiliateData(data);
                } else {
                    localStorage.removeItem(AFFILIATE_STORAGE_KEY);
                }
            } catch (error) {
                console.error("Error parsing affiliate data from localStorage", error);
                localStorage.removeItem(AFFILIATE_STORAGE_KEY);
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

// Deprecated component, provider handles logic now.
export function AffiliateTracker() {
    return null;
}
