
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Smartphone, Loader2, AlertCircle } from 'lucide-react';
import { getProductById } from '@/app/admin/shop/actions';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { createMerchOrder, type MerchOrderPayload } from './actions';
import { PaymentStatusModal, type PaymentStage } from '@/app/checkout/_components/PaymentStatusModal';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

function CheckoutSkeleton() {
    return <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12"><div className="h-96 w-full animate-pulse rounded-lg bg-muted" /></div>;
}

function MerchCheckoutComponent() {
  const { user, dbUser } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const productId = searchParams.get('productId');
  const size = searchParams.get('size');
  const color = searchParams.get('color');
  const quantity = parseInt(searchParams.get('quantity') || '1', 10);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Payment state
  const [paymentStage, setPaymentStage] = useState<PaymentStage>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  
  useEffect(() => {
    if (dbUser) {
        setPhoneNumber(dbUser.phone || '');
        setAttendeeName(dbUser.fullName || dbUser.name || '');
        setAttendeeEmail(dbUser.email || '');
    }
  }, [dbUser]);

  useEffect(() => {
    if (!productId) {
      setError("No product selected.");
      setLoading(false);
      return;
    }

    getProductById(productId).then(result => {
        if (result.success && result.data) {
            if (result.data.stock <= 0) {
                setError("This item is out of stock and cannot be purchased.");
            }
            setProduct(result.data);
        } else {
            setError(result.error || 'Product not found.');
        }
        setLoading(false);
    });

  }, [productId]);

  const { subtotal, total } = useMemo(() => {
    if (!product) return { subtotal: 0, total: 0 };
    const sub = product.price * quantity;
    // For now, no extra fees for merch
    return { subtotal: sub, total: sub };
  }, [product, quantity]);

  const startPaymentProcess = async () => {
    if (!product || !attendeeName || !attendeeEmail || !phoneNumber) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all your details.' });
        return;
    }
    if (product.stock <= 0) {
        toast({ variant: 'destructive', title: 'Out of Stock', description: 'This item can no longer be purchased.' });
        return;
    }

    setPaymentStage('creating_order');
    const payload: MerchOrderPayload = {
        userName: attendeeName,
        userEmail: attendeeEmail,
        phoneNumber,
        items: [{
            productId: product.id,
            productName: product.name,
            size: size || '',
            color: color || '',
            quantity,
            price: product.price
        }],
        total
    };
    
    const result = await createMerchOrder(payload);

    if (result.success && result.orderId && result.transactionId) {
        setOrderId(result.orderId);
        setPaymentStage('awaiting_payment');
        // The rest of the STK push & polling is handled within the modal based on transaction status
    } else {
        setPaymentError(result.error || 'Failed to create order.');
        setPaymentStage('failed');
    }
  }


  if (loading) return <CheckoutSkeleton />;
  if (error && !product) return <div className="text-center py-20 text-destructive">{error}</div>; // Show error if product fails to load at all
  if (!product) return notFound();

  return (
    <>
      <PaymentStatusModal
        isOpen={!!paymentStage}
        onClose={() => setPaymentStage(null)}
        stage={paymentStage}
        error={paymentError}
        orderPayload={{ total } as any} // Simplified for merch
        listingName={product.name}
        orderId={orderId}
        retryCount={1} // Disable retry for now
        onRetry={() => {}} // No retry logic for now
      />
      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left Column: Order Summary */}
          <div className="space-y-8">
              <h1 className="text-3xl font-bold tracking-tight">Confirm your order</h1>
              <Card>
                  <CardHeader className="flex-row items-start gap-4">
                      <Image src={product.imageUrls[0]} alt={product.name} width={100} height={100} className="rounded-lg aspect-square object-cover" />
                      <div>
                          <CardTitle className="text-2xl">{product.name}</CardTitle>
                          <CardDescription>
                            {size && <Badge variant="secondary" className="mr-2">{size}</Badge>}
                            {color && <Badge variant="secondary" style={{ backgroundColor: color, color: '#fff' }}>{color}</Badge>}
                          </CardDescription>
                      </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="font-semibold">{product.name} (x{quantity})</p>
                          <p className="text-sm text-muted-foreground">Ksh {product.price.toLocaleString()}</p>
                      </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm"><p className="text-muted-foreground">Subtotal</p><p className="font-medium">Ksh {subtotal.toLocaleString()}</p></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg"><p>Total</p><p>Ksh {total.toLocaleString()}</p></div>
                  </CardContent>
              </Card>
          </div>

          {/* Right Column: User Details and Payment */}
          <div>
            <Card>
              <CardHeader><CardTitle>Your Details & Payment</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Item Out of Stock</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" value={attendeeName} onChange={e => setAttendeeName(e.target.value)} disabled={!!error} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={attendeeEmail} onChange={e => setAttendeeEmail(e.target.value)} disabled={!!error} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">M-Pesa Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="0712345678" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} disabled={!!error} />
                </div>
              </CardContent>
              <CardFooter className="flex-col items-stretch space-y-4">
                   <Button className="w-full bg-gradient-to-r from-primary to-accent text-white" size="lg" onClick={startPaymentProcess} disabled={!!error}>
                      Pay Ksh {total.toLocaleString()}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center px-4">
                      You will receive an order confirmation to present at NaksYetu events for pickup.
                  </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default function MerchCheckoutPage() {
    return (
        <Suspense fallback={<CheckoutSkeleton />}>
            <MerchCheckoutComponent />
        </Suspense>
    )
}
