

'use client';

import { notFound, useRouter } from 'next/navigation';
import { getPromocodeById, updatePromocodeStatus, updatePromocodeExpiry } from './actions';
import { useEffect, useState, useTransition } from 'react';
import type { Promocode } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, DollarSign, Tag, Users, AlertTriangle, Ban, CalendarCheck, CalendarX } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type PromocodeWithInfluencer = Promocode & { influencerName?: string };

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
    active_pending: { variant: 'secondary', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Pending Influencer Acceptance' },
    active_accepted: { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Active' },
    expired: { variant: 'outline', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Expired' },
    void: { variant: 'destructive', className: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Void' },
    limit_reached: { variant: 'outline', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Usage Limit Reached' },
};

function getPromocodeStatus(code: Promocode) {
    if (!code.isActive) return 'void';
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return 'expired';
    if (code.usageLimit > 0 && code.usageCount >= code.usageLimit) return 'limit_reached';
    if (code.influencerId && code.influencerStatus !== 'accepted') return 'active_pending';
    return 'active_accepted';
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
}

function ManagePromocode({ promocode }: { promocode: Promocode }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [newExpiry, setNewExpiry] = useState<string>('');

    const handleVoid = () => {
        startTransition(async () => {
            const result = await updatePromocodeStatus(promocode.id, false);
            if (result.success) {
                toast({ title: "Promocode Voided", description: `The code ${promocode.code} is now inactive.`});
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };
    
    const handleExtend = () => {
        if (!newExpiry) {
            toast({ variant: 'destructive', title: 'Invalid Date', description: 'Please select a new expiry date.'});
            return;
        }
        startTransition(async () => {
            const result = await updatePromocodeExpiry(promocode.id, new Date(newExpiry).toISOString());
             if (result.success) {
                toast({ title: "Expiry Date Updated", description: `The code now expires on ${format(new Date(newExpiry), 'PPP')}.`});
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Promocode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="expiry-date">Extend Expiry Date</Label>
                    <div className="flex gap-2">
                         <Input id="expiry-date" type="date" onChange={(e) => setNewExpiry(e.target.value)} />
                         <Button variant="outline" onClick={handleExtend} disabled={isPending || !newExpiry}>
                            {isPending ? <Loader2 className="animate-spin" /> : <CalendarCheck />}
                         </Button>
                    </div>
                 </div>

                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full" disabled={!promocode.isActive}>
                            <Ban className="mr-2"/> Void Promocode
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to void this promocode?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action is irreversible. The code will become inactive and can no longer be used for discounts.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleVoid} disabled={isPending} asChild>
                                <Button variant="destructive">{isPending && <Loader2 className="animate-spin mr-2"/>}Yes, Void</Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}


export default function PromocodeManagementPage({ params }: { params: { id: string } }) {
    const [promocode, setPromocode] = useState<PromocodeWithInfluencer | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        getPromocodeById(params.id).then(result => {
            if (result.success && result.data) {
                setPromocode(result.data as PromocodeWithInfluencer);
            } else {
                notFound();
            }
            setLoading(false);
        });
    }, [params.id]);

    if (loading || !promocode) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const status = getPromocodeStatus(promocode);
    const statusInfo = statusConfig[status];
    const discount = promocode.discountType === 'percentage' ? `${promocode.discountValue}%` : `Ksh ${promocode.discountValue}`;
    const commission = (promocode.commissionType && promocode.commissionValue) 
        ? (promocode.commissionType === 'percentage' ? `${promocode.commissionValue}%` : `Ksh ${promocode.commissionValue}`)
        : 'N/A';

    const createdAtDate = new Date(promocode.createdAt ? (promocode.createdAt as any).seconds * 1000 : Date.now());

    const totalDiscounted = promocode.revenueGenerated && promocode.discountType === 'percentage'
        ? promocode.revenueGenerated * (promocode.discountValue / (100 - promocode.discountValue))
        : (promocode.discountType === 'fixed' ? promocode.usageCount * promocode.discountValue : 0);

    return (
        <div className="space-y-8">
             <Link href="/organizer/promocodes" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2" /> Back to All Promocodes
            </Link>

            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                     <p className="font-mono text-3xl font-bold text-primary">{promocode.code}</p>
                     <p className="text-muted-foreground">For: <span className="font-semibold text-foreground">{promocode.listingName}</span></p>
                     <p className="text-muted-foreground">Influencer: <span className="font-semibold text-foreground">{promocode.influencerName || 'N/A'}</span></p>
                </div>
                 <Badge variant={statusInfo.variant} className={`${statusInfo.className} text-base`}>{statusInfo.label}</Badge>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Uses" value={`${promocode.usageCount} / ${promocode.usageLimit}`} icon={Users} />
                <StatCard title="Total Amount Discounted" value={`Ksh ${totalDiscounted.toLocaleString()}`} icon={Tag} />
                <StatCard title="Total Revenue Generated" value={`Ksh ${(promocode.revenueGenerated || 0).toLocaleString()}`} icon={DollarSign} />
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Expiry</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <p className="text-2xl font-bold">{promocode.expiresAt ? format(new Date(promocode.expiresAt), 'PPP') : 'Never'}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Discount</span>
                                <span className="font-semibold">{discount}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Influencer Commission</span>
                                <span className="font-semibold">{commission}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Created On</span>
                                <span className="font-semibold">{format(createdAtDate, 'PPP')}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Listing Type</span>
                                <span className="font-semibold capitalize">{promocode.listingType}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <ManagePromocode promocode={promocode} />
                </div>
            </div>
        </div>
    )
}
