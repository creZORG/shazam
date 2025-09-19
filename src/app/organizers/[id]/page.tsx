

'use client';

import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EventCard } from '@/components/events/EventCard';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { getOrganizerById, getListingsByOrganizer } from '@/app/actions';
import type { Organizer, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrganizerProfilePage({ params }: { params: { id: string } }) {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [organizerEvents, setOrganizerEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const orgData = await getOrganizerById(params.id);

      if (!orgData) {
        notFound();
      }
      setOrganizer(orgData);

      const { listings, error } = await getListingsByOrganizer(params.id, 'events');
      if (!error) {
        setOrganizerEvents(listings as Event[]);
      }
      
      setLoading(false);
    }
    fetchData();
  }, [params.id]);


  if (loading || !organizer) {
    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <Skeleton className="h-48 w-full max-w-4xl mx-auto" />
            <Separator className="my-12" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
            </div>
        </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
        <Card className="max-w-4xl mx-auto">
            <CardHeader className="flex flex-col sm:flex-row items-center gap-6 p-6">
                <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage src={organizer.imageUrl} alt={organizer.name} />
                    <AvatarFallback>{organizer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold">{organizer.name}</h1>
                    <p className="text-muted-foreground mt-2">{organizer.bio}</p>
                </div>
            </CardHeader>
        </Card>

        <Separator className="my-12" />

        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center sm:text-left">Events by {organizer.name}</h2>
            {organizerEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {organizerEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <CardContent>
                        <h3 className="text-lg font-semibold">No upcoming events</h3>
                        <p className="text-muted-foreground mt-2">
                            Check back soon for new events from {organizer.name}.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    </div>
  );
}
