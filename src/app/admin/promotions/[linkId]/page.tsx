
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Link as LinkIcon, Loader2, MousePointerClick, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLinkAnalytics } from '../actions';
import type { TrackingLink } from '@/lib/types';

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
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
    );
}

export default function LinkAnalyticsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const linkId = params.linkId as string;
    const promocodeId = searchParams.get('promocodeId');
    
    const [linkData, setLinkData] = useState<TrackingLink | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (linkId) {
            getLinkAnalytics(linkId, promocodeId || undefined)
                .then(result => {
                    if (result.success && result.data) {
                        setLinkData(result.data.link);
                    } else {
                        setError(result.error || 'Could not load link analytics.');
                    }
                    setLoading(false);
                });
        }
    }, [linkId, promocodeId]);


    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary"/>
            </div>
        );
    }
    
    if (error || !linkData) {
         return (
            <div className="space-y-8">
                <Link href="/admin/promotions" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-2" /> Back to Promotions
                </Link>
                <Card className="text-center py-12 text-destructive">
                    <CardHeader>
                        <CardTitle>Error Loading Analytics</CardTitle>
                        <CardDescription>{error || 'The link data could not be found.'}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }


    return (
        <div className="space-y-8">
            <Link href="/admin/promotions" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2" /> Back to Promotions
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle>{linkData.name}</CardTitle>
                    <CardDescription>Analytics overview for your tracking link.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                   <StatCard title="Total Clicks" value={linkData.clicks.toLocaleString()} icon={MousePointerClick} />
                   <StatCard title="Total Purchases" value={linkData.purchases.toLocaleString()} icon={ShoppingCart} />
                </CardContent>
            </Card>

        </div>
    )
}
