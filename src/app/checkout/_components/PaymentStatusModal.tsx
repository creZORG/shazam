
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Wallet, Ticket, CircleHelp, MessageSquare, List, Gift } from 'lucide-react';
import { logCheckoutRating } from '../order-actions';
import { StarRating } from '@/components/ui/star-rating';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { OrderPayload } from '../order-actions';
import Image from 'next/image';
import { Confetti } from '@/components/ui/confetti';
import { type Event, type Tour } from '@/lib/types';


export type PaymentStage = 'idle' | 'creating_order' | 'sending_stk' | 'awaiting_payment' | 'success' | 'failed' | null;

const stageMessages: Record<Exclude<PaymentStage, null>, string> = {
  idle: 'Preparing your order...',
  creating_order: 'Creating your order...',
  sending_stk: 'Sending payment request to your phone...',
  awaiting_payment: 'Please complete the M-Pesa payment on your phone.',
  success: "You're In!",
  failed: 'Payment Failed',
};

export function PaymentStatusModal({ 
    stage, 
    isOpen, 
    onClose, 
    onRetry,
    error,
    orderPayload, 
    listing,
    orderId,
    retryCount,
}: { 
    stage: PaymentStage,
    isOpen: boolean; 
    onClose: () => void; 
    onRetry: () => void;
    error: string | null;
    orderPayload: OrderPayload, 
    listing: Event | Tour | null,
    orderId: string | null,
    retryCount: number,
}) {
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmittingRating, startSubmittingRating] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (stage === 'success') {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 5000); // Confetti for 5 seconds
            return () => clearTimeout(timer);
        }
    }, [stage]);

    const handleRatingSubmit = async () => {
        if (rating === 0) {
            toast({ variant: 'destructive', title: 'Please select a rating' });
            return;
        }
        startSubmittingRating(true);
        await logCheckoutRating(rating, feedback, orderId!);
        toast({ title: 'Thank you for your feedback!' });
        onClose(); // Close modal after feedback
        startSubmittingRating(false);
    }
    
    const renderContent = () => {
        if (!stage) return null;
        
        switch(stage) {
            case 'success':
                return (
                    <div className="text-center space-y-4 pt-0">
                        {showConfetti && <Confetti />}
                        <div className="relative h-40 w-full -mx-6 -mt-6 rounded-t-lg overflow-hidden">
                            <Image src={listing?.imageUrl || ''} alt={listing?.name || 'Event'} fill className="object-cover"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-4 left-4 text-left">
                                <p className="text-white font-semibold">You have tickets for:</p>
                                <h3 className="text-2xl font-bold text-white" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.5)'}}>{listing?.name}</h3>
                            </div>
                        </div>

                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                        <DialogTitle>{stageMessages.success}</DialogTitle>
                        <DialogDescription>
                            Thank you, {orderPayload.userName}! Get ready for an amazing experience.
                        </DialogDescription>
                         {(listing as Event)?.whatsappGroupLink && (
                            <div className="p-4 bg-muted rounded-lg text-left space-y-2">
                                <h4 className="font-semibold text-foreground flex items-center gap-2"><MessageSquare className="text-green-500"/> Join the Event Community</h4>
                                <p className="text-xs text-muted-foreground">Connect with other attendees and get real-time updates from the organizer by joining the official WhatsApp group.</p>
                                <a href={(listing as Event).whatsappGroupLink} target="_blank" rel="noopener noreferrer">
                                    <Button variant="secondary" className="w-full">
                                        Join WhatsApp Group
                                    </Button>
                                </a>
                            </div>
                        )}
                        <div className="pt-4 space-y-3">
                            <h4 className="font-semibold">How was your booking experience?</h4>
                            <div className="flex justify-center">
                                <StarRating onRatingChange={setRating} />
                            </div>
                            {rating > 0 && rating < 5 && (
                                <Textarea
                                    placeholder="Tell us how we can improve (optional)"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                );
            case 'failed':
                 return (
                    <div className="text-center space-y-4">
                        <XCircle className="h-16 w-16 text-destructive mx-auto" />
                        <DialogTitle>{stageMessages.failed}</DialogTitle>
                        <DialogDescription>
                            {error || 'An unknown error occurred.'}
                        </DialogDescription>
                        {retryCount < 2 && (
                             <div className="pt-4">
                                <p className="text-sm text-muted-foreground mb-2">Would you like to try again?</p>
                                <Button onClick={onRetry}>Try Again</Button>
                            </div>
                        )}
                        {retryCount >= 2 && (
                            <div className="pt-4 text-sm text-muted-foreground text-left bg-muted p-4 rounded-md">
                                <h4 className="font-semibold text-foreground flex items-center gap-2"><CircleHelp />Manual Payment Instructions</h4>
                                <p className="mt-2">It seems there's an issue with automated payments. You can pay manually:</p>
                                <ol className="list-decimal list-inside space-y-1 mt-2">
                                    <li>Go to M-Pesa Menu on your phone</li>
                                    <li>Select "Lipa na M-Pesa"</li>
                                    <li>Select "Pay Bill"</li>
                                    <li>Enter Business No: <strong>{process.env.NEXT_PUBLIC_MPESA_SHORTCODE}</strong></li>
                                    <li>Enter Account No: <strong>{orderId}</strong></li>
                                    <li>Enter Amount: <strong>Ksh {orderPayload.total}</strong></li>
                                    <li>Enter your M-Pesa PIN and confirm</li>
                                </ol>
                                <p className="mt-2 text-xs">Your tickets will be sent via email once we confirm the payment.</p>
                            </div>
                        )}
                    </div>
                );
            default:
                 return (
                    <div className="text-center space-y-4">
                        <div className="relative flex justify-center items-center h-16 w-16 mx-auto">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <Wallet className="absolute h-8 w-8" />
                        </div>
                        <DialogTitle>{stageMessages[stage]}</DialogTitle>
                        <DialogDescription>
                           This may take a few moments. Please don't close this window.
                        </DialogDescription>
                    </div>
                 );
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={stage === 'success' ? 'sm:max-w-lg' : 'sm:max-w-md'}>
                <DialogHeader>
                    {/* Header is part of the conditional content */}
                </DialogHeader>
                {renderContent()}
                 <DialogFooter>
                    <div className="flex justify-end gap-2 w-full">
                        {stage === 'success' && (
                            <>
                                <Button variant="outline" onClick={onClose}>Close</Button>
                                <Button onClick={handleRatingSubmit} disabled={isSubmittingRating}>
                                    {isSubmittingRating && <Loader2 className="animate-spin mr-2" />}
                                    Submit Feedback
                                </Button>
                                <Link href={`/ticket-center?orderId=${orderId}`} legacyBehavior>
                                    <a target="_blank"><Button><Ticket className="mr-2" /> View Tickets</Button></a>
                                </Link>
                            </>
                        )}
                        {(stage === 'failed') && (
                            <Button onClick={onClose}>Close</Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
