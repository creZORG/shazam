
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, FileText, Loader2, Ticket, Users, CheckCircle, BarChart, Settings } from 'lucide-react';
import { getEventsForAttendancePage } from './actions';
import { useAuth } from '@/hooks/use-auth';
import type { Event, Ticket as TicketType, TicketDefinition } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';

type AttendanceEvent = {
    id: string;
    name: string;
    date: string;
    imageUrl: string;
    ticketsSold: number;
    ticketsScanned: number;
};

function EventAttendanceCard({ event }: { event: AttendanceEvent }) {
    const attendancePercentage = event.ticketsSold > 0 ? (event.ticketsScanned / event.ticketsSold) * 100 : 0;
    
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-start gap-4">
                <Image src={event.imageUrl} alt={event.name} width={80} height={80} className="rounded-lg aspect-square object-cover" />
                <div>
                    <CardTitle>{event.name}</CardTitle>
                    <CardDescription>{format(new Date(event.date), 'EEEE, MMM d, yyyy')}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>{event.ticketsScanned} Scanned</span>
                        <span>{event.ticketsSold} Sold</span>
                    </div>
                    <Progress value={attendancePercentage} />
                    <p className="text-xs text-muted-foreground text-right">{attendancePercentage.toFixed(1)}% Checked In</p>
                </div>
            </CardContent>
            <CardFooter>
                 <Link href={`/organizer/listings/${event.id}?type=event`} className="w-full">
                    <Button variant="outline" className="w-full">
                        <Settings className="mr-2" /> Manage Attendance
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}

function AttendanceDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getEventsForAttendancePage().then(result => {
        if (result.success && result.data) {
          setEvents(result.data);
        } else {
          setError(result.error || 'Failed to load events data.');
        }
        setLoading(false);
      });
    }
  }, [user]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Attendance Monitoring</h1>
        <p className="text-muted-foreground">Oversee check-ins and manage attendance for your published events.</p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Your Published Events</CardTitle>
          <CardDescription>An at-a-glance look at attendance for each of your events.</CardDescription>
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
            ) : events.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <EventAttendanceCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8" />
                    <p className="font-semibold">No Published Events</p>
                    <p>Create and publish an event to see attendance stats here.</p>
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
