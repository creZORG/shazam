
'use client';

import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getLinkAnalytics } from '../actions';
import type { TrackingLink, PromocodeClick } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Link as LinkIcon, MousePointerClick, ShoppingCart, BarChart } from 'lucide-react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChart as RechartsBarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';

type LinkAnalyticsData = {
    link: TrackingLink;
    recentClicks: PromocodeClick[];
    clicksByDay: { date: string, clicks: number }[];
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
    );
}

export default function LinkAnalyticsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const linkId = params.linkId as string;
    const promocodeId = searchParams.get('promocodeId') || undefined;

    const [analytics, setAnalytics] = useState<LinkAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (linkId) {
            getLinkAnalytics(linkId, promocodeId).then(result => {
                if (result.success && result.data) {
                    setAnalytics(result.data as LinkAnalyticsData);
                } else {
                    notFound();
                }
                setLoading(false);
            });
        }
    }, [linkId, promocodeId]);
    
    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="h-12 w-12 animate-spin" /></div>
    }

    if (!analytics) {
        return notFound();
    }
    
    const { link, recentClicks, clicksByDay } = analytics;
    const chartConfig = { clicks: { label: 'Clicks', color: "hsl(var(--chart-1))" } };


    return (
        <div className="space-y-8">
            <Link href="/admin/promotions" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2" /> Back to Promotions
            </Link>

            <div>
                <h1 className="text-3xl font-bold">Analytics for "{link.name}"</h1>
                <a href={link.longUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex items-center gap-1 font-mono text-xs">
                    <LinkIcon className="h-3 w-3" /> {`${window.location.host}/l/${link.shortId}`}
                </a>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Clicks" value={link.clicks.toLocaleString()} icon={MousePointerClick} />
                <StatCard title="Total Purchases" value={link.purchases.toLocaleString()} icon={ShoppingCart} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Clicks Over Last 30 Days</CardTitle>
                </CardHeader>
                 <CardContent className="pl-2">
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <RechartsBarChart accessibilityLayer data={clicksByDay}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => format(new Date(value), "MMM d")}
                            />
                            <YAxis hide />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="clicks" fill="var(--color-clicks)" radius={4} />
                        </RechartsBarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Click Activity</CardTitle>
                    <CardDescription>A log of the last 50 clicks on this tracking link.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Device / Browser</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentClicks.map(click => (
                                <TableRow key={click.id}>
                                    <TableCell title={format(new Date(click.timestamp as any), 'PPpp')}>
                                        {formatDistanceToNow(new Date(click.timestamp as any), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{click.ipAddress}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{click.userAgent}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    )
}
