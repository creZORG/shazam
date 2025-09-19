
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getListings } from '@/app/actions';
import type { NightlifeEvent } from '@/lib/types';
import { NightlifeCard } from '@/components/nightlife/NightlifeCard';

export default function ClubDashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<NightlifeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
        setLoading(true);
        getListings('nightlifeEvents').then(result => {
            if (result.listings) {
                const userEvents = (result.listings as NightlifeEvent[]).filter(event => event.clubId === user.uid);
                setEvents(userEvents);
            }
            setLoading(false);
        });
    }
}, [user]);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Nightlife Events</h1>
        <Link href="/club/events/create" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Post New Event
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Posted Events</CardTitle>
          <CardDescription>
            A list of all nightlife events you have posted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center py-12">
                <Loader2 className="animate-spin h-8 w-8" />
             </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                    <NightlifeCard key={event.id} event={event} />
                ))}
            </div>
          ) : (
             <div className="text-center py-12">
                <h3 className="text-lg font-semibold">No events yet</h3>
                <p className="text-muted-foreground mt-2">
                Get started by posting your first nightlife event.
                </p>
                 <Link href="/club/events/create" className="mt-4 inline-block">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Event
                    </Button>
                </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
