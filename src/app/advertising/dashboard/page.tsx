
'use client';

import { useEffect, useState } from 'react';
import { getMyAdSubmissions } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Loader2, Megaphone, BarChart2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { AdSubmission } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    approved: { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
    pending: { variant: 'secondary', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    rejected: { variant: 'destructive', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || { variant: 'outline', className: '' };
    return <Badge variant={config.variant} className={config.className}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

export default function AdvertiserDashboardPage() {
    const [ads, setAds] = useState<AdSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getMyAdSubmissions().then(result => {
            if (result.success && result.data) {
                setAds(result.data);
            } else {
                setError(result.error || "Could not load your ad campaigns.");
            }
            setLoading(false);
        });
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold">My Ad Dashboard</h1>
                    <p className="text-muted-foreground">Track the status and performance of your campaigns.</p>
                </div>
                <Link href="/advertising">
                    <Button><Megaphone className="mr-2"/> Submit a New Ad</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Ad Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : error ? (
                        <div className="text-center py-12 text-destructive">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : ads.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campaign Name</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Impressions</TableHead>
                                    <TableHead>Clicks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ads.map(ad => (
                                    <TableRow key={ad.id}>
                                        <TableCell className="font-medium">{ad.campaignName}</TableCell>
                                        <TableCell>{format(new Date(ad.createdAt), 'PP')}</TableCell>
                                        <TableCell><StatusBadge status={ad.status} /></TableCell>
                                        <TableCell>{ad.impressions || 0}</TableCell>
                                        <TableCell>{ad.clicks || 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-20">
                            <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">No campaigns yet.</h3>
                            <p className="text-muted-foreground mt-2">Ready to reach more people? Submit your first ad!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
