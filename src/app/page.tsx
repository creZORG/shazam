

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Ticket, Mountain, PartyPopper, Briefcase, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getPosters, getSiteContent } from './admin/content/actions';
import { getHotListings } from './actions';
import type { Event, Tour, FeatureCardContent, PartnerSectionContent } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Metadata } from 'next';
import { Skeleton } from '@/components/ui/skeleton';
import { HomeCarousel } from './_components/HomeCarousel';
import { NewUserCouponModal } from './_components/NewUserCouponModal';

export const metadata: Metadata = {
  title: 'NaksYetu | Tickets for Events, Tours, and Nightlife in Nakuru',
  description: 'Your one-stop platform for tickets to the most exciting concerts, tours, and nightlife across all Nakuru subcounties. Discover what\'s hot and book your next experience!',
  openGraph: {
    title: 'NaksYetu | The Heartbeat of Nakuru\'s Culture & Entertainment',
    description: 'Find and buy tickets for the best events, tours, and nightlife in Nakuru.',
    url: 'https://naksyetu.com',
    images: [
      {
        url: 'https://i.postimg.cc/4yK23PLk/download.png', // Replace with a proper hero image URL
        width: 1200,
        height: 630,
        alt: 'NaksYetu Logo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NaksYetu | Tickets for Events, Tours, and Nightlife in Nakuru',
    description: 'Discover and book tickets for the best events in Nakuru.',
    images: ['https://i.postimg.cc/4yK23PLk/download.png'], // Replace with a proper hero image URL
  },
};


type HotListing = (Event | Tour) & { type: 'event' | 'tour' };

function HotListingCard({ listing, rank }: { listing: HotListing, rank: number }) {
    const isEvent = listing.type === 'event';
    const listingDate = isEvent ? (listing as Event).date : (listing as Tour).startDate;

    const renderPrice = () => {
        if (isEvent) {
            const event = listing as Event;
            if (event.tickets && event.tickets.length > 0) {
                const prices = event.tickets.map(t => Number(t.price)).filter(p => !isNaN(p) && p > 0);
                if (prices.length > 0) {
                    const minPrice = Math.min(...prices);
                    return `From Ksh ${minPrice.toLocaleString()}`;
                }
            }
            return "Free";
        }
        // Tour
        return `Ksh ${(listing as Tour).price.toLocaleString()}`;
    };

    return (
        <Card className="overflow-hidden group flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-primary/20 hover:border-primary">
             <Link href={isEvent ? `/events/${listing.slug || listing.id}` : `/tours/${listing.slug || listing.id}`} className="block">
                <div className="relative aspect-[4/5]">
                    <Image src={listing.imageUrl} alt={listing.name} fill className="object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                     <div className="absolute top-2 right-2">
                        <Badge variant="destructive" className="flex items-center gap-1 bg-gradient-to-r from-primary to-accent border-none text-white">
                            <Award className="h-4 w-4" /> Top #{rank + 1}
                        </Badge>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <p className="font-bold text-lg text-primary">{format(new Date(listingDate), 'eee, MMM d')}</p>
                        <h3 className="font-bold text-2xl truncate" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>{listing.name}</h3>
                    </div>
                </div>
            </Link>
            <CardContent className="p-4 flex-grow flex flex-col justify-between">
                <div className="flex justify-between items-center text-lg font-bold">
                    <p>Price</p>
                    <p className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">{renderPrice()}</p>
                </div>
                <Link href={isEvent ? `/events/${listing.slug || listing.id}` : `/tours/${listing.slug || listing.id}`} className="w-full mt-4">
                    <Button className="w-full">
                        {isEvent ? 'Get Tickets' : 'Book Tour'} <ArrowRight className="ml-2" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    )
}

const defaultFeatureCards: FeatureCardContent[] = [
    { title: 'Events', description: 'From music festivals to tech conferences, find your next experience.', href: '/events', cta: 'Browse Events', imageUrl: 'https://picsum.photos/seed/cat-event/800/600'},
    { title: 'Tours', description: 'Explore the beauty of Nakuru with our curated local tours.', href: '/tours', cta: 'Discover Tours', imageUrl: 'https://picsum.photos/seed/cat-tour/800/600'},
    { title: 'Nightlife', description: 'Discover the hottest parties, DJ sets, and club events happening tonight.', href: '/nightlife', cta: 'Explore Nightlife', imageUrl: 'https://picsum.photos/seed/cat-night/800/600'},
];
const defaultPartnerSection: PartnerSectionContent = {
  title: 'Launch Your Event to the Moon',
  description: 'Are you an event organizer, tour operator, or influencer? NaksYetu provides the platform, tools, and audience to guarantee your success. Manage listings, sell tickets, and engage with your community—all in one place.',
  href: '/partner-with-us',
  cta: 'Start Selling Today',
  imageUrl: 'https://picsum.photos/seed/partner/800/600',
};


export default async function Home() {
  const postersResult = await getPosters();
  const hotListingsResult = await getHotListings();
  const siteContentResult = await getSiteContent();

  const carouselPosters = postersResult.data?.filter(p => p.title.toLowerCase().includes('carousel')) || [];
  const hotListings = hotListingsResult.data || [];
  
  const featureCards = siteContentResult.data?.homepage?.featureCards || defaultFeatureCards;
  const partnerSection = siteContentResult.data?.homepage?.partnerSection || defaultPartnerSection;

  const featureIcons: { [key: string]: React.ElementType } = {
    Events: Ticket,
    Tours: Mountain,
    Nightlife: PartyPopper,
  };


  return (
    <div className="flex flex-col">
      <NewUserCouponModal />
      <HomeCarousel posters={carouselPosters} />

        <section className="py-12 md:py-20 bg-background">
            <div className="container mx-auto px-4">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">What's Hot</span> Right Now
                    </h2>
                    <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Don't miss out on the most popular events and tours people are booking.</p>
                </div>
                {hotListings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {hotListings.map((listing, index) => <HotListingCard key={listing.id} listing={listing} rank={index} />)}
                    </div>
                ) : (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-96" />)}
                    </div>
                )}
            </div>
        </section>


      <section className="py-12 md:py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold">What are you looking for?</h2>
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">From thrilling adventures to vibrant nightlife, your next story starts here.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {featureCards.map(feature => {
                    const Icon = featureIcons[feature.title] || Briefcase;
                    return (
                        <Link key={feature.title} href={feature.href}>
                        <Card className="text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden group">
                            <div className="relative h-48">
                                <Image src={feature.imageUrl} alt={feature.title} fill className="object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Icon className="h-12 w-12 text-white" />
                                </div>
                            </div>
                            <CardHeader>
                                <CardTitle className="mt-4">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-6">{feature.description}</p>
                                <Button variant="outline">{feature.cta} <ArrowRight className="ml-2" /></Button>
                            </CardContent>
                        </Card>
                        </Link>
                    )
                })}
            </div>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">{partnerSection.title}</h2>
              <p className="text-muted-foreground mt-4 max-w-xl">
                {partnerSection.description}
              </p>
              <Link href={partnerSection.href} className="mt-8 inline-block">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-white shadow-lg">
                    <Briefcase className="mr-2"/>
                    {partnerSection.cta}
                </Button>
              </Link>
            </div>
             <div className="relative h-80 rounded-lg overflow-hidden">
                <Image
                    src={partnerSection.imageUrl}
                    alt="Event organizer managing an event"
                    fill
                    className="object-cover"
                />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
