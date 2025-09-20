
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createPromocode } from '@/app/organizer/promocodes/actions';
import { useAuth } from '@/hooks/use-auth';
import { Gift, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';

const NEW_USER_COUPON_FLAG = 'has_seen_new_user_coupon';

export function NewUserCouponModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Show for any first-time visitor
    const hasSeen = localStorage.getItem(NEW_USER_COUPON_FLAG);
    if (!hasSeen) {
      // Delay showing the modal slightly to not be too intrusive
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClaimCoupon = async () => {
    if (!user) return;
    setIsClaiming(true);
    
    // We create a coupon specifically for this user.
    const result = await createPromocode({
      organizerId: 'NAKSYETU_SYSTEM', // A system-level organizer ID
      userId: user.uid, // Assign the coupon to the specific user
      listingType: 'all',
      listingName: 'All Events',
      code: `NEWUSER-${user.uid.substring(0, 5)}`,
      discountType: 'percentage',
      discountValue: 15,
      usageLimit: 1, // One-time use
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });

    if (result.success) {
        toast({
            title: "Coupon Claimed!",
            description: "A 15% discount has been applied to your account for your next purchase. You can view it in your profile."
        });
        localStorage.setItem(NEW_USER_COUPON_FLAG, 'true');
        setIsOpen(false);
    } else {
         toast({
            variant: "destructive",
            title: "Claim Failed",
            description: result.error || "Could not claim the coupon. Please try again later."
        });
    }

    setIsClaiming(false);
  };
  
  const handleClose = (open: boolean) => {
      if (!open) {
          localStorage.setItem(NEW_USER_COUPON_FLAG, 'true');
          setIsOpen(false);
      }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 overflow-hidden">
        <div className="relative h-32 w-full">
            <Image src="https://img.ltwebstatic.com/images3_ccc/2024/03/27/d3/17115267680e016ed8c30f24eb9aaa5b9b714085ce.png" alt="Gift" layout="fill" objectFit="cover" />
        </div>
        <DialogHeader className="items-center text-center pt-8 px-6">
          <div className="h-16 w-16 mb-4 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-accent -mt-20 bg-background border-4 border-background">
            <Gift className="h-10 w-10 text-primary" />
          </div>
          <DialogTitle className="text-2xl">A Special Welcome Gift!</DialogTitle>
          <DialogDescription>As a new member of the NaksYetu family, here's a special discount just for you.</DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center px-6">
            <p className="text-sm text-muted-foreground">NEW USER ONLY</p>
            <p className="text-6xl font-extrabold text-primary">15% OFF</p>
            <p className="text-muted-foreground">Your first ticket purchase</p>
        </div>
        <div className="px-6 pb-8">
            {user ? (
                 <Button size="lg" className="w-full" onClick={handleClaimCoupon} disabled={isClaiming}>
                    {isClaiming ? <Loader2 className="animate-spin mr-2" /> : null}
                    Claim My Discount
                </Button>
            ) : (
                <Link href="/login" className="w-full">
                    <Button size="lg" className="w-full">
                        Login or Sign Up to Claim
                    </Button>
                </Link>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
