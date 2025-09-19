
'use client';

import { useEffect, useState, useTransition } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getTourAnalytics, getTourAttendeeReport } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, Ticket, Users, Percent, ArrowLeft, Download, ShieldCheck, FileText } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

type AnalyticsData = Awaited<ReturnType<typeof getTourAnalytics>>['data'];

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

function downloadCSV(data: any[], filename: string) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            let cell = row[header];
            if (typeof cell === 'string' && cell.includes(',')) {
                return `"${cell}"`;
            }
            return cell;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

const chartConfig = { 
    revenue: { label: 'Revenue' },
    full: { label: 'Full Payments', color: "hsl(var(--chart-1))" },
    booking: { label: 'Booking Fees', color: "hsl(var(--chart-2))" },
};

function AttendeeReportDownloader({ tourId, tourName }: { tourId: string, tourName: string }) {
    const { toast } = useToast();
    const [isDownloading, startDownloading] = useTransition();
    const [showDialog, setShowDialog] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleDownload = () => {
        startDownloading(async () => {
            const result = await getTourAttendeeReport(tourId);
            if (result.success && result.data) {
                downloadCSV(result.data, `${tourName.replace(/\s+/g, '_')}_attendees.csv`);
                setShowDialog(false);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Download Failed',
                    description: result.error,
                });
            }
        });
    }

    return (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <Button onClick={() => setShowDialog(true)}>
                <Download className="mr-2" /> Download Attendee Report
            </Button>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Download Attendee Information</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to download sensitive personal information. By proceeding, you agree to:
                         <ul className="list-disc list-inside mt-2 text-xs">
                           <li>Handle this data securely and responsibly.</li>
                           <li>Use this data only for the purpose of managing this tour's attendance.</li>
                           <li>Delete the data after the tour is complete.</li>
                           <li>Comply with all applicable data privacy laws.</li>
                        </ul>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <div className="items-top flex space-x-2 my-4">
                    <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(!!checked)} />
                    <div className="grid gap-1.5 leading-none">
                        <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            I agree to the <Link href="/partners-tos" target="_blank" className="text-primary underline">Partner Terms of Service</Link> and will protect this data.
                        </label>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDownload} disabled={!termsAccepted || isDownloading}>
                        {isDownloading && <Loader2 className="animate-spin mr-2" />}
                        Confirm & Download
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function TourAnalyticsPage() {
  const params = useParams();
  const tourId = params.tourId as string;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tourId) {
      setLoading(true);
      getTourAnalytics(tourId).then(result => {
        if (result.success && result.data) {
          setData(result.data);
        } else {
          notFound();
        }
        setLoading(false);
      });
    }
  }, [tourId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!data) {
    return notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <Link href="/organizer/listings" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="mr-2" /> Back to All Listings
            </Link>
            <p className="text-muted-foreground">Analytics for Tour</p>
            <h1 className="text-3xl font-bold">{data.tourName}</h1>
        </div>
        <AttendeeReportDownloader tourId={tourId} tourName={data.tourName} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`Ksh ${data.totalRevenue.toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Total Bookings" value={`${data.totalBookings}`} icon={Ticket} />
        <StatCard title="Page Views" value={data.pageViews.toLocaleString()} icon={Users} />
        <StatCard title="Conversion Rate" value={`${data.conversionRate.toFixed(2)}%`} icon={Percent} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bookings Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={{ sales: { label: 'Bookings', color: "hsl(var(--chart-1))" }}} className="h-[250px] w-full">
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
            <CardTitle>Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
             <ChartContainer config={chartConfig} className="h-[250px] w-full">
               <PieChart>
                 <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                 <Pie data={data.revenueDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                   {data.revenueDistribution.map((entry) => (
                     <Cell key={entry.name} fill={entry.fill} />
                   ))}
                 </Pie>
                 <Legend />
               </PieChart>
             </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
