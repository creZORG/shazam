
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Calendar, Ticket, Share2, Bookmark, Route } from 'lucide-react';
import type { Tour, UserEvent } from '@/lib/types';
import { Button } from '../ui/button';
import { formatDistanceStrict } from 'date-fns';
import { toggleBookmark, logUserEvent } from '@/app/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';

interface TourCardProps {
  tour: Tour;
}

export function TourCard({ tour }: TourCardProps) {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const hoverStart = useRef<number | null>(null);
  const duration = formatDistanceStrict(new Date(tour.startDate), new Date(tour.endDate));
  
  useEffect(() => {
    if (dbUser?.bookmarkedEvents?.includes(tour.id)) {
      setIsBookmarked(true);
    } else {
      setIsBookmarked(false);
    }
  }, [dbUser, tour.id]);
  
  const handleInteraction = (action: UserEvent['action'], durationMs?: number) => {
    if (user) {
      logUserEvent({
        uid: user.uid,
        action: action,
        eventId: tour.id, // Use eventId consistently for both events and tours
        timestamp: Date.now(),
        durationMs: durationMs,
      });
    }
  };

  const handleMouseEnter = () => {
    hoverStart.current = Date.now();
  };

  const handleMouseLeave = () => {
    if (hoverStart.current) {
      const duration = Date.now() - hoverStart.current;
      handleInteraction('hover_event', duration);
      hoverStart.current = null;
    }
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
        toast({
            title: "Please log in",
            description: "You need to be logged in to bookmark tours.",
        });
        return;
    }

    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState); // Optimistic UI update
    
    const result = await toggleBookmark(tour.id, user.uid);

    if (!result.success) {
      setIsBookmarked(!newBookmarkState); // Revert on failure
      toast({
          variant: "destructive",
          title: "Failed to bookmark",
          description: result.error,
      });
    }
  };

  const cardContent = (
    <Card 
        className="overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
    >
      <div className="relative w-full h-48">
        <Image
          src={tour.imageUrl}
          alt={tour.name}
          data-ai-hint={tour.imageHint}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background backdrop-blur-sm" onClick={(e) => { e.preventDefault(); alert("Share functionality coming soon!")}}>
                  <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background backdrop-blur-sm" onClick={handleBookmarkClick}>
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? 'text-primary fill-current' : ''}`} />
              </Button>
          </div>
        </div>
      </div>
      <CardContent className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-lg truncate group-hover:text-primary">{tour.name}</h3>
        <div className="text-sm text-muted-foreground mt-2 space-y-1.5 flex-grow">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            <span className="truncate font-semibold">{tour.startingPoint}</span>
            <span className="text-xs text-muted-foreground">to</span>
            <span className="truncate font-semibold">{tour.destination}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="capitalize">{duration}</span>
          </div>
            <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{tour.availability}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {`Ksh ${tour.price.toLocaleString()}`}
          </span>
            <div className="flex items-center text-sm font-medium text-muted-foreground">
              <Ticket className="w-4 h-4 mr-1 text-primary" />
              <span>Book Now</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Link href={`/tours/${tour.slug || tour.id}`} onClick={() => handleInteraction('click_event')}>
      {cardContent}
    </Link>
  );
}
