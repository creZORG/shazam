
'use client';

import { useState, useTransition, useEffect } from 'react';
import { sendVerificationOtp, verifyUserOtp } from '@/app/actions/verification';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MailCheck, ShieldCheck, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: (verified: boolean) => void;
  identifier: string;
  isDismissible?: boolean;
  title?: string;
  description?: string;
}

function redactEmail(email: string) {
    if (!email || email.indexOf('@') === -1) return '***';
    const [name, domain] = email.split('@');
    if (name.length <= 2) return `${name.charAt(0)}***@${domain}`;
    return `${name.substring(0, 2)}***@${domain}`;
}

function Timer({ expiryTimestamp }: { expiryTimestamp: number }) {
    const [timeLeft, setTimeLeft] = useState(expiryTimestamp - Date.now());

    useEffect(() => {
        if (timeLeft <= 0) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);
    
    const minutes = Math.floor((timeLeft / 1000) / 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    return (
        <span className="font-mono font-semibold">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
    );
}

export function OtpVerificationModal({ 
    isOpen, 
    onClose, 
    identifier, 
    isDismissible = true,
    title = "Verification Required",
    description = "For your security, please complete this verification step. We've sent a 6-digit code to your email."
}: OtpVerificationModalProps) {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [otp, setOtp] = useState('');
  const [isSending, startSending] = useTransition();
  const [isVerifying, startVerifying] = useTransition();
  const [expiry, setExpiry] = useState<number | null>(null);

  const handleSendOtp = async (showToast = true) => {
    if (!identifier) return;

    startSending(async () => {
      const result = await sendVerificationOtp(identifier);
      if (result.success && result.expiresAt) {
        setExpiry(result.expiresAt);
        if (showToast) {
          toast({ title: 'OTP Sent', description: 'A new verification code has been sent to your email.' });
        }
      } else {
        if (showToast) {
          toast({ variant: 'destructive', title: 'Error Sending Code', description: result.error });
        }
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
        handleSendOtp(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);


  const handleVerifyOtp = async () => {
    if (!identifier || otp.length !== 6) return;

    startVerifying(async () => {
      const result = await verifyUserOtp(identifier, otp);
      if (result.success) {
        toast({ title: 'Verification Successful' });
        onClose(true); // Signal success
      } else {
        toast({ variant: 'destructive', title: 'Verification Failed', description: result.error || 'Invalid OTP.' });
      }
    });
  };
  
  const onModalOpenChange = (open: boolean) => {
    if (!open && isDismissible) {
      onClose(false);
    }
  };
  
  const isActionInProgress = isSending || isVerifying;

  return (
    <Dialog open={isOpen} onOpenChange={onModalOpenChange}>
      <DialogContent 
        showCloseButton={isDismissible} 
        onInteractOutside={(e) => { if (!isDismissible) e.preventDefault(); }} 
        className="w-full max-w-md"
      >
        <DialogHeader className="text-center items-center">
          <div className="h-14 w-14 rounded-full flex items-center justify-center bg-gradient-to-r from-pink-500 to-orange-500">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl pt-4">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="p-3 bg-muted rounded-md text-center">
            <p className="text-sm text-muted-foreground">Verification code sent to:</p>
            <p className="font-semibold">{redactEmail(identifier)}</p>
          </div>
          <div className="flex justify-center">
            <Input 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              placeholder="------"
              className="w-48 text-center text-2xl font-mono tracking-[0.5em]"
              disabled={isActionInProgress}
            />
          </div>
          {expiry && (
             <p className="text-center text-sm text-muted-foreground">
                Code expires in <Timer expiryTimestamp={expiry} />
            </p>
          )}
        </div>
        <DialogFooter className="flex-col gap-4">
          <div className="flex flex-col sm:flex-row w-full items-center gap-2">
            <Button onClick={handleVerifyOtp} disabled={isActionInProgress || otp.length !== 6} className="w-full bg-gradient-to-r from-pink-500 to-orange-500">
                {isVerifying ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                <span className="ml-2">Verify & Continue</span>
            </Button>
            <Button variant="link" size="sm" onClick={() => handleSendOtp(true)} disabled={isActionInProgress} className="flex-shrink-0">
                {isSending ? <Loader2 className="animate-spin mr-2" /> : <MailCheck className="mr-2" />}
                Resend Code
            </Button>
          </div>
          
          {!isDismissible && (
            <div className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                For security, you must verify your identity to continue.
              </p>
              <div className="flex w-full items-center justify-center gap-4 mt-2">
                   <Button variant="ghost" size="sm" asChild>
                      <Link href="/support"><HelpCircle className="mr-2" /> Support</Link>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={signOut}>
                      <LogOut className="mr-2" /> Sign Out
                  </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
