
'use client';

import { NightlifeCard } from "@/components/nightlife/NightlifeCard";
import { NightlifeFilters, NightlifeFilterState } from "@/components/nightlife/NightlifeFilters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getListings } from "../actions";
import type { AdSubmission, NightlifeEvent } from "@/lib/types";
import { Loader2, Megaphone } from "lucide-react";
import { getApprovedAds } from "../admin/content/actions";
import { AdCard } from "@/components/advertising/AdCard";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NightlifeCardSkeleton } from "@/components/nightlife/NightlifeCardSkeleton";

function AdPlaceholderCard() {
  return (
    <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 border-2 border-dashed hover:border-purple-500/50">
       <CardContent className="p-4 flex flex-col flex-grow items-center justify-center text-center">
        <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-bold text-lg">Your Ad Here</h3>
        <p className="text-sm text-muted-foreground mt-2">Promote your brand or event in the nightlife section.</p>
        <Link href="/advertising" className='w-full'>
            <Button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500" size="sm">
              Advertise With Us
            </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function NightlifePage() {
    const [showAgeGate, setShowAgeGate] = useState(true);
    const router = useRouter();
    const [allEvents, setAllEvents] = useState<NightlifeEvent[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<NightlifeEvent[]>([]);
    const [approvedAds, setApprovedAds] = useState<AdSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const isVerified = typeof window !== 'undefined' ? localStorage.getItem('ageVerified') : null;
        if (isVerified) {
            setShowAgeGate(false);
            fetchData();
        } else {
            setLoading(false);
        }
    }, []);

    async function fetchData() {
        setLoading(true);
        const [listingsResult, adsResult] = await Promise.all([
            getListings('nightlifeEvents'),
            getApprovedAds(),
        ]);
        
        if (listingsResult.listings) {
            const events = listingsResult.listings as NightlifeEvent[];
            setAllEvents(events);
            setFilteredEvents(events);
        }
        if (adsResult.data) {
            setApprovedAds(adsResult.data);
        }
        setLoading(false);
    }

    const handleAgeVerification = () => {
        localStorage.setItem('ageVerified', 'true');
        setShowAgeGate(false);
        fetchData();
    }

    const handleFilterChange = (filters: NightlifeFilterState) => {
        setIsSearching(true);
        let events = [...allEvents];

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            events = events.filter(event => 
                event.eventName.toLowerCase().includes(searchTerm) ||
                event.clubName.toLowerCase().includes(searchTerm) ||
                event.musicPolicy.some(m => m.toLowerCase().includes(searchTerm)) ||
                event.specialAppearances?.some(s => s.toLowerCase().includes(searchTerm))
            );
        }

        if (filters.club && filters.club !== 'all') {
            events = events.filter(event => event.clubName === filters.club);
        }

        if (filters.entry && filters.entry !== 'all') {
            if (filters.entry === 'free') {
                events = events.filter(event => event.entranceFee.toLowerCase().includes('free'));
            } else { // paid
                events = events.filter(event => !event.entranceFee.toLowerCase().includes('free'));
            }
        }
        
        setFilteredEvents(events);
        // Simulate search time
        setTimeout(() => setIsSearching(false), 300);
    }
    
    const nightlifeItems = useMemo(() => {
        let adToDisplay: AdSubmission | null = null;
        if (approvedAds.length > 0) {
            const weights = approvedAds.map(ad => ad.priority);
            const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
            let random = Math.random() * totalWeight;

            for(let i = 0; i < approvedAds.length; i++) {
                random -= weights[i];
                if (random < 0) {
                    adToDisplay = approvedAds[i];
                    break;
                }
            }
        }
        
        const items: (NightlifeEvent | AdSubmission | { type: 'ad_placeholder' })[] = [...filteredEvents];

        if (adToDisplay) {
            items.unshift(adToDisplay);
        } else {
            items.unshift({ type: 'ad_placeholder' });
        }
        
        return items;
    }, [filteredEvents, approvedAds]);


    return (
        <div className="min-h-screen">
            <AlertDialog open={showAgeGate}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Age Verification</AlertDialogTitle>
                    <AlertDialogDescription>
                        This section contains content that may be considered adult-oriented, including information about nightlife and alcohol. Please confirm you are 18 years of age or older to proceed.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => router.push('/')}>I am Under 18</AlertDialogAction>
                        <AlertDialogAction onClick={handleAgeVerification}>I am Over 18</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

           <section className="relative py-12 md:py-16 text-center bg-gradient-to-t from-background via-black/5 to-transparent overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-400/10 opacity-30 animate-gradient-x"></div>
             <div className="relative z-10 container mx-auto px-4">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" style={{ textShadow: '0 2px 15px hsla(var(--night-primary), 0.2), 0 4px 25px hsla(var(--night-accent), 0.2)' }}>
                    Nakuru Nightlife
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
                    Discover the hottest parties, DJ sets, and club events happening in Nakuru.
                </p>
            </div>
          </section>

          <section className="py-8 md:py-12 bg-background">
            <div className="container mx-auto px-4">
              <NightlifeFilters events={allEvents} onFilterChange={handleFilterChange} isSearching={isSearching} />
            </div>
          </section>

          <div className="container mx-auto px-4 pb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(loading || isSearching) && !showAgeGate ? (
                 [...Array(8)].map((_, i) => <NightlifeCardSkeleton key={i} />)
              ) : nightlifeItems.length > 1 || (nightlifeItems.length === 1 && 'type' in nightlifeItems[0]) ? (
                nightlifeItems.map((item, index) => {
                    if ('type' in item && item.type === 'ad_placeholder') return <AdPlaceholderCard key="ad-placeholder" />;
                    if ('campaignName' in item) return <AdCard key={(item as AdSubmission).id || index} ad={item as AdSubmission} isNightlife={true} />;
                    return <NightlifeCard key={(item as NightlifeEvent).id} event={item as NightlifeEvent} />;
                })
              ) : (
                <div className="col-span-full text-center py-20">
                    <p className="text-muted-foreground">No nightlife events found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
}
