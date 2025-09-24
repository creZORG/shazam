
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Camera, MapPin, Calendar, User, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getListingById, getOrganizerById } from '@/app/actions';
import type { Event, Tour, Organizer } from '@/lib/types';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import type { Metadata } from 'next';

type Listing = Event | Tour;

export async function generateMetadata({ params, searchParams }: { params: { id: string }, searchParams: { type: 'event' | 'tour' } }): Promise<Metadata> {
  const { data: listingData } = await getListingById(searchParams.type || 'event', params.id);
  const listing = listingData as Listing;

  if (!listing) {
    return {
      title: 'Archive Not Found',
    }
  }
  
  const eventUrl = `https://mov33.com/archives/${listing.id}?type=${searchParams.type}`;

  return {
    title: `Archive: ${listing.name} | Mov33`,
    description: `See the gallery and details from the past event: ${listing.name}. ${listing.description.substring(0, 100)}...`,
    openGraph: {
      title: `Archive: ${listing.name}`,
      description: `Photos and memories from ${listing.name}.`,
      url: eventUrl,
      images: [
        {
          url: listing.imageUrl,
          width: 1200,
          height: 630,
          alt: `Archive of ${listing.name}`,
        },
      ],
      type: 'website',
    },
  }
}

export default async function ArchivePage({ params, searchParams }: { params: { id: string }, searchParams: { type: 'event' | 'tour' } }) {
  
  const { data: listingData, error } = await getListingById(searchParams.type || 'event', params.id);
  
  if (error || !listingData) {
    notFound();
  }
  
  const listing = listingData as Listing;
  const organizerId = listing.organizerId;
  let organizer: Organizer | null = null;
  if(organizerId) {
      organizer = await getOrganizerById(organizerId);
  }

  const isEvent = 'venue' in listing;
  const listingDate = isEvent ? (listing as Event).date : (listing as Tour).startDate;
  const location = isEvent ? `${(listing as Event).venue}, ${(listing as Event).county}` : (listing as Tour).destination;

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        {/* Main Banner Section */}
        <section className="relative w-full h-[40vh] md:h-[50vh]">
            <Image 
                src={listing.imageUrl}
                alt={listing.name}
                fill
                className="object-cover"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
        </section>

        {/* Header Section */}
        <div className="container mx-auto px-4 -mt-20 md:-mt-24 relative z-20">
            <div className="max-w-4xl mx-auto text-center bg-card p-6 md:p-8 rounded-xl shadow-2xl">
                 <p className="font-semibold text-primary">FROM THE ARCHIVES</p>
                <h1 className="text-4xl font-bold mt-2">{listing.name}</h1>
                
                {organizer && (
                     <div className="flex items-center justify-center gap-3 mt-4">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={organizer.imageUrl} />
                            <AvatarFallback>{organizer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="text-lg text-muted-foreground">
                            by <Link href={`/organizers/${organizer.id}`} className="font-semibold text-foreground hover:underline">{organizer.name}</Link>
                        </p>
                    </div>
                )}
               
                <div className="mt-4 flex items-center justify-center gap-x-6 gap-y-2 text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{format(new Date(listingDate), 'EEEE, MMMM d, yyyy')}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{location}</span>
                     {listing.rating && (
                        <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-yellow-400 fill-current" />{listing.rating.average.toFixed(1)} ({listing.rating.count} reviews)</span>
                    )}
                </div>
            </div>
        </div>

        {/* Gallery Section */}
        <div className="container mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-3xl font-bold text-center mb-8">See How It Went</h2>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Camera /> Event Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                    {listing.gallery && listing.gallery.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {listing.gallery?.map((imgUrl, index) => (
                        <Dialog key={index}>
                            <DialogTrigger asChild>
                            <div className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
                                <Image src={imgUrl} alt={`${listing.name} gallery image ${index + 1}`} fill className="object-cover transition-transform group-hover:scale-110" />
                            </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl h-[90vh]">
                            <Carousel className="w-full h-full" opts={{startIndex: index}}>
                                <CarouselContent className="h-full">
                                    {listing.gallery?.map((url, i) => (
                                        <CarouselItem key={i} className="h-full">
                                            <div className="relative h-full">
                                                <Image src={url} alt={`${listing.name} gallery image ${i + 1}`} fill className="object-contain" />
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
                    ) : (
                        <p className="text-muted-foreground text-center py-8">The organizer has not uploaded any gallery images for this event yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
