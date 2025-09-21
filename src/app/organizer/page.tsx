
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { getOrganizerGlobalStats, getOrganizerTourStats } from "./actions";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, DollarSign, Ticket, BarChart2, AlertTriangle, Route } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type GlobalStatsData = Awaited<ReturnType<typeof getOrganizerGlobalStats>>['data'];
type TourStatsData = Awaited<ReturnType<typeof getOrganizerTourStats>>['data'];

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

export default function OrganizerOverviewPage() {
    const { user, dbUser, loading: authLoading } = useAuth();
    const [eventStats, setEventStats] = useState<GlobalStatsData | null>(null);
    const [tourStats, setTourStats] = useState<TourStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && user && dbUser) { 
            setLoading(true);
            Promise.all([
                getOrganizerGlobalStats(),
                getOrganizerTourStats(),
            ]).then(([eventResult, tourResult]) => {
                if (eventResult.success && eventResult.data) {
                    setEventStats(eventResult.data);
                } else {
                    setError(eventResult.error || 'Failed to load event analytics.');
                }
                
                if (tourResult.success && tourResult.data) {
                    setTourStats(tourResult.data);
                } else {
                     setError(tourResult.error || 'Failed to load tour analytics.');
                }
                setLoading(false);
            })
        } else if (!authLoading && !user) {
             setLoading(false);
             setError("You must be logged in to view this page.");
        }
    }, [user, dbUser, authLoading]);

    if (loading || authLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    if (error || !eventStats || !tourStats) {
        return <p className="text-destructive text-center py-12 flex items-center justify-center gap-2"><AlertTriangle /> {error || 'Could not load data'}</p>;
    }
    
    const chartConfig = { revenue: { label: 'Revenue', color: "hsl(var(--chart-1))" } };

    return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Overview</h1>
        <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-lg mb-8">
            <TabsTrigger value="events"><BarChart2 className="mr-2"/>Events Analytics</TabsTrigger>
            <TabsTrigger value="tours"><Route className="mr-2"/>Tours Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
                <StatCard title="Total Revenue" value={`Ksh ${eventStats.totalRevenue.toLocaleString()}`} icon={DollarSign} />
                <StatCard title="Total Tickets Sold" value={eventStats.totalTicketsSold.toLocaleString()} icon={Ticket} />
                <StatCard title="Total Events Published" value={eventStats.totalEvents.toLocaleString()} icon={BarChart2} />
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue per Event</CardTitle>
                        <CardDescription>A look at which events are generating the most revenue.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <BarChart accessibilityLayer data={eventStats.topEvents} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid horizontal={false} />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12, width: 120 }} interval={0} />
                                <XAxis dataKey="revenue" type="number" hide />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                <Bar dataKey="revenue" layout="vertical" radius={5} fill="var(--color-revenue)" />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Performing Listings</CardTitle>
                        <CardDescription>Your most successful events based on tickets sold.</CardDescription>
                    </CardHeader>
                    <CardContent className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Tickets Sold</TableHead>
                                    <TableHead>Revenue</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {eventStats.topEvents.slice(0, 5).map(event => (
                                    <TableRow key={event.id}>
                                        <TableCell className="font-medium">{event.name}</TableCell>
                                        <TableCell>{event.ticketsSold}</TableCell>
                                        <TableCell>Ksh {event.revenue.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/organizer/analytics/event/${event.id}`}>
                                                <Button variant="outline" size="sm">View</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

        </TabsContent>
        <TabsContent value="tours" className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
                <StatCard title="Total Tour Revenue" value={`Ksh ${tourStats.totalRevenue.toLocaleString()}`} icon={DollarSign} />
                <StatCard title="Total Bookings" value={tourStats.totalBookings.toLocaleString()} icon={Ticket} />
                <StatCard title="Total Tours Published" value={tourStats.totalTours.toLocaleString()} icon={Route} />
            </div>
             <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue per Tour</CardTitle>
                        <CardDescription>A look at which tours are generating the most revenue.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <BarChart accessibilityLayer data={tourStats.topTours} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid horizontal={false} />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12, width: 120 }} interval={0} />
                                <XAxis dataKey="revenue" type="number" hide />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                <Bar dataKey="revenue" layout="vertical" radius={5} fill="var(--color-revenue)" />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Performing Tours</CardTitle>
                        <CardDescription>Your most successful tours based on bookings.</CardDescription>
                    </CardHeader>
                    <CardContent className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tour</TableHead>
                                    <TableHead>Bookings</TableHead>
                                    <TableHead>Revenue</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tourStats.topTours.slice(0, 5).map(tour => (
                                    <TableRow key={tour.id}>
                                        <TableCell className="font-medium">{tour.name}</TableCell>
                                        <TableCell>{tour.bookings}</TableCell>
                                        <TableCell>Ksh {tour.revenue.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/organizer/analytics/tour/${tour.id}`}>
                                                <Button variant="outline" size="sm">View</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        </Tabs>
    </div>
  );
}
