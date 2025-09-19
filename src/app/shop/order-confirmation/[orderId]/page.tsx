
'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { MerchOrder } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

function ConfirmationSkeleton() {
    return (
        <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
            <Card>
                <CardHeader className="items-center text-center">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-8 w-48 mt-4" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function MerchOrderConfirmationPage({ params }: { params: { orderId: string } }) {
    const [order, setOrder] = useState<MerchOrder | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.orderId) {
            const orderRef = doc(db, 'merchOrders', params.orderId);
            getDoc(orderRef).then(docSnap => {
                if (docSnap.exists()) {
                    setOrder({ id: docSnap.id, ...docSnap.data() } as MerchOrder);
                } else {
                    notFound();
                }
                setLoading(false);
            }).catch(() => {
                setLoading(false);
                notFound();
            });
        }
    }, [params.orderId]);

    if (loading) {
        return <ConfirmationSkeleton />;
    }

    if (!order) {
        notFound();
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
            <Card>
                <CardHeader className="items-center text-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <CardTitle className="text-3xl mt-4">Order Confirmed!</CardTitle>
                    <CardDescription>Thank you, {order.userName}. Your merchandise is ready for pickup.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-8 border-4 border-dashed border-primary rounded-lg text-center bg-muted/30">
                        <p className="text-muted-foreground">Present this code for pickup:</p>
                        <p className="text-5xl font-extrabold tracking-widest text-primary font-mono my-4">{order.confirmationCode}</p>
                        <p className="text-xs text-muted-foreground">Order ID: {order.id}</p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Order Summary:</h3>
                        <div className="space-y-2">
                            {order.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted rounded-md">
                                    <div>
                                        <p className="font-medium">{item.productName} (x{item.quantity})</p>
                                        <p className="text-xs text-muted-foreground">{item.size && `${item.size}`} {item.color && `/ ${item.color}`}</p>
                                    </div>
                                    <p>Ksh {item.price.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex justify-between font-bold text-lg pt-4 border-t">
                        <span>Total Paid</span>
                        <span>Ksh {order.total.toLocaleString()}</span>
                    </div>

                    <div className="text-center text-muted-foreground text-sm pt-4">
                        <p>You can pick up your order at any official NaksYetu event by presenting your confirmation code to a staff member.</p>
                        <Link href="/shop">
                            <Button variant="outline" className="mt-6">
                                <ShoppingBag className="mr-2" /> Continue Shopping
                            </Button>
                        </Link>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
