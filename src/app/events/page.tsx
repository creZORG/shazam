

'use client';

import React from 'react';
import Image from 'next/image';
import { EventCard } from '@/components/events/EventCard';
import { EventCardSkeleton } from '@/components/events/EventCardSkeleton';
import { AdvancedEventFilters } from '@/components/events/AdvancedEventFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Event, AdSubmission } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { useEffect, useState, useMemo, useCallback } from 'react';
import { getPosters, getApprovedAds } from '@/app/admin/content/actions';
import type { Poster } from '@/app/admin/content/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, MapPin, Calendar, AlertTriangle, ArrowRight, Loader2, X, Megaphone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Badge } from '@/components/ui/badge';
import { getFilteredEvents, type FilterState } from './actions';
import { AdCard } from '@/components/advertising/AdCard';
import { trackPosterInteraction } from '@/app/admin/content/actions';
import Link from 'next/link';

function PosterCard({ poster }: { poster: Poster }) {
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    
    const handleShareClick = (e: React.MouseEvent) => {
        e.preventDefault();
        trackPosterInteraction(poster.id, 'shares');
        setShareModalOpen(true);
    };

    const handleDetailsClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setDetailsModalOpen(true);
    }
    
    const handleConfirmDetails = () => {
        trackPosterInteraction(poster.id, 'clicks');
        window.open(poster.ctaLink, '_blank');
    }

    const eventDate = poster.date ? new Date(poster.date) : null;
    const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/events` : '';
    const shareText = `Check out this event: ${poster.title}!`;
    
    const pricingType = poster.pricingType || 'Paid';

    return (
        <>
            <Card className="overflow-hidden group flex flex-col">
                <div className="relative aspect-[4/5]">
                    <Image src={poster.imageUrl} alt={poster.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute top-2 right-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background backdrop-blur-sm" onClick={handleShareClick}>
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="absolute bottom-0 p-4 w-full">
                        {eventDate && <p className="font-bold text-primary text-sm">{format(eventDate, 'eee, MMM d')}</p>}
                        <h3 className="font-bold text-white text-lg truncate" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>{poster.title}</h3>
                         {poster.venue && <p className="text-xs text-white/80 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3"/> {poster.venue}</p>}
                    </div>
                </div>
                <CardContent className="p-4 flex-grow flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                        <Badge variant={pricingType === 'Free' ? 'default' : 'secondary'}>{pricingType}</Badge>
                         <Button variant="outline" size="sm" onClick={handleDetailsClick}>Details</Button>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
                        <AlertDialogTitle className="text-center">External Event Notice</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                           This is a third-party event listing. Clicking "Proceed" will open a new tab to the event's external page.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDetails}>Proceed <ArrowRight className="ml-2 h-4 w-4" /></AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Share "{poster.title}"</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="flex justify-around py-4">
                        <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${eventUrl}`)}`} target="_blank" rel="noopener noreferrer" className="text-center">WhatsApp</a>
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`} target="_blank" rel="noopener noreferrer" className="text-center">Facebook</a>
                        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="text-center">Twitter</a>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function AdPlaceholderCard() {
  return (
    <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 border-2 border-dashed hover:border-primary">
       <CardContent className="p-4 flex flex-col flex-grow items-center justify-center text-center">
        <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-bold text-lg">Your Ad Here</h3>
        <p className="text-sm text-muted-foreground mt-2">Reach thousands of event-goers in Nakuru. Rent this ad space.</p>
        <Link href="/advertising" className='w-full'>
            <Button className="w-full mt-4" size="sm">
              Advertise With Us
            </Button>
        </Link>
      </CardContent>
    </Card>
  );
}


export default function EventsPage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [carouselPosters, setCarouselPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const [approvedAds, setApprovedAds] = useState<AdSubmission[]>([]);

  const fetchInitialData = useCallback(async (filters: FilterState) => {
    setIsSearching(true);
    await Promise.all([
      getFilteredEvents(filters), 
      getPosters(),
      getApprovedAds()
    ]).then(([eventsResult, postersResult, adsResult]) => {
      if (eventsResult.success && eventsResult.data) {
        setAllEvents(eventsResult.data);
      } else {
        setError(eventsResult.error || "Failed to load events.");
        setAllEvents([]);
      }

      if (postersResult.data) {
        setCarouselPosters(postersResult.data.filter(p => p.title.toLowerCase().includes('carousel')));
      }

      if (adsResult.data && adsResult.data.length > 0) {
        // Filter for ads that are NOT adult content for this page
        setApprovedAds(adsResult.data.filter(ad => !ad.isAdultContent));
      }

      setIsSearching(false);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchInitialData({});
  }, [fetchInitialData]);

  const handleFilterChange = useCallback(async (filters: FilterState) => {
    setIsSearching(true);
    setActiveFilters(filters);
    const result = await getFilteredEvents(filters);
     if (result.success && result.data) {
      setAllEvents(result.data);
    } else {
      setError(result.error || "Failed to apply filters.");
      setAllEvents([]);
    }
    setIsSearching(false);
  }, []);
  
  const clearFilter = (filterKey: keyof FilterState) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterKey];
    handleFilterChange(newFilters);
  };

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: Event[] = [];
    const past: Event[] = [];

    allEvents.forEach(event => {
      const isEventPast = new Date(event.date) < new Date();
      if (event.status === 'archived' || isEventPast) {
        past.push(event);
      } else {
        upcoming.push(event);
      }
    });
    
    return {
      upcomingEvents: upcoming,
      pastEvents: past,
    };
  }, [allEvents]);
  
  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  const renderSkeletons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => <EventCardSkeleton key={i} />)}
    </div>
  );


  return (
    <div className="flex flex-col">
       <section className="relative w-full h-[50vh]">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <Carousel
          className="w-full h-full"
          plugins={[
            Autoplay({
              delay: 5000,
              stopOnInteraction: false,
            }),
          ]}
          opts={{
            loop: true,
          }}
        >
          <CarouselContent>
            {loading || carouselPosters.length === 0 ? (
                 <CarouselItem>
                    <div className="relative w-full h-[50vh] bg-muted animate-pulse" />
                </CarouselItem>
            ) : carouselPosters.map((poster) => (
                <CarouselItem key={poster.id}>
                    <div className="relative w-full h-[50vh]">
                        <Image
                            src={poster.imageUrl}
                            alt={poster.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      <section className="py-8 md:py-12 bg-background">
        <div className="container mx-auto px-4">
            <AdvancedEventFilters onFilterChange={handleFilterChange} isSearching={isSearching} />
            {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Applied Filters:</span>
                    {Object.entries(activeFilters).map(([key, value]) => (
                       <Badge key={key} variant="secondary" className="capitalize">
                           {key}: {value}
                           <button onClick={() => clearFilter(key as keyof FilterState)} className="ml-2 rounded-full hover:bg-background/50 p-0.5">
                            <X className="h-3 w-3"/>
                           </button>
                       </Badge>
                    ))}
                </div>
            )}
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto">
                <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
                <TabsTrigger value="past">Past Events</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="mt-8">
                {loading || isSearching ? renderSkeletons() :
                upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {upcomingEvents.map((item, index) => <EventCard key={(item as Event).id || index} event={item as Event} />)}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-12">No upcoming events match your criteria.</p>
                )}
              </TabsContent>
              <TabsContent value="past" className="mt-8">
                 {loading || isSearching ? renderSkeletons() :
                 pastEvents.length > 0 ? (
                     <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {pastEvents.map((item) => <EventCard key={(item as Event).id} event={item as Event} />)}
                     </div>
                 ) : (
                    <p className="text-center text-muted-foreground py-12">No past events found.</p>
                 )}
              </TabsContent>
            </Tabs>
        </div>
      </section>
    </div>
  );
}
