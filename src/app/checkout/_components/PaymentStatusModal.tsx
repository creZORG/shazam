
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Wallet, Ticket, CircleHelp, MessageSquare } from 'lucide-react';
import { logCheckoutRating } from '../order-actions';
import { StarRating } from '@/components/ui/star-rating';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { OrderPayload } from '../order-actions';

export type PaymentStage = 'idle' | 'creating_order' | 'sending_stk' | 'awaiting_payment' | 'success' | 'failed' | null;

const stageMessages: Record<Exclude<PaymentStage, null>, string> = {
  idle: 'Preparing your order...',
  creating_order: 'Creating your order...',
  sending_stk: 'Sending payment request to your phone...',
  awaiting_payment: 'Please complete the M-Pesa payment on your phone.',
  success: 'Payment Successful!',
  failed: 'Payment Failed',
};

export function PaymentStatusModal({ 
    stage, 
    isOpen, 
    onClose, 
    onRetry,
    error,
    orderPayload, 
    listingName,
    whatsappGroupLink,
    orderId,
    retryCount,
}: { 
    stage: PaymentStage,
    isOpen: boolean; 
    onClose: () => void; 
    onRetry: () => void;
    error: string | null;
    orderPayload: OrderPayload, 
    listingName: string,
    whatsappGroupLink?: string;
    orderId: string | null,
    retryCount: number,
}) {
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmittingRating, startSubmittingRating] = useState(false);

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
                    <div className="text-center space-y-4">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                        <DialogTitle>{stageMessages.success}</DialogTitle>
                        <DialogDescription>
                            Thank you, {orderPayload.userName}! Your tickets for <strong>{listingName}</strong> are ready.
                        </DialogDescription>
                         {whatsappGroupLink && (
                            <a href={whatsappGroupLink} target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" className="w-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900">
                                    <MessageSquare className="mr-2 h-5 w-5" /> Join the WhatsApp Group
                                </Button>
                            </a>
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
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    {/* Header is part of the conditional content */}
                </DialogHeader>
                {renderContent()}
                 <DialogFooter>
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
