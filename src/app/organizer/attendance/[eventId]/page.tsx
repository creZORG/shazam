
'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getAttendanceStats } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Ticket, Users, FileText, ArrowLeft, BarChart2, AlertTriangle, QrCode } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type AnalyticsData = Awaited<ReturnType<typeof getAttendanceStats>>['data'];

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

export default function EventAttendancePage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      setLoading(true);
      getAttendanceStats(eventId).then(result => {
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
        <Link href="/organizer/attendance">
          <Button variant="outline" className="mt-4">Back to Attendance</Button>
        </Link>
      </div>
    )
  }

  if (!data) {
    return notFound();
  }
  
  const overallAttendance = `${data.overallAttendance.toFixed(1)}% (${data.totalAttended} of ${data.totalSoldOnline + data.generatedAtGate}) checked in`;

  return (
    <div className="space-y-8">
      <Link href="/organizer/attendance" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2" /> Back to Attendance Overview
      </Link>
      <div>
        <p className="text-muted-foreground">Attendance for</p>
        <h1 className="text-3xl font-bold">{data.eventName}</h1>
      </div>
      
       <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Tickets Sold" value={data.totalSoldOnline} icon={Ticket} />
        <StatCard title="Total Generated at Gate" value={data.generatedAtGate} icon={QrCode} />
        <StatCard title="Total Attended" value={data.totalAttended} icon={Users} />
        <StatCard title="Overall Capacity" value={data.totalCapacity === 0 ? 'N/A' : data.totalCapacity} icon={Users} />
        <StatCard title="Overall Attendance" value={`${data.overallAttendance.toFixed(1)}%`} icon={BarChart2} description={`${data.totalAttended} of ${data.totalSoldOnline + data.generatedAtGate} checked in`} />
      </div>

       <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Check-in History</CardTitle>
                    <CardDescription>A log of the most recent ticket scans.</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.checkInHistory.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Attendee</TableHead>
                                    <TableHead>Ticket Type</TableHead>
                                    <TableHead className="text-right">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.checkInHistory.slice(0, 10).map((scan) => (
                                    <TableRow key={scan.id}>
                                        <TableCell className="font-medium">{scan.details?.attendeeName}</TableCell>
                                        <TableCell><Badge variant="secondary">{scan.details?.ticketType}</Badge></TableCell>
                                        <TableCell className="text-right">{formatDistanceToNow(new Date(scan.timestamp as any), { addSuffix: true })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No tickets scanned yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Verifier Performance</CardTitle>
                <CardDescription>Tickets scanned by each verification agent.</CardDescription>
            </CardHeader>
            <CardContent>
                 {data.verifierStats.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Verifier</TableHead>
                                <TableHead className="text-right">Scans</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.verifierStats.map((stat) => (
                                <TableRow key={stat.verifierId}>
                                    <TableCell className="font-medium">{stat.verifierName}</TableCell>
                                    <TableCell className="text-right">{stat.scanCount}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 ) : (
                    <p className="text-center text-muted-foreground py-8">No verifier activity recorded.</p>
                 )}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
