
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getAssignedEvents } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, CalendarDays, AlertTriangle, QrCode } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type AssignedEvent = {id: string, name: string, date: string};

export default function AssignedEventsPage() {
    const { user } = useAuth();
    const [assignedEvents, setAssignedEvents] = useState<AssignedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.uid) {
            setLoading(true);
            getAssignedEvents(user.uid).then(result => {
                if (result.success && result.data) {
                    setAssignedEvents(result.data);
                } else {
                    setError(result.error || "Failed to load events.");
                }
                setLoading(false);
            });
        }
    }, [user]);

    const upcomingEvents = assignedEvents.filter(e => !isPast(new Date(e.date)));
    const pastEvents = assignedEvents.filter(e => isPast(new Date(e.date)));

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <p className="text-destructive text-center py-12 flex items-center justify-center gap-2"><AlertTriangle /> {error}</p>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Verification Dashboard</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Events</CardTitle>
                    <CardDescription>Select an event to begin scanning tickets.</CardDescription>
                </CardHeader>
                <CardContent>
                    {upcomingEvents.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingEvents.map(event => (
                                <div key={event.id} className="p-4 border rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{event.name}</p>
                                        <p className="text-sm text-muted-foreground">{format(new Date(event.date), 'EEEE, PPP')}</p>
                                    </div>
                                    <Link href={`/verify/scan/${event.id}`}>
                                        <Button>
                                            <QrCode className="mr-2 h-4 w-4" />
                                            Start Scanning
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No upcoming events assigned to you.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Past Events</CardTitle>
                    <CardDescription>Events you have previously worked on.</CardDescription>
                </CardHeader>
                <CardContent>
                     {pastEvents.length > 0 ? (
                        <div className="space-y-4">
                            {pastEvents.map(event => (
                                <div key={event.id} className="p-4 border rounded-lg flex justify-between items-center opacity-70">
                                    <div>
                                        <p className="font-semibold">{event.name}</p>
                                        <p className="text-sm text-muted-foreground">{format(new Date(event.date), 'EEEE, PPP')}</p>
                                    </div>
                                    <Badge variant="outline">Completed</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No past events found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
