
'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { AffiliateProvider } from '@/hooks/use-affiliate-tracking';
import { OtpVerificationProvider } from '@/hooks/use-otp-verification';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <OtpVerificationProvider>
                <AffiliateProvider>
                    {children}
                </AffiliateProvider>
            </OtpVerificationProvider>
        </Suspense>
    );
}
