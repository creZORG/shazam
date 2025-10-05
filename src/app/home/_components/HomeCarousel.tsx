
'use client';

import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import Image from 'next/image';
import type { Poster } from '@/app/admin/content/actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HomeCarousel({ posters }: { posters: Poster[] }) {
  return (
    <section className="relative w-full h-[60vh] md:h-[70vh]">
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
          {posters.length > 0 ? (
            posters.map((poster) => (
              <CarouselItem key={poster.id}>
                <a href={poster.ctaLink} target="_blank" rel="noopener noreferrer">
                  <div className="relative w-full h-[60vh] md:h-[70vh]">
                    <Image
                      src={poster.imageUrl}
                      alt={poster.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </a>
              </CarouselItem>
            ))
          ) : (
            <CarouselItem>
              <div className="relative w-full h-[60vh] md:h-[70vh]">
                <Image
                  src="https://picsum.photos/seed/hero/1920/1080"
                  alt="Placeholder hero image"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </CarouselItem>
          )}
        </CarouselContent>
      </Carousel>
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center h-full text-center p-4 text-white">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
          The Heartbeat of Culture & Entertainment
        </h1>
        <p className="mt-4 max-w-3xl text-lg md:text-xl" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
          Your one-stop platform for tickets to the most exciting concerts, tours, and nightlife.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link href="/events">
            <Button size="lg" className="shadow-lg transform hover:scale-105 transition-transform">
              Explore Events <ArrowRight className="ml-2" />
            </Button>
          </Link>
          <Link href="/partner-with-us">
            <Button size="lg" variant="outline" className="bg-transparent text-white border-white backdrop-blur-sm hover:bg-white hover:text-black">
              Become a Partner
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
