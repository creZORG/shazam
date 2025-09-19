

'use client';

import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Ticket,
  Music,
  UserCheck,
  Mic,
  Building,
  Info,
  Image as ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { getListingById, getOrganizerById } from '@/app/actions';
import { rateEvent } from '@/app/profile/actions';
import type { NightlifeEvent, Organizer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/hooks/use-toast';

export default function NightlifeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [event, setEvent] = useState<NightlifeEvent | null>(null);
  const [club, setClub] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await getListingById('nightlifeEvent', params.id);
      if (error || !data) {
        notFound();
        return;
      }
      const nightlifeEvent = data as NightlifeEvent;
      setEvent(nightlifeEvent);

      if (nightlifeEvent.clubId) {
        const clubData = await getOrganizerById(nightlifeEvent.clubId);
        setClub(clubData);
      }

      setLoading(false);
    }
    fetchData();
  }, [params.id]);

  const handleRating = async (rating: number) => {
    if (!club) return;
    const result = await rateEvent(club.id, rating);
    if (result.success) {
      toast({
        title: 'Rating Submitted!',
        description: `You rated "${club.name}" ${rating} stars.`,
      });
      if (result.newAverage && club) {
        setClub({ ...club, rating: { average: result.newAverage, count: (club.rating?.count || 0) + 1 } });
      }
    } else {
      toast({ variant: 'destructive', title: 'Rating Failed', description: result.error });
    }
  };


  if (loading || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date);

  return (
    <div className="min-h-screen">
      <section className="relative w-full h-[40vh] md:h-[50vh]">
        <Image
          src={event.imageUrl}
          alt={event.eventName}
          data-ai-hint={event.imageHint || 'nightlife event'}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/50 to-transparent" />
      </section>

      <section className="py-8 md:py-12 bg-transparent">
        <div className="container mx-auto px-4">
          <div className="p-6 rounded-lg bg-card shadow-lg -mt-32 relative z-30">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <p className="text-lg font-semibold text-purple-400">
                  {format(eventDate, 'eeee, MMMM d')}
                </p>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
                  {event.eventName}
                </h1>
                <p className="text-xl md:text-2xl font-semibold text-muted-foreground mt-2">
                  at <span className="text-pink-400">{event.clubName}</span>
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Entrance Fee</p>
                    <p className="font-semibold text-lg">{event.entranceFee}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-pink-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dress Code</p>
                    <p className="font-semibold">{event.dressCode}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Tabs defaultValue="about-event" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="about-event"><Info className="mr-2" />About the Event</TabsTrigger>
                <TabsTrigger value="about-club"><Building className="mr-2" />About the Club</TabsTrigger>
                <TabsTrigger value="gallery"><ImageIcon className="mr-2" />Gallery</TabsTrigger>
              </TabsList>
              <TabsContent value="about-event" className="mt-4">
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground text-lg">{event.description}</p>
                    <div>
                      <h3 className="font-semibold flex items-center mb-2">
                        <Music className="mr-2 h-5 w-5 text-purple-400" />
                        Music Policy
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {event.musicPolicy.map((genre) => (
                          <Badge key={genre} variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">{genre}</Badge>
                        ))}
                      </div>
                    </div>
                    {event.specialAppearances && event.specialAppearances.length > 0 && (
                        <div>
                        <h3 className="font-semibold flex items-center mb-2">
                            <Mic className="mr-2 h-5 w-5 text-pink-400" />
                            Special Appearances
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {event.specialAppearances.map((artist) => (
                            <Badge key={artist} variant="secondary" className="bg-pink-500/20 text-pink-300 border-pink-500/30">{artist}</Badge>
                            ))}
                        </div>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="about-club" className="mt-4">
                {club ? (
                  <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>About {club.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">{club.bio}</p>
                      <div>
                        <h4 className="font-semibold">Rate this club</h4>
                        <StarRating
                          initialRating={club.rating?.average || 0}
                          onRatingChange={handleRating}
                        />
                         <p className="text-xs text-muted-foreground mt-1">
                            Average rating: {(club.rating?.average || 0).toFixed(1)} ({club.rating?.count || 0} reviews)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : <p className="text-muted-foreground text-center py-8">Club information not available.</p>}
              </TabsContent>
               <TabsContent value="gallery" className="mt-4">
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardHeader><CardTitle>Club Gallery</CardTitle></CardHeader>
                  <CardContent>
                    {(club as any)?.gallery && (club as any).gallery.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(club as any).gallery.map((url: string, index: number) => (
                          <div key={index} className="relative aspect-square rounded-md overflow-hidden">
                             <Image src={url} alt={`Club photo ${index + 1}`} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-muted-foreground text-center py-8">This club hasn't uploaded any photos yet.</p>}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-8">
            <Card className="sticky top-20 bg-card/80 backdrop-blur-sm">
              <CardContent className="pt-6 space-y-4">
                <Button size="lg" className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <MapPin className="mr-2" /> Get Directions
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
