
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { sendVerificationOtp, verifyUserOtp, isVerificationRequired } from '@/app/actions/verification';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import { Logo } from '../icons/Logo';

export function VerificationGate({ children }: { children: React.ReactNode }) {
    const { user, dbUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [needsVerification, setNeedsVerification] = useState(false);
    const [loading, setLoading] = useState(true);
    const [otp, setOtp] = useState('');
    const [isSending, startSending] = useTransition();
    const [isVerifying, startVerifying] = useTransition();

    useEffect(() => {
        const checkVerification = async () => {
            if (authLoading || !dbUser) return;
            
            const isSessionVerified = sessionStorage.getItem('sessionVerified') === 'true';
            if (isSessionVerified) {
                setNeedsVerification(false);
                setLoading(false);
                return;
            }

            const { required } = await isVerificationRequired();
            if (required) {
                setNeedsVerification(true);
                handleSendOtp(false); // Send OTP automatically on load
            }
            setLoading(false);
        };

        checkVerification();
    }, [dbUser, authLoading]);

    const handleSendOtp = async (showToast = true) => {
        if (!user?.email) return;

        startSending(async () => {
            const result = await sendVerificationOtp(user.email!);
            if (result.success) {
                if (showToast) {
                    toast({ title: 'OTP Sent', description: 'A new verification code has been sent to your email.' });
                }
            } else {
                 if (showToast) {
                    toast({ variant: 'destructive', title: 'Error', description: result.error });
                }
            }
        });
    };

    const handleVerifyOtp = async () => {
        if (!user?.email || otp.length !== 6) return;

        startVerifying(async () => {
            const result = await verifyUserOtp(user.email!, otp);
            if (result.success) {
                toast({ title: 'Verification Successful', description: 'Access granted.' });
                sessionStorage.setItem('sessionVerified', 'true');
                setNeedsVerification(false);
            } else {
                toast({ variant: 'destructive', title: 'Verification Failed', description: result.error || 'Invalid OTP.' });
            }
        });
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
    
    if (!needsVerification) {
        return <>{children}</>;
    }

    return (
        <Dialog open={needsVerification}>
            <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()} className="max-w-md">
                <DialogHeader className="text-center items-center">
                    <Logo />
                    <DialogTitle className="text-2xl pt-4">Verification Required</DialogTitle>
                    <DialogDescription>
                        For enhanced security, this account requires email verification for each session. We've sent a 6-digit code to your email.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex justify-center">
                        <Input 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={6}
                            placeholder="_ _ _ _ _ _"
                            className="w-48 text-center text-2xl font-mono tracking-[0.5em]"
                        />
                    </div>
                </div>
                <DialogFooter className="flex-col gap-2">
                    <Button onClick={handleVerifyOtp} disabled={isVerifying || otp.length !== 6} className="w-full">
                        {isVerifying ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                        <span className="ml-2">Verify & Continue</span>
                    </Button>
                    <Button variant="link" size="sm" onClick={() => handleSendOtp(true)} disabled={isSending}>
                        {isSending ? <Loader2 className="animate-spin" /> : <MailCheck />}
                        <span className="ml-2">Resend Code</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
