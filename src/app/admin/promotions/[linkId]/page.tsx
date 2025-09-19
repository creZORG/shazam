
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Link as LinkIcon, Loader2, MousePointerClick, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLinkAnalytics } from '../actions';
import type { TrackingLink, PromocodeClick } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    const [clicksByDay, setClicksByDay] = useState<{ date: string; clicks: number }[]>([]);
    const [recentClicks, setRecentClicks] = useState<PromocodeClick[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (linkId) {
            getLinkAnalytics(linkId, promocodeId || undefined)
                .then(result => {
                    if (result.success && result.data) {
                        setLinkData(result.data.link);
                        setClicksByDay(result.data.clicksByDay);
                        setRecentClicks(result.data.recentClicks);
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

    const chartConfig = { clicks: { label: 'Clicks', color: "hsl(var(--chart-1))" } };


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

            <Card>
                <CardHeader>
                    <CardTitle>Clicks Over Time</CardTitle>
                    <CardDescription>A look at link clicks over the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart accessibilityLayer data={clicksByDay}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => format(new Date(value), "MMM d")} />
                            <YAxis tickLine={false} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="clicks" fill="var(--color-clicks)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            
            <Card>
                 <CardHeader>
                    <CardTitle>Recent Click Activity</CardTitle>
                    <CardDescription>The last 50 clicks on this tracking link.</CardDescription>
                </CardHeader>
                <CardContent>
                     {recentClicks.length > 0 ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Device/Browser</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentClicks.map(click => (
                                    <TableRow key={click.id}>
                                        <TableCell title={format(new Date(click.timestamp), 'PPpp')}>
                                            {formatDistanceToNow(new Date(click.timestamp), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{click.ipAddress}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{click.userAgent}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                     ) : (
                        <p className="text-center py-20 text-muted-foreground">
                            No recent clicks recorded yet.
                        </p>
                     )}
                </CardContent>
            </Card>

        </div>
    )
}
