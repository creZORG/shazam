
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo, useTransition } from "react";
import { getPromocodesByOrganizer } from "@/app/organizer/promocodes/actions";
import { getPublishedEvents, getPublishedTours, getWelcomeGiftAnalytics } from "../actions";
import type { Promocode, Event, Tour, TrackingLink } from "@/lib/types";
import { QrCode, Download, Link as LinkIcon, PlusCircle, Copy, BarChart, Ticket, Loader2, Eye, Gift, Users, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createTrackingLink } from "@/app/influencer/campaigns/[id]/actions";
import { createPromocode } from "@/app/organizer/promocodes/actions";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger, DialogFooter, DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";


type Listing = { id: string; name: string; type: 'event' | 'tour' };
type AnalyticsData = Awaited<ReturnType<typeof getWelcomeGiftAnalytics>>['data'];

function WelcomeGiftAnalytics({ data }: { data: AnalyticsData }) {
    if (!data) return null;
    return (
        <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-2xl font-bold">{data.claimed}</p>
                    <p className="text-sm text-muted-foreground">Claimed</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">{data.used}</p>
                    <p className="text-sm text-muted-foreground">Used</p>
                </div>
                <div>
                    <p className="text-2xl font-bold">Ksh {data.revenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
            </div>
        </CardContent>
    );
}

function WelcomeGiftForm() {
    const { toast } = useToast();
    const [isSaving, startSaving] = useTransition();
    const [listings, setListings] = useState<Listing[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    
    // State for the form
    const [discountValue, setDiscountValue] = useState(15);
    const [expiresInDays, setExpiresInDays] = useState(30);
    const [listingId, setListingId] = useState('all');

     useEffect(() => {
        getWelcomeGiftAnalytics().then(res => {
            if (res.success) setAnalytics(res.data || null)
        });
        Promise.all([
            getPublishedEvents(),
            getPublishedTours()
        ]).then(([eventsRes, toursRes]) => {
            const fetchedListings: Listing[] = [];
            if(eventsRes.success && eventsRes.data) {
                fetchedListings.push(...eventsRes.data.map(e => ({ ...e, type: 'event' as const })));
            }
            if(toursRes.success && toursRes.data) {
                fetchedListings.push(...toursRes.data.map(t => ({ ...t, type: 'tour' as const })));
            }
            setListings(fetchedListings);
        });
    }, []);

    const handleSaveWelcomeGift = () => {
        startSaving(async () => {
             const selectedListing = listings.find(l => l.id === listingId);
             const result = await createPromocode({
                organizerId: 'NAKSYETU_SYSTEM',
                code: 'NAKSYETU_WELCOME_GIFT',
                discountType: 'percentage',
                discountValue: discountValue,
                usageLimit: 999999, // Effectively infinite for a template
                expiresAt: null, // User-specific coupon will have expiry
                listingType: listingId === 'all' ? 'all' : (selectedListing?.type || 'all'),
                listingId: listingId === 'all' ? undefined : listingId,
                listingName: listingId === 'all' ? 'All Listings' : (selectedListing?.name || 'All Listings'),
             });

            if (result.success) {
                toast({ title: "Welcome Gift Updated!", description: `New users will now receive a ${discountValue}% discount.` });
            } else {
                 toast({ variant: 'destructive', title: "Update Failed", description: result.error });
            }
        });
    }

    return (
        <Card className="border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gift className="text-primary"/> New User Welcome Gift</CardTitle>
                <CardDescription>Configure the automatic coupon that new users receive when they sign up.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label>Discount Percentage</Label>
                        <Input type="number" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} placeholder="e.g., 15" />
                    </div>
                     <div className="space-y-2">
                        <Label>Expires in (days for user)</Label>
                        <Input type="number" value={expiresInDays} onChange={e => setExpiresInDays(Number(e.target.value))} placeholder="e.g., 30" />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label>Applies To</Label>
                    <Select onValueChange={setListingId} value={listingId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Events & Tours</SelectItem>
                            {listings.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.type})</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <Button onClick={handleSaveWelcomeGift} disabled={isSaving} className="w-full">
                    {isSaving && <Loader2 className="animate-spin mr-2" />}
                    Save Welcome Gift
                </Button>
            </CardContent>
            {analytics && <WelcomeGiftAnalytics data={analytics} />}
        </Card>
    );
}

function GeneralCouponForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [isSaving, startSaving] = useTransition();
    const [listings, setListings] = useState<Listing[]>([]);
    
    const form = useForm({
        defaultValues: {
            code: "",
            discountType: "percentage" as "percentage" | "fixed",
            discountValue: 10,
            usageLimit: 1,
            expiresAt: undefined as Date | undefined,
            listingId: "all",
        }
    });
    
     useEffect(() => {
        Promise.all([getPublishedEvents(), getPublishedTours()]).then(([eventsRes, toursRes]) => {
            const fetchedListings: Listing[] = [];
            if(eventsRes.success && eventsRes.data) fetchedListings.push(...eventsRes.data.map(e => ({ ...e, type: 'event' as const })));
            if(toursRes.success && toursRes.data) fetchedListings.push(...toursRes.data.map(t => ({ ...t, type: 'tour' as const })));
            setListings(fetchedListings);
        });
    }, []);

    const onSubmit = (values: any) => {
        startSaving(async () => {
            const selectedListing = listings.find(l => l.id === values.listingId);
            const result = await createPromocode({
                organizerId: 'NAKSYETU_SYSTEM',
                code: values.code.toUpperCase(),
                discountType: values.discountType,
                discountValue: values.discountValue,
                usageLimit: values.usageLimit,
                expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
                listingType: values.listingId === 'all' ? 'all' : selectedListing?.type || 'all',
                listingId: values.listingId === 'all' ? undefined : values.listingId,
                listingName: values.listingId === 'all' ? 'All Listings' : selectedListing?.name || 'All Listings',
            });
            if (result.success) {
                toast({ title: "General Coupon Created!" });
                router.push('/admin/promotions');
            } else {
                toast({ variant: 'destructive', title: "Creation Failed", description: result.error });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create General Coupon</CardTitle>
                <CardDescription>Create a public coupon code that any user can apply at checkout.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="code" render={({ field }) => (<FormItem><Label>Coupon Code</Label><FormControl><Input placeholder="e.g., HOLIDAY20" {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="usageLimit" render={({ field }) => (<FormItem><Label>Total Usage Limit</Label><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                             <FormField control={form.control} name="discountType" render={({ field }) => (<FormItem><Label>Discount Type</Label><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed (Ksh)</SelectItem></SelectContent></Select></FormItem>)} />
                            <FormField control={form.control} name="discountValue" render={({ field }) => (<FormItem><Label>Discount Value</Label><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                        </div>
                         <FormField control={form.control} name="listingId" render={({ field }) => (<FormItem><Label>Applies To</Label><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="all">All Listings</SelectItem>{listings.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                        <Button type="submit" disabled={isSaving} className="w-full">
                            {isSaving && <Loader2 className="animate-spin mr-2" />} Create General Coupon
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}


export default function CreateCampaignLinkPage() {
    return (
         <div className="space-y-8">
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold">Promotions</h1>
                  <Link href="/admin/promotions">
                    <Button variant="outline">View All Links & Codes</Button>
                </Link>
            </div>
            <div className="grid lg:grid-cols-2 gap-8 items-start">
                <WelcomeGiftForm />
                <GeneralCouponForm />
            </div>
        </div>
    )
}
