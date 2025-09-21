

'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { getAttendanceStats, generateManualTicketForOrganizer } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Ticket, Users, FileText, ArrowLeft, BarChart2, AlertTriangle, QrCode, PlusCircle, Minus } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

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

function GateTicketModal({ event, onTicketsGenerated }: { event: Event, onTicketsGenerated: () => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    
    useEffect(() => {
        setQuantities({});
    }, [event]);

    const handleQuantityChange = (name: string, delta: number) => {
        setQuantities(prev => ({
            ...prev,
            [name]: Math.max(0, (prev[name] || 0) + delta)
        }));
    };

    const ticketsToGenerate = Object.entries(quantities)
        .map(([name, quantity]) => ({ name, quantity }))
        .filter(t => t.quantity > 0);
        
    const totalTickets = ticketsToGenerate.reduce((sum, t) => sum + t.quantity, 0);

    const handleGenerate = async () => {
        if (!event || ticketsToGenerate.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select tickets to generate.' });
            return;
        }
        setLoading(true);
        const result = await generateManualTicketForOrganizer(event.id, ticketsToGenerate);
        if(result.success) {
            toast({ title: 'Tickets Generated!', description: `${totalTickets} new "used" ticket(s) have been created.`});
            onTicketsGenerated();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Generate At-the-Gate Tickets</DialogTitle>
                <DialogDescription>
                    Create tickets for attendees entering now. These tickets will be automatically marked as "used".
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                    <Label>Ticket Types</Label>
                    {(event as Event).tickets && (event as Event).tickets!.length > 0 ? (event as Event).tickets!.map(def => (
                        <div key={def.name} className="flex justify-between items-center p-3 border rounded-md">
                            <span className="font-medium">{def.name}</span>
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleQuantityChange(def.name, -1)}><Minus className="h-4 w-4"/></Button>
                                <span className="font-bold w-6 text-center">{quantities[def.name] || 0}</span>
                                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleQuantityChange(def.name, 1)}><PlusCircle className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground">No ticket types are configured for this event.</p>
                    )}
                </div>
            </div>
            <DialogFooter>
                 <div className="flex-grow space-y-2">
                    <Button onClick={handleGenerate} disabled={loading || totalTickets === 0} className="w-full">
                        {loading && <Loader2 className="animate-spin mr-2" />}
                        Generate & Use for Entry
                    </Button>
                     <p className="text-xs text-muted-foreground text-center">Creates tickets and immediately marks them as used.</p>
                 </div>
            </DialogFooter>
        </DialogContent>
    )
}

export default function EventAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendanceData = () => {
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
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [eventId]);

  const handleTicketGeneration = () => {
    // Re-fetch data after tickets are generated
    fetchAttendanceData();
  };

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
  
  const overallAttendance = data.overallAttendance.toFixed(1);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/organizer/attendance" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-2" /> Back to Attendance Overview
          </Link>
          <p className="text-muted-foreground">Attendance for</p>
          <h1 className="text-3xl font-bold">{data.eventName}</h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2" /> Generate Gate Ticket</Button>
          </DialogTrigger>
          <GateTicketModal event={data.event} onTicketsGenerated={handleTicketGeneration} />
        </Dialog>
      </div>
      
       <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Tickets Sold Online" value={data.totalSoldOnline} icon={Ticket} />
        <StatCard title="Total Generated at Gate" value={data.generatedAtGate} icon={QrCode} />
        <StatCard title="Total Attended" value={data.totalAttended} icon={Users} />
        <StatCard title="Overall Capacity" value={data.totalCapacity === 0 ? 'N/A' : data.totalCapacity} icon={Users} />
        <StatCard title="Overall Attendance" value={`${overallAttendance}%`} icon={BarChart2} description={`${data.totalAttended} of ${data.totalSoldOnline + data.generatedAtGate} checked in`} />
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
