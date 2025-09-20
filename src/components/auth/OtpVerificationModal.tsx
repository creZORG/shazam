
'use client';

import { useState, useTransition, useEffect } from 'react';
import { sendVerificationOtp, verifyUserOtp } from '@/app/actions/verification';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import { Logo } from '../icons/Logo';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: (verified: boolean) => void;
  identifier: string;
  type?: 'generic' | 'payout_request';
  title?: string;
  description?: string;
}

export function OtpVerificationModal({ 
    isOpen, 
    onClose, 
    identifier, 
    type = 'generic',
    title = "Verification Required",
    description = "For your security, please complete this verification step. We've sent a 6-digit code to your email."
}: OtpVerificationModalProps) {
  const { toast } = useToast();
  const [otp, setOtp] = useState('');
  const [isSending, startSending] = useTransition();
  const [isVerifying, startVerifying] = useTransition();

  const handleSendOtp = async (showToast = true) => {
    if (!identifier) return;

    startSending(async () => {
      const result = await sendVerificationOtp(identifier);
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
    if (!identifier || otp.length !== 6) return;

    startVerifying(async () => {
      const result = await verifyUserOtp(identifier, otp, type);
      if (result.success) {
        toast({ title: 'Verification Successful' });
        onClose(true); // Signal success
      } else {
        toast({ variant: 'destructive', title: 'Verification Failed', description: result.error || 'Invalid OTP.' });
      }
    });
  };
  
  // Send OTP automatically when the modal opens
  useEffect(() => {
    if (isOpen) {
      handleSendOtp(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()} className="max-w-md">
        <DialogHeader className="text-center items-center">
          <Logo />
          <DialogTitle className="text-2xl pt-4">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
