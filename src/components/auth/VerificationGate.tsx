
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { isVerificationRequired } from '@/app/actions/verification';
import { Loader2 } from 'lucide-react';
import { OtpVerificationModal } from './OtpVerificationModal';

export function VerificationGate({ children }: { children: React.ReactNode }) {
    const { user, dbUser, loading: authLoading } = useAuth();
    const [needsVerification, setNeedsVerification] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkVerification = async () => {
            if (authLoading || !dbUser || !user?.email) {
                if (!authLoading) setLoading(false); // If auth is done but no user, stop loading
                return;
            };
            
            const isSessionVerified = sessionStorage.getItem('sessionVerified') === 'true';
            if (isSessionVerified) {
                setNeedsVerification(false);
                setLoading(false);
                return;
            }

            const { required } = await isVerificationRequired();
            if (required) {
                setNeedsVerification(true);
            }
            setLoading(false);
        };

        checkVerification();
    }, [dbUser, authLoading, user?.email]);

    const handleVerificationSuccess = (verified: boolean) => {
        if (verified) {
            sessionStorage.setItem('sessionVerified', 'true');
            setNeedsVerification(false);
        }
        // If they close the modal without verifying, it will remain open.
    };
    
    if (loading || authLoading) {
        return (
             <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <span>Verifying session...</span>
                </div>
            </div>
        );
    }
    
    if (needsVerification && user?.email) {
        return (
            <OtpVerificationModal 
                isOpen={true}
                onClose={handleVerificationSuccess}
                identifier={user.email}
                title="Session Verification Required"
                description="For enhanced security, this staff account requires email verification for each session. We've sent a 6-digit code to your email."
            />
        );
    }
    
    // Render children if no verification is needed or already passed
    return <>{children}</>;
}

