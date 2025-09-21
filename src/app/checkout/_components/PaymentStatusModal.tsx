
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Wallet, Ticket, CircleHelp, MessageSquare, List, Gift, Phone, ArrowRight } from 'lucide-react';
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

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor" />
  </svg>
);


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
    contactPhone,
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
    contactPhone?: string | null;
}) {
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmittingRating, startSubmittingRating] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

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
        // Do not close modal after feedback
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
                            Thank you, {orderPayload.userName}! Your tickets have been sent to <span className="font-semibold text-foreground">{orderPayload.userEmail}</span>.
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
                             {rating > 0 && (
                                 <Button onClick={handleRatingSubmit} disabled={isSubmittingRating}>
                                    {isSubmittingRating && <Loader2 className="animate-spin mr-2" />}
                                    Submit Feedback
                                </Button>
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
                        {retryCount < 1 ? (
                             <div className="pt-4">
                                <p className="text-sm text-muted-foreground mb-2">Would you like to try again?</p>
                                <Button onClick={onRetry}>Try Again</Button>
                            </div>
                        ) : (
                             <div className="pt-4 space-y-4 text-sm text-muted-foreground text-left bg-muted p-4 rounded-md">
                                <h4 className="font-semibold text-foreground flex items-center gap-2"><CircleHelp />Manual Payment & Support</h4>
                                <p>It seems there's an issue with automated payments. You can pay manually or contact us for help.</p>
                                <div className="p-4 bg-background/50 rounded-md">
                                    <h5 className="font-bold">Manual Payment</h5>
                                    <ol className="list-decimal list-inside space-y-1 mt-2">
                                        <li>Go to M-Pesa Menu &gt; Lipa na M-Pesa &gt; Pay Bill</li>
                                        <li>Business No: <strong>{process.env.NEXT_PUBLIC_MPESA_SHORTCODE || 'XXXXXX'}</strong></li>
                                        <li>Account No: <strong>{orderId || 'ERROR'}</strong></li>
                                        <li>Amount: <strong>Ksh {orderPayload.total}</strong></li>
                                    </ol>
                                    <p className="mt-2 text-xs">Your tickets will be sent via email once we confirm payment.</p>
                                </div>
                                {contactPhone && (
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <a href={`tel:${contactPhone}`} className="w-full">
                                            <Button variant="outline" className="w-full"><Phone className="mr-2"/> Call Us</Button>
                                        </a>
                                        <a href={`https://wa.me/${contactPhone.replace('0','254')}`} target="_blank" rel="noopener noreferrer" className="w-full">
                                            <Button variant="outline" className="w-full"><WhatsAppIcon className="mr-2 h-4 w-4 fill-current"/> WhatsApp</Button>
                                        </a>
                                    </div>
                                )}
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
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()} className={stage === 'success' ? 'sm:max-w-lg' : 'sm:max-w-md'}>
                    <DialogHeader>
                        {/* Header is part of the conditional content */}
                    </DialogHeader>
                    {renderContent()}
                     <DialogFooter className="pt-4">
                        <div className="flex justify-center gap-2 w-full">
                            {stage === 'success' && (
                                <>
                                    <Button variant="outline" onClick={() => setConfirmCloseOpen(true)}>Close</Button>
                                    <Link href={`/ticket-center?orderId=${orderId}`} legacyBehavior>
                                        <a target="_blank"><Button className="bg-gradient-to-r from-primary to-accent text-white"><Ticket className="mr-2" /> View My Tickets <ArrowRight className="ml-2" /></Button></a>
                                    </Link>
                                </>
                            )}
                            {(stage === 'failed') && (
                                <Button variant="outline" onClick={() => setConfirmCloseOpen(true)}>Close</Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to close this window?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your tickets have been sent to your email. You can always view them later from your profile or the link in the email.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Stay</AlertDialogCancel>
                        <AlertDialogAction onClick={onClose}>Yes, close</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
