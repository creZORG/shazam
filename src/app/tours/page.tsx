
'use client';

import { TourCard } from "@/components/tours/TourCard";
import { TourFilters } from "@/components/tours/TourFilters";
import type { Tour } from "@/lib/types";
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { useEffect, useState, useMemo, useCallback } from 'react';
import { getPosters, Poster } from '@/app/admin/content/actions';
import { getFilteredTours, FilterState } from './actions';
import { Skeleton } from "@/components/ui/skeleton";
import { TourCardSkeleton } from "./loading";

export default function ToursPage() {
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [filteredTours, setFilteredTours] = useState<Tour[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [carouselPosters, setCarouselPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      getFilteredTours({}),
      getPosters()
    ]).then(([toursResult, postersResult]) => {
      if (toursResult.error) {
        setError(toursResult.error);
      } else {
        setAllTours(toursResult.data || []);
        setFilteredTours(toursResult.data || []);
      }

      if (postersResult.data) {
        setCarouselPosters(postersResult.data.filter(p => p.title.toLowerCase().includes('carousel')));
      }

      setLoading(false);
    });
  }, []);
  
  useEffect(() => {
      fetchInitialData();
  }, [fetchInitialData]);

  const handleFilterChange = async (filters: FilterState) => {
    setIsSearching(true);
    const result = await getFilteredTours(filters);
    if (result.success && result.data) {
      setFilteredTours(result.data);
    } else {
      setError(result.error || "Failed to apply filters.");
      setFilteredTours([]);
    }
    setIsSearching(false);
  };
  
  const uniqueDestinations = useMemo(() => {
    const destinations = allTours.map(tour => tour.destination);
    return [...new Set(destinations)];
  }, [allTours]);

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
            {carouselPosters.length > 0 ? carouselPosters.map((poster) => (
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
            )) : PlaceHolderImages.filter(i => i.id.startsWith('tour')).slice(0, 1).map(p => (
                 <CarouselItem key={p.id}>
                    <div className="relative w-full h-[50vh]">
                        <Image
                            src={p.imageUrl}
                            alt={p.description}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
         <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4 text-white">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
                Discover Nakuru's Hidden Gems
            </h1>
            <p className="mt-4 max-w-2xl text-lg md:text-xl" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
                Embark on unforgettable journeys, from the majestic Lake Nakuru to the historic Menengai Crater.
            </p>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-background">
        <div className="container mx-auto px-4">
            <TourFilters onFilterChange={handleFilterChange} isSearching={isSearching} destinations={uniqueDestinations} />
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Available Tours</h2>
          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <TourCardSkeleton key={i} />)}
            </div>
          ) : isSearching ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <TourCardSkeleton key={i} />)}
            </div>
          ) : filteredTours.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTours.map((tour) => (
                <TourCard key={tour.id} tour={tour as Tour} />
                ))}
            </div>
          ) : (
             <p className="text-center text-muted-foreground py-12">No tours found matching your criteria.</p>
          )}
        </div>
      </section>
    </div>
  );
}
