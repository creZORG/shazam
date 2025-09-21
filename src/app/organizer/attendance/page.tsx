
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, FileText, Loader2, Ticket, Users, CheckCircle, PlusCircle, Minus, UserCheck } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getAttendanceStats, getPublishedEvents, generateManualTicket } from './actions';
import { useAuth } from '@/hooks/use-auth';
import type { Event, Ticket as TicketType, TicketDefinition } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';

type AttendanceStats = Awaited<ReturnType<typeof getAttendanceStats>>['data'];
type PublishedEvent = { id: string; name: string };

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

function GenerateTicketModal({ event, ticketDefinitions, onTicketsGenerated }: { event: PublishedEvent | null, ticketDefinitions: TicketDefinition[], onTicketsGenerated: (orderId: string) => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    
    useEffect(() => {
        // Reset quantities when modal opens for a new event
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
        const result = await generateManualTicket(event.id, ticketsToGenerate);
        if(result.success && result.orderId) {
            toast({ title: 'Tickets Generated!', description: `${totalTickets} new ticket(s) have been created and validated.`});
            onTicketsGenerated(result.orderId);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }

    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Generate At-the-Gate Tickets</AlertDialogTitle>
                <AlertDialogDescription>
                    Create and instantly validate tickets for attendees paying at the door. Select the type and quantity below.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <p>Event: <span className="font-bold">{event?.name}</span></p>
                <div className="space-y-3">
                    <Label>Ticket Types</Label>
                    {ticketDefinitions.length > 0 ? ticketDefinitions.map(def => (
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
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleGenerate} disabled={loading || totalTickets === 0}>
                    {loading && <Loader2 className="animate-spin mr-2" />}
                    Generate & Validate ({totalTickets})
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    )
}

function AttendanceDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(searchParams.get('eventId'));
  const [events, setEvents] = useState<PublishedEvent[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      getPublishedEvents().then(result => {
        if (result.success && result.data) {
          setEvents(result.data);
          // Auto-select the first event if none is selected
          if (!searchParams.get('eventId') && result.data.length > 0) {
            setSelectedEventId(result.data[0].id);
          }
        }
      });
    }
  }, [user, searchParams]);
  
  const fetchStats = (eventId: string) => {
      setLoading(true);
      setError(null);
      getAttendanceStats(eventId).then(result => {
        if (result.success && result.data) {
          setStats(result.data);
        } else {
          setError(result.error || 'Failed to load attendance data.');
        }
        setLoading(false);
      });
  }

  useEffect(() => {
    if (selectedEventId) {
        fetchStats(selectedEventId);
    }
  }, [selectedEventId]);

  const handleTicketsGenerated = (orderId: string) => {
      setIsModalOpen(false);
      if(selectedEventId) {
        fetchStats(selectedEventId); // Refresh stats
      }
      router.push(`/ticket-center?orderId=${orderId}`);
  }
  
  const selectedEvent = events.find(e => e.id === selectedEventId);
  const attendancePercentage = stats && stats.totalSold > 0 ? (stats.scanned / stats.totalSold) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance Monitoring</h1>
          <p className="text-muted-foreground">Oversee check-ins and manage attendance for your events in real-time.</p>
        </div>
         <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <AlertDialogTrigger asChild>
                <Button disabled={!selectedEventId}>
                    <PlusCircle className="mr-2" /> Generate Gate Ticket
                </Button>
            </AlertDialogTrigger>
            <GenerateTicketModal event={selectedEvent || null} ticketDefinitions={stats?.ticketDefinitions || []} onTicketsGenerated={handleTicketsGenerated} />
        </AlertDialog>
      </div>

       <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Select onValueChange={setSelectedEventId} value={selectedEventId || ''}>
                <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent>
                    {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
            {loading ? (
                 <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : error ? (
                <div className="text-center py-12 text-destructive flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8" />
                    <p className="font-semibold">Could not load data</p>
                    <p>{error}</p>
                </div>
            ) : stats ? (
                <div className="space-y-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Tickets Sold" value={stats.totalSold.toLocaleString()} icon={Ticket} />
                        <StatCard title="Total Generated at Gate" value={stats.generatedAtGate.toLocaleString()} icon={PlusCircle} />
                        <StatCard title="Total Attended" value={stats.scanned.toLocaleString()} icon={CheckCircle} />
                        <StatCard title="Overall Capacity" value={stats.totalCapacity > 0 ? stats.totalCapacity.toLocaleString() : 'N/A'} icon={Users} />
                    </div>

                    <div>
                        <Label>Overall Attendance</Label>
                        <Progress value={attendancePercentage} className="w-full mt-2 h-4" />
                        <p className="text-sm text-muted-foreground mt-1 text-right">{attendancePercentage.toFixed(1)}% ({stats.scanned} of {stats.totalSold}) checked in</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Check-in History</CardTitle>
                                <CardDescription>A log of the most recent ticket scans.</CardDescription>
                            </CardHeader>
                            <CardContent className="relative w-full overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Attendee</TableHead>
                                            <TableHead>Ticket Type</TableHead>
                                            <TableHead>Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats.scannedTickets.slice(0, 10).map(ticket => (
                                            <TableRow key={ticket.id}>
                                                <TableCell>{ticket.userName}</TableCell>
                                                <TableCell>{ticket.ticketType}</TableCell>
                                                <TableCell>{ticket.validatedAt ? formatDistanceToNow(new Date(ticket.validatedAt), { addSuffix: true }) : 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {stats.scannedTickets.length === 0 && (
                                    <p className="text-center text-muted-foreground py-12">No tickets scanned yet.</p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><UserCheck /> Verifier Performance</CardTitle>
                                <CardDescription>Tickets scanned by each verification agent.</CardDescription>
                            </CardHeader>
                            <CardContent className="relative w-full overflow-auto">
                                {stats.verifierStats.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Verifier</TableHead>
                                                <TableHead className="text-right">Tickets Scanned</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stats.verifierStats.map(verifier => (
                                                <TableRow key={verifier.verifierId}>
                                                    <TableCell className="font-medium">{verifier.verifierName}</TableCell>
                                                    <TableCell className="text-right font-bold">{verifier.scanCount}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-center text-muted-foreground py-12">No verifier activity recorded.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                 <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8" />
                    <p className="font-semibold">No Event Selected</p>
                    <p>Please select an event to view attendance stats.</p>
                </div>
            )}
        </CardContent>
       </Card>

    </div>
  );
}

export default function AttendancePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <AttendanceDashboard />
        </Suspense>
    )
}
