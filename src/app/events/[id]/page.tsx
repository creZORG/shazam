
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, ArrowRight, Gift, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EventCard } from '@/components/events/EventCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { ExternalLink } from '@/components/layout/ExternalLink';
import { getListingById, getListingsByOrganizer, getOrganizerById } from '@/app/actions';
import type { Event, Organizer } from '@/lib/types';
import { EventActions } from './_components/EventActions';
import { TicketSelection } from './_components/TicketSelection';
import type { Metadata } from 'next';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: eventData } = await getListingById('event', params.id);
  const event = eventData as Event;

  if (!event) {
    return {
      title: 'Event Not Found',
    }
  }
  
  const eventUrl = `https://mov33.com/events/${event.slug || event.id}`;

  return {
    title: `${event.name} | Mov33`,
    description: event.description.substring(0, 160),
    openGraph: {
      title: event.name,
      description: event.description.substring(0, 160),
      url: eventUrl,
      images: [
        {
          url: event.imageUrl,
          width: 1200,
          height: 630,
          alt: event.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.name,
      description: event.description.substring(0, 160),
      images: [event.imageUrl],
    },
  }
}


export default async function EventDetailPage({ params }: { params: { id: string } }) {
  
  const { data: eventData, error } = await getListingById('event', params.id);
  
  if (error || !eventData) {
    notFound();
  }
  
  const event = eventData as Event;
  
  // If the event is archived, permanently redirect to the new archive page.
  if (event.status === 'archived') {
    redirect(`/archives/${event.id}?type=event`);
  }
  
  let otherEventsByOrganizer: Event[] = [];
  let organizer: Organizer | null = null;

  if (event.organizerId) {
    const { listings, error: organizerError } = await getListingsByOrganizer(event.organizerId, 'events');
    if (!organizerError) {
      otherEventsByOrganizer = listings.filter((e: Event) => e.id !== (event.id)) as Event[];
    }
    organizer = await getOrganizerById(event.organizerId);
  }

  const isPast = new Date(event.date) < new Date();

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative w-full h-[40vh] md:h-[50vh]">
        <div className="absolute inset-0 bg-black/50 z-10" />
        <Image
          src={event.imageUrl}
          alt={event.name}
          data-ai-hint={event.imageHint || 'event banner'}
          fill
          className="object-cover"
          priority
        />
      </section>

      <section className="py-8 md:py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="relative p-6 rounded-lg bg-card shadow-lg -mt-32 z-30">
            <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary to-accent opacity-20 blur-lg animate-gradient-x group-hover:opacity-75 group-hover:duration-200"></div>
            <div className="relative grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">{event.name}</h1>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                        <p className="font-semibold">{format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(event.date), 'h:mm a')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <div>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue + ', ' + event.county)}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{event.venue}</a>
                        <p className="text-sm text-muted-foreground">{event.county}</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 space-y-8">
                 {event.freeMerch && (
                    <Card className="bg-green-500/10 border-green-500/30">
                        <CardHeader className="flex-row items-center gap-4">
                            <Gift className="h-8 w-8 text-green-500" />
                            <div>
                                <CardTitle className="text-green-300">Special Offer!</CardTitle>
                                <CardDescription className="text-green-400/80">
                                    Get a FREE <strong>{event.freeMerch.productName}</strong> with every ticket purchased for this event.
                                </CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                )}

                {isPast ? (
                  <Card>
                    <CardHeader>
                        <CardTitle>This Event has Passed</CardTitle>
                        <CardDescription>This event is over. Check out the gallery below!</CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  <TicketSelection event={event} />
                )}
                
                <Tabs defaultValue="about" className="w-full">
                    <TabsList className="border-b-2 border-border justify-start rounded-none bg-transparent p-0">
                    <TabsTrigger value="about" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground transition-none">About</TabsTrigger>
                    {(event.gallery && event.gallery.length > 0) && (
                      <TabsTrigger value="gallery" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent text-muted-foreground data-[state=active]:text-foreground transition-none">Gallery</TabsTrigger>
                    )}
                    </TabsList>
                    <TabsContent value="about" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>About {event.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                 <div className="text-muted-foreground text-base md:text-lg leading-relaxed">
                                    <ExternalLink text={event.description} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    {(event.gallery && event.gallery.length > 0) && (
                    <TabsContent value="gallery" className="mt-6">
                        <Card>
                             <CardHeader>
                                <CardTitle>Event Gallery</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {event.gallery?.map((imgUrl, index) => (
                                    <Dialog key={index}>
                                    <DialogTrigger asChild>
                                        <div className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
                                            <Image src={imgUrl} alt={`${event.name} gallery image ${index + 1}`} fill className="object-cover transition-transform group-hover:scale-110" />
                                        </div>
                                    </DialogTrigger>
                                        <DialogContent className="max-w-4xl h-[90vh]">
                                        <Carousel className="w-full h-full" opts={{startIndex: index}}>
                                            <CarouselContent className="h-full">
                                                {event.gallery?.map((url, i) => (
                                                    <CarouselItem key={i} className="h-full">
                                                        <div className="relative h-full">
                                                            <Image src={url} alt={`${event.name} gallery image ${i + 1}`} fill className="object-contain" />
                                                        </div>
                                                    </CarouselItem>
                                                ))}
                                            </CarouselContent>
                                            <CarouselPrevious />
                                            <CarouselNext />
                                        </Carousel>
                                    </DialogContent>
                                    </Dialog>
                                ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    )}
                </Tabs>
            </div>

            <div className="md:col-span-2 space-y-8 mt-8 md:sticky top-24 h-fit">
              <EventActions event={event} />
            </div>
        </div>
        
        {organizer && (
            <div className="mt-16">
                <Separator className="my-8" />
                <div className="flex flex-col md:flex-row items-start gap-8">
                    <Card className="md:w-1/3">
                        <CardHeader className="flex-row items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={organizer.imageUrl} alt={organizer.name} />
                                <AvatarFallback>{organizer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm text-muted-foreground">Organized by</p>
                                <h3 className="text-xl font-bold">{organizer.name}</h3>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{organizer.bio}</p>
                        </CardContent>
                        <CardFooter>
                        <Link href={`/organizers/${event.organizerId}`} className='w-full'>
                            <Button variant="outline" className="w-full">View Profile</Button>
                        </Link>
                        </CardFooter>
                    </Card>
                    <div className="flex-grow">
                        <h2 className="text-2xl font-bold mb-4">More events from {organizer.name}</h2>
                        {otherEventsByOrganizer.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {otherEventsByOrganizer.map((e) => (
                                    <EventCard key={e.id} event={e} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No other events by this organizer at the moment.</p>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
