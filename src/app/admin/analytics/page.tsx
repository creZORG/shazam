
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getAnalyticsData } from "./actions";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { format } from "date-fns";
import { AlertTriangle, UserPlus, Users, DollarSign, Tag, Link as LinkIcon, Award, Users2, ShoppingCart, MousePointerClick, Forward } from "lucide-react";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>['data'];

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function UserGrowthChart({ data }: { data: { date: string, users: number }[] }) {
    const chartConfig = { users: { label: 'New Users', color: "hsl(var(--chart-1))" } };

    return (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
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
                <Line dataKey="users" type="monotone" stroke="var(--color-users)" strokeWidth={2} dot={false} />
            </LineChart>
        </ChartContainer>
    );
}

function CustomPieChart({ data, dataKey, nameKey, title }: { data: any[], dataKey: string, nameKey: string, title: string }) {
    const chartConfig = data.reduce((acc, entry, index) => {
        acc[entry[nameKey]] = {
            label: entry[nameKey],
            color: COLORS[index % COLORS.length]
        };
        return acc;
    }, {} as any);
    
    return (
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[300px]">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey={dataKey} hideLabel />} />
                <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={100} label>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
            </PieChart>
        </ChartContainer>
    )
}

function ConversionFunnel({ data }: { data: { views: number, checkouts: number, purchases: number }}) {
    const funnelData = [
        { stage: 'Views', value: data.views, icon: MousePointerClick, color: 'text-blue-400' },
        { stage: 'Checkouts', value: data.checkouts, icon: ShoppingCart, color: 'text-yellow-400' },
        { stage: 'Purchases', value: data.purchases, icon: DollarSign, color: 'text-green-400' },
    ];
    
    const maxVal = Math.max(...funnelData.map(d => d.value), 1);

    return (
        <div className="space-y-4">
            {funnelData.map((item, index) => (
                <div key={item.stage} className="space-y-1">
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className="flex items-center gap-2">
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                            {item.stage}
                        </span>
                        <span>{item.value.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-4">
                        <div
                            className="bg-gradient-to-r from-primary to-accent h-4 rounded-full"
                            style={{ width: `${(item.value / maxVal) * 100}%` }}
                        />
                    </div>
                    {index < funnelData.length - 1 && (
                        <div className="flex items-center justify-end text-xs text-muted-foreground gap-1">
                            <Forward className="h-3 w-3" />
                             <span>{funnelData[index + 1].value > 0 ? ((funnelData[index + 1].value / item.value) * 100).toFixed(1) : 0}%</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}


function RevenueByCategoryChart({ data }: { data: { category: string, revenue: number }[] }) {
    const chartConfig = { revenue: { label: 'Revenue', color: "hsl(var(--chart-1))" } };
    return (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="category" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            </BarChart>
        </ChartContainer>
    );
}

export default function AdminAnalyticsPage() {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getAnalyticsData().then(({ data, error }) => {
            if (error) {
                setError(error);
            } else if (data) {
                setAnalyticsData(data);
            }
        });
    }, []);

    if (error || !analyticsData) {
        return (
        <div className="text-center py-20 text-destructive">
            <AlertTriangle className="mx-auto h-12 w-12" />
            <h2 className="mt-4 text-2xl font-bold">Could not load analytics</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
        )
    }

  const { userGrowthData, userRolesData, revenueByCategoryData, topPromocodesData, trafficSourceData, topSpendersData, conversionFunnel, purchaseTimingData } = analyticsData;

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Advanced Analytics</h1>
        <div className="grid lg:grid-cols-2 gap-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserPlus /> New User Sign-ups</CardTitle>
                    <CardDescription>A look at new user registrations over the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <UserGrowthChart data={userGrowthData} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> User Role Distribution</CardTitle>
                    <CardDescription>A breakdown of all users by their assigned role on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CustomPieChart data={userRolesData} dataKey="count" nameKey="role" title="User Roles" />
                </CardContent>
            </Card>
        </div>
         <div className="grid lg:grid-cols-2 gap-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign /> Revenue by Category</CardTitle>
                    <CardDescription>A breakdown of total revenue per event category.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <RevenueByCategoryChart data={revenueByCategoryData} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Tag /> Top Performing Promocodes</CardTitle>
                    <CardDescription>Promocodes ranked by total revenue generated.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Uses</TableHead>
                                <TableHead className="text-right">Revenue (Ksh)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topPromocodesData.map((promo) => (
                                <TableRow key={promo.code}>
                                    <TableCell className="font-medium"><Badge variant="secondary">{promo.code}</Badge></TableCell>
                                    <TableCell>{promo.usageCount}</TableCell>
                                    <TableCell className="text-right">{promo.revenueGenerated.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>
        </div>
         <div className="grid lg:grid-cols-2 gap-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LinkIcon /> Traffic Source Analysis</CardTitle>
                    <CardDescription>Where your customers are coming from.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CustomPieChart data={trafficSourceData} dataKey="count" nameKey="channel" title="Traffic Sources" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Award /> Top Spenders</CardTitle>
                    <CardDescription>Your most valuable customers based on total spend.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Orders</TableHead>
                                <TableHead className="text-right">Total Spend (Ksh)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topSpendersData.map((spender) => (
                                <TableRow key={spender.userId}>
                                    <TableCell className="font-medium">{spender.userName}</TableCell>
                                    <TableCell>{spender.orderCount}</TableCell>
                                    <TableCell className="text-right">{spender.totalSpent.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users2 /> Conversion Funnel</CardTitle>
                    <CardDescription>The journey from event view to purchase.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ConversionFunnel data={conversionFunnel} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Tag /> Purchase Timing</CardTitle>
                    <CardDescription>When do users typically buy tickets before an event?</CardDescription>
                </CardHeader>
                <CardContent>
                   <CustomPieChart data={purchaseTimingData} dataKey="count" nameKey="category" title="Purchase Timing" />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
