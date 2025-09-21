
'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import type { Promocode, TrackingLink } from '@/lib/types';
import { createTrackingLink, getCampaignDetails } from './actions';
import { getPromocodeById } from '@/app/organizer/promocodes/[id]/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Tag, Users, Link as LinkIcon, Copy, PlusCircle, AlertTriangle, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useForm } from "react-hook-form";
import * as z from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


type PromocodeWithDetails = Promocode & { influencerName?: string };

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

const newLinkSchema = z.object({
  name: z.string().min(3, "Link name must be at least 3 characters."),
});

function ManageLinks({ campaign, initialLinks, status }: { campaign: Promocode, initialLinks: TrackingLink[], status: string }) {
    const { toast } = useToast();
    const [links, setLinks] = useState(initialLinks);
    const [isPending, startTransition] = useTransition();
    const [host, setHost] = useState('');
    const [protocol, setProtocol] = useState('');

    const isInactive = status === 'expired' || status === 'void' || status === 'limit_reached';

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHost(window.location.host);
            setProtocol(window.location.protocol);
        }
    }, []);

    const form = useForm<z.infer<typeof newLinkSchema>>({
        resolver: zodResolver(newLinkSchema),
        defaultValues: { name: '' },
    });

    const onSubmit = (values: z.infer<typeof newLinkSchema>) => {
        startTransition(async () => {
            const result = await createTrackingLink({
                promocodeId: campaign.id,
                listingId: campaign.listingId,
                listingType: campaign.listingType,
                name: values.name,
            });

            if (result.success && result.data) {
                setLinks(prev => [result.data!, ...prev]);
                toast({ title: "Tracking Link Created!" });
                form.reset();
            } else {
                 toast({ variant: 'destructive', title: "Error", description: result.error });
            }
        });
    }
    
    const handleCopyLink = (shortId: string) => {
        const fullLink = `${protocol}//${host}/l/${shortId}`;
        navigator.clipboard.writeText(fullLink);
        toast({ title: 'Link Copied!' });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tracking Links</CardTitle>
                <CardDescription>Create unique links for different platforms to track your performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isInactive ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Campaign Inactive</AlertTitle>
                        <AlertDescription>
                            This campaign is no longer active, so you cannot create new tracking links.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
                            <FormField control={form.control} name="name" render={({field}) => (
                                <FormItem className="flex-grow"><FormLabel>Link Name</FormLabel><FormControl><Input placeholder="e.g., Instagram Story" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : <PlusCircle />}<span className="hidden sm:inline ml-2">Create Link</span></Button>
                        </form>
                    </Form>
                )}
                
                 <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Short Link</TableHead><TableHead>Clicks</TableHead><TableHead>Purchases</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {links.map(link => (
                            <TableRow key={link.id}>
                                <TableCell className="font-medium">{link.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm">{`${host}/l/${link.shortId}`}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyLink(link.shortId)}><Copy className="h-4 w-4" /></Button>
                                    </div>
                                </TableCell>
                                <TableCell>{link.clicks}</TableCell>
                                <TableCell>{link.purchases}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
                 {links.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No tracking links created yet.</p>}

            </CardContent>
        </Card>
    );
}

export default function CampaignManagementPage() {
    const params = useParams();
    const id = params.id as string;
    const [promocode, setPromocode] = useState<PromocodeWithDetails | null>(null);
    const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (id) {
            getPromocodeById(id).then(result => {
                if (result.success && result.data) {
                    setPromocode(result.data as PromocodeWithDetails);
                    getCampaignDetails(id).then(detailsResult => {
                        if (detailsResult.success && detailsResult.data) {
                            setTrackingLinks(detailsResult.data.trackingLinks);
                        }
                         setLoading(false);
                    })
                } else {
                    setLoading(false);
                    notFound();
                }
            });
        }
    }, [id]);

    if (loading || !promocode) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const status = getPromocodeStatus(promocode);
    const statusInfo = statusConfig[status];
    const discount = promocode.discountType === 'percentage' ? `${promocode.discountValue}%` : `Ksh ${promocode.discountValue}`;

    return (
        <div className="space-y-8">
            <Link href="/influencer/campaigns" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2" /> Back to All Campaigns
            </Link>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                             <p className="font-mono text-3xl font-bold text-primary">{promocode.code}</p>
                             <CardDescription>For: <span className="font-semibold text-foreground">{promocode.listingName}</span></CardDescription>
                        </div>
                        <Badge variant={statusInfo.variant} className={`${statusInfo.className} text-base`}>{statusInfo.label}</Badge>
                    </div>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><Tag />Discount</p>
                            <p className="font-bold text-lg">{discount}</p>
                        </div>
                         <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><Users />Usage</p>
                            <p className="font-bold text-lg">{promocode.usageCount} / {promocode.usageLimit === 999999 ? 'Unlimited': promocode.usageLimit}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign />Revenue</p>
                            <p className="font-bold text-lg">Ksh {(promocode.revenueGenerated || 0).toLocaleString()}</p>
                        </div>
                         <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><CalendarCheck />Expires</p>
                            <p className="font-bold text-lg">{promocode.expiresAt ? format(new Date(promocode.expiresAt), 'PPP') : 'Never'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <ManageLinks campaign={promocode} initialLinks={trackingLinks} status={status} />
        </div>
    );
}
