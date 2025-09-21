
'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getEventAnalytics } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, Ticket, Users, Percent, ArrowLeft, BarChart2, AlertTriangle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

type AnalyticsData = Awaited<ReturnType<typeof getEventAnalytics>>['data'];

function StatCard({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType, description?: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function EventAnalyticsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      setLoading(true);
      getEventAnalytics(eventId).then(result => {
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || "An unknown error occurred.");
        }
        setLoading(false);
      });
    }
  }, [eventId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (error) {
    return (
      <div className="text-center py-20 text-destructive">
        <AlertTriangle className="mx-auto h-12 w-12" />
        <h2 className="mt-4 text-2xl font-bold">Access Denied</h2>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Link href="/organizer/listings">
          <Button variant="outline" className="mt-4">Back to Listings</Button>
        </Link>
      </div>
    )
  }

  if (!data) {
    return notFound();
  }

  const chartConfig = data.salesByTicketType.reduce((acc, entry) => {
    acc[entry.name] = { label: entry.name };
    return acc;
  }, {} as any);


  return (
    <div className="space-y-8">
      <Link href="/organizer/listings" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2" /> Back to All Listings
      </Link>
      <div>
        <p className="text-muted-foreground">Analytics for</p>
        <h1 className="text-3xl font-bold">{data.eventName}</h1>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`Ksh ${data.totalRevenue.toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Tickets Sold" value={`${data.totalTicketsSold} / ${data.totalCapacity}`} icon={Ticket} description={`${((data.totalTicketsSold / data.totalCapacity) * 100).toFixed(1)}% sold`} />
        <StatCard title="Conversion Rate" value={`${data.conversionRate.toFixed(2)}%`} icon={Percent} description={`${data.pageViews} views`} />
        <StatCard title="Attendance Rate" value={`${data.attendanceRate.toFixed(1)}%`} icon={Users} description={`${data.ticketsScanned} scanned`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ticket Sales Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={{ sales: { label: 'Sales', color: "hsl(var(--chart-1))" }}} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={data.salesOverTime}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => format(new Date(value), "MMM d")} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales by Ticket Type</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
             <ChartContainer config={chartConfig} className="h-[250px] w-full">
               <PieChart>
                 <ChartTooltip content={<ChartTooltipContent nameKey="sold" hideLabel />} />
                 <Pie data={data.salesByTicketType} dataKey="sold" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                   {data.salesByTicketType.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Legend content={<p className="text-sm text-muted-foreground mt-4">A breakdown of which ticket tiers are most popular.</p>} />
               </PieChart>
             </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
