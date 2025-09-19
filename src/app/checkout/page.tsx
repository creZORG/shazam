
'use client';

import { Suspense, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Smartphone, Loader2, Tag, User, Minus, Plus, CircleHelp } from 'lucide-react';
import { getListingById, getSettings, logUserEvent } from '@/app/actions';
import type { Event, Tour, SiteSettings, TicketDefinition } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAffiliateData } from '@/hooks/use-affiliate-tracking';
import { validatePromocode } from './actions';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { PaymentStatusModal, type PaymentStage } from './_components/PaymentStatusModal';
import { createOrderAndInitiatePayment, getTransactionStatus, initiatePaymentForOrder, type OrderPayload } from './order-actions';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Listing = Event | Tour;
type ListingType = 'event' | 'tour';
type PaymentType = 'full' | 'booking';

type TicketQuantities = { [key: string]: number };

type Discount = {
    type: 'percentage' | 'fixed';
    value: number;
    code: string;
}

// Helper to format phone number for display
const formatPhoneNumberForDisplay = (phone: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('254')) {
        cleaned = '0' + cleaned.substring(3);
    }
    return cleaned;
};


function CheckoutComponent() {
  const { user, dbUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const affiliateData = useAffiliateData();

  const listingId = searchParams.get('eventId') || searchParams.get('tourId');
  const listingType: ListingType = searchParams.has('tourId') ? 'tour' : 'event';
  const paymentType: PaymentType = (searchParams.get('paymentType') as PaymentType) || 'full';
  
  const ticketsParam = searchParams.get('tickets');

  const [listing, setListing] = useState<Listing | null>(null);
  const [quantities, setQuantities] = useState<TicketQuantities>({});
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Payment state lifted from modal
  const [paymentStage, setPaymentStage] = useState<PaymentStage>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const paymentInitiated = useRef(false);

  useEffect(() => {
    const currentListingId = searchParams.get('eventId') || searchParams.get('tourId');
    return () => {
      if (!paymentInitiated.current && user && currentListingId && (searchParams.has('eventId'))) {
        logUserEvent({
          uid: user.uid,
          action: 'abandon_checkout',
          eventId: currentListingId,
          timestamp: Date.now(),
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleApplyPromoCode = useCallback(async (code: string) => {
    if (!listingId || !code) return;
    setIsApplyingPromo(true);
    setPromoCodeError(null);

    const result = await validatePromocode(code, listingId);
    
    if (result.success && result.discountType && result.discountValue) {
        setDiscount({ type: result.discountType, value: result.discountValue, code: code });
        toast({ title: "Promo Code Applied!", description: `Your discount has been applied successfully.` });
    } else {
        setPromoCodeError(result.error || 'Invalid promo code.');
        setDiscount(null);
    }
    setIsApplyingPromo(false);
  }, [listingId, toast]);

  const handleQuantityChange = (ticketName: string, delta: number) => {
    setQuantities(prev => {
        const currentQuantity = prev[ticketName] || 0;
        const newQuantity = Math.max(0, currentQuantity + delta);
        
        const event = listing as Event;
        const ticketDef = event.tickets?.find(t => t.name === ticketName);
        if (ticketDef && newQuantity > ticketDef.quantity) {
            toast({ variant: 'destructive', title: 'Limit Reached', description: `Only ${ticketDef.quantity} tickets of this type are available.`});
            return { ...prev, [ticketName]: ticketDef.quantity };
        }
        return { ...prev, [ticketName]: newQuantity };
    });
  };

  useEffect(() => {
    if (dbUser) {
        setPhoneNumber(formatPhoneNumberForDisplay(dbUser.phone || ''));
        setAttendeeName(dbUser.fullName || dbUser.name || '');
        setAttendeeEmail(dbUser.email || '');
    }
  }, [dbUser]);

  // Effect for initial data loading
  useEffect(() => {
    if (!listingId) {
      setError("Missing event or tour information.");
      setLoading(false);
      return;
    }

    if (listingType === 'event' && !ticketsParam) {
      setError("Missing ticket information. Please go back and select your tickets.");
      setLoading(false);
      return;
    }

    // Set initial quantities from URL params
    let initialQuantities: TicketQuantities = {};
    try {
      if (listingType === 'event' && ticketsParam) {
        initialQuantities = JSON.parse(decodeURIComponent(ticketsParam));
        setQuantities(initialQuantities);
      } else if (listingType === 'tour') {
        initialQuantities = { 'tour_booking': 1 };
        setQuantities(initialQuantities);
      }
    } catch (e) {
      setError("Invalid ticket data in URL.");
      setLoading(false);
      return;
    }

    // Fetch listing and settings
    Promise.all([
      getListingById(listingType, listingId),
      getSettings()
    ]).then(([listingResult, settingsResult]) => {
      if (listingResult.error || !listingResult.data) {
        setError(listingResult.error || 'Listing not found.');
      } else {
        const fetchedListing = listingResult.data as Listing;
        setListing(fetchedListing);
        if (user && fetchedListing.organizerId !== user.uid) { // Don't log if organizer is viewing
          logUserEvent({
              uid: user.uid,
              action: 'start_checkout',
              eventId: listingId,
              timestamp: Date.now(),
              ticketDetails: fetchedListing.tickets?.filter(t => initialQuantities[t.name] > 0).map(t => ({ name: t.name, quantity: initialQuantities[t.name] })),
          });
        }
      }

      if (settingsResult.error || !settingsResult.settings) {
        toast({ variant: 'destructive', title: "Could not load settings", description: "Default fees will be applied." });
      }
      setSettings(settingsResult.settings);

    }).catch(e => {
      console.error("Failed to load checkout data:", e);
      setError(e.message || "Could not load your order. Please try again.");
    }).finally(() => {
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, listingType, ticketsParam, user, toast]);


  // Effect for handling affiliate data
  useEffect(() => {
      if (affiliateData?.code && affiliateData.code !== 'N/A_TRACKING_LINK' && affiliateData.listingId === listingId) {
          setPromoCode(affiliateData.code);
          handleApplyPromoCode(affiliateData.code);
      }
  }, [affiliateData, listingId, handleApplyPromoCode]);


  const { subtotal, quantityDiscountAmount, promoDiscountAmount, platformFee, processingFee, finalTotal, selectedTickets, hasSelection } = useMemo(() => {
    if (!listing) return { subtotal: 0, quantityDiscountAmount: 0, promoDiscountAmount: 0, platformFee: 0, processingFee: 0, finalTotal: 0, selectedTickets: [], hasSelection: false };

    let currentSubtotal = 0;
    const selected: {name: string, quantity: number, price: number}[] = [];
    let selectionMade = false;
    let quantityDiscount = 0;

    if (listingType === 'event') {
        const event = listing as Event;
        for (const ticketName in quantities) {
            const quantity = quantities[ticketName];
            if (quantity > 0) {
                selectionMade = true;
                const ticketDef = event.tickets?.find(t => t.name === ticketName);
                if (ticketDef) {
                    const originalPrice = ticketDef.price * quantity;
                    currentSubtotal += originalPrice;
                    selected.push({ name: ticketDef.name, quantity: quantity, price: ticketDef.price });
                    
                    // Calculate quantity discount
                    if (ticketDef.discountQuantity && ticketDef.discountPercentage && quantity >= ticketDef.discountQuantity) {
                        quantityDiscount += originalPrice * (ticketDef.discountPercentage / 100);
                    }
                }
            }
        }
    } else { // Tour
        selectionMade = true;
        const tour = listing as Tour;
        if (paymentType === 'booking') {
            currentSubtotal = tour.bookingFee;
        } else {
            currentSubtotal = tour.price;
        }
        selected.push({ name: `${tour.name} - ${paymentType === 'booking' ? 'Booking' : 'Full Payment'}`, quantity: 1, price: currentSubtotal });
    }
    
    // Apply quantity discount first
    let subtotalAfterQuantityDiscount = currentSubtotal - quantityDiscount;

    let calculatedPromoDiscount = 0;
    if (discount) {
        if (discount.type === 'percentage') {
            calculatedPromoDiscount = subtotalAfterQuantityDiscount * (discount.value / 100);
        } else { // fixed
            calculatedPromoDiscount = Math.min(subtotalAfterQuantityDiscount, discount.value);
        }
    }

    const subtotalAfterAllDiscounts = subtotalAfterQuantityDiscount - calculatedPromoDiscount;
    const platformFeePercent = settings?.platformFee ?? 5;
    const processingFeePercent = settings?.processingFee ?? 2.5;
    const calculatedPlatformFee = subtotalAfterAllDiscounts * (platformFeePercent / 100);
    const calculatedProcessingFee = subtotalAfterAllDiscounts * (processingFeePercent / 100);

    let total = subtotalAfterAllDiscounts + calculatedPlatformFee;
    if (settings?.processingFeePayer === 'customer') {
        total += calculatedProcessingFee;
    }
    
    return { 
        subtotal: currentSubtotal, 
        quantityDiscountAmount: quantityDiscount, 
        promoDiscountAmount: calculatedPromoDiscount, 
        platformFee: Math.ceil(calculatedPlatformFee), 
        processingFee: Math.ceil(calculatedProcessingFee), 
        finalTotal: Math.ceil(total), 
        selectedTickets: selected, 
        hasSelection: selectionMade 
    };
  }, [listing, quantities, discount, settings, listingType, paymentType]);

  const orderPayload: OrderPayload = useMemo(() => ({
    userId: user?.uid,
    userName: attendeeName,
    userEmail: attendeeEmail,
    listingId: listing?.id || '',
    organizerId: listing?.organizerId || '',
    listingType,
    paymentType,
    tickets: selectedTickets,
    subtotal,
    discount: quantityDiscountAmount + promoDiscountAmount,
    platformFee,
    processingFee,
    total: finalTotal,
    promocode: discount?.code,
    trackingLinkId: affiliateData?.trackingLinkId,
    phoneNumber,
    channel: affiliateData?.channel || 'direct',
  }), [user?.uid, attendeeName, attendeeEmail, listing?.id, listing?.organizerId, listingType, paymentType, selectedTickets, subtotal, quantityDiscountAmount, promoDiscountAmount, platformFee, processingFee, finalTotal, discount?.code, affiliateData, phoneNumber]);


  const startPaymentProcess = useCallback(async (isRetry = false) => {
    setPaymentStage('creating_order');
    setPaymentError(null);
    
    try {
        let currentOrderId = orderId;
        let currentTransactionId = transactionId;

        if (!isRetry || !currentOrderId || !currentTransactionId) {
            const orderResult = await createOrderAndInitiatePayment(orderPayload);
            if (!orderResult.success || !orderResult.orderId || !orderResult.transactionId) {
                throw new Error(orderResult.error || 'Failed to create order.');
            }
            setOrderId(orderResult.orderId);
            setTransactionId(orderResult.transactionId);
            currentOrderId = orderResult.orderId;
            currentTransactionId = orderResult.transactionId;
        }
        
        setPaymentStage('sending_stk');
        const stkResult = await initiatePaymentForOrder(currentOrderId, currentTransactionId, orderPayload.phoneNumber, orderPayload.total);
        if (!stkResult.success) {
            throw new Error(stkResult.error || 'Failed to send STK push.');
        }

        setPaymentStage('awaiting_payment');
    } catch (e: any) {
        setPaymentError(e.message);
        setPaymentStage('failed');
    }
  }, [orderPayload, orderId, transactionId]);


   // Polling for transaction status
    useEffect(() => {
        if (paymentStage === 'awaiting_payment' && transactionId) {
            const interval = setInterval(async () => {
                const statusResult = await getTransactionStatus(transactionId);
                if (statusResult.success) {
                    if (statusResult.status === 'completed') {
                        setPaymentStage('success');
                        clearInterval(interval);
                    } else if (statusResult.status === 'failed') {
                        setPaymentError(statusResult.failReason || 'Payment was not completed.');
                        setRetryCount(statusResult.retryCount || 0);
                        setPaymentStage('failed');
                        clearInterval(interval);
                    }
                }
            }, 3000); // Poll every 3 seconds

            return () => clearInterval(interval);
        }
    }, [paymentStage, transactionId]);

  const handleOpenPaymentModal = async () => {
    if (!phoneNumber || !attendeeEmail || !attendeeName) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out your name, email, and phone number.' });
        return;
    }
     if (!listing?.organizerId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Organizer information is missing.' });
        return;
    }

    if (user) paymentInitiated.current = true;
    startPaymentProcess();
  }
  
  const handleRetry = () => {
      startPaymentProcess(true);
  };


  if (loading) return <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12"><Skeleton className="h-96 w-full" /></div>;
  if (error) return <div className="text-center py-20 text-destructive">{error}</div>;
  if (!listing) return <div className="text-center py-20 text-muted-foreground">Could not find listing details.</div>;

  return (
    <>
    {paymentStage && (
      <PaymentStatusModal
        isOpen={!!paymentStage}
        onClose={() => setPaymentStage(null)}
        stage={paymentStage}
        error={paymentError}
        orderPayload={orderPayload}
        listingName={listing.name}
        whatsappGroupLink={(listing as Event).whatsappGroupLink}
        orderId={orderId}
        retryCount={retryCount}
        onRetry={handleRetry}
      />
    )}
    <div className="min-h-screen bg-muted/20">
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="grid md:grid-cols-5 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
        {/* Left Column: Order Summary */}
        <div className="md:col-span-3 lg:col-span-2 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Confirm your order</h1>
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader className="flex-row items-start gap-4">
                    <Image src={listing.imageUrl} alt={listing.name} width={100} height={100} className="rounded-lg aspect-square object-cover" />
                    <div>
                        <CardTitle className="text-2xl">{listing.name}</CardTitle>
                        <CardDescription>
                            {(listing as Event).date ? new Date((listing as Event).date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date not set'}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                {selectedTickets.map(ticket => (
                    <div className="flex justify-between items-center" key={ticket.name}>
                        <div>
                            <p className="font-semibold">{ticket.name}</p>
                            <p className="text-sm text-muted-foreground">Ksh {ticket.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleQuantityChange(ticket.name, -1)}><Minus className="h-4 w-4" /></Button>
                             <span className="font-bold w-8 text-center">{ticket.quantity}</span>
                             <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleQuantityChange(ticket.name, 1)}><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm"><p className="text-muted-foreground">Subtotal</p><p className="font-medium">Ksh {subtotal.toLocaleString()}</p></div>
                {quantityDiscountAmount > 0 && (<div className="flex justify-between text-sm text-green-500"><p>Quantity Discount</p><p className="font-medium">-Ksh {quantityDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>)}
                {discount && (<div className="flex justify-between text-sm text-green-500"><p>Discount ({discount.code})</p><p className="font-medium">-Ksh {promoDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>)}
                <div className="flex justify-between text-sm"><p className="text-muted-foreground">Platform Fee</p><p className="font-medium">Ksh {platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                {settings?.processingFeePayer === 'customer' && (<div className="flex justify-between text-sm"><p className="text-muted-foreground">Processing Fee</p><p className="font-medium">Ksh {processingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>)}
                <Separator />
                <div className="flex justify-between font-bold text-lg"><p>Total</p><p>Ksh {finalTotal.toLocaleString()}</p></div>
                </CardContent>
                <CardFooter>
                    <div className="flex gap-2 w-full">
                        <Input placeholder="Promo Code" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} />
                        <Button variant="outline" onClick={() => handleApplyPromoCode(promoCode)} disabled={isApplyingPromo || !promoCode}>
                            {isApplyingPromo ? <Loader2 className="animate-spin" /> : <Tag className="mr-2"/>}
                             Apply
                        </Button>
                    </div>
                    {promoCodeError && <p className="text-sm text-destructive mt-2">{promoCodeError}</p>}
                </CardFooter>
            </Card>
        </div>

        {/* Right Column: User Details and Payment */}
        <div className="md:col-span-2 lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader><CardTitle>Your Details & Payment</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" value={attendeeName} onChange={e => setAttendeeName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={attendeeEmail} onChange={e => setAttendeeEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input id="phone" type="tel" placeholder="0712345678" value={phoneNumber} onChange={e => setPhoneNumber(formatPhoneNumberForDisplay(e.target.value))} />
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-2">
                 <Button className="w-full bg-gradient-to-r from-primary to-accent text-white" size="lg" disabled={!hasSelection} onClick={handleOpenPaymentModal}>
                    Pay Ksh {finalTotal.toLocaleString()}
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" size="sm" className="text-muted-foreground">or pay manually</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><CircleHelp />Manual Payment Instructions</DialogTitle>
                      <DialogDescription>
                          <div className="pt-4 text-sm text-left bg-muted p-4 rounded-md">
                                <p className="mt-2">To complete your purchase manually, please follow these steps:</p>
                                <ol className="list-decimal list-inside space-y-1 mt-2">
                                    <li>Go to M-Pesa Menu on your phone</li>
                                    <li>Select "Lipa na M-Pesa"</li>
                                    <li>Select "Pay Bill"</li>
                                    <li>Enter Business No: <strong>{process.env.NEXT_PUBLIC_MPESA_SHORTCODE || 'XXXXXX'}</strong></li>
                                    <li>Enter Account No: <strong>{orderId || 'NAKSYETU'}</strong></li>
                                    <li>Enter Amount: <strong>Ksh {finalTotal}</strong></li>
                                    <li>Enter your M-Pesa PIN and confirm</li>
                                </ol>
                                <p className="mt-2 text-xs">Your tickets will be sent via email once we confirm the payment. An order must be initiated first for an account number to be generated.</p>
                            </div>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>

                <p className="text-xs text-muted-foreground text-center px-4 pt-2">
                    By clicking pay, you agree to our <Link href="/terms-of-service" target="_blank" className="underline hover:text-primary">Terms of Service</Link> and <Link href="/refund-policy" target="_blank" className="underline hover:text-primary">Refund Policy</Link>.
                </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
    </div>
    </>
  );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <CheckoutComponent />
        </Suspense>
    )
}
