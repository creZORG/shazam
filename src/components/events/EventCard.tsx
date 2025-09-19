

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { MapPin, Ticket, Share2, Bookmark, Twitter, Facebook, Link as LinkIcon, Eye } from 'lucide-react';
import type { Event, UserEvent } from '@/lib/types';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { logUserEvent, toggleBookmark } from '@/app/actions';
import { useAuth } from '@/hooks/use-auth';
import { useRef, useState, useEffect } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface EventCardProps {
  event: Event;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      fill="currentColor"
    />
  </svg>
);

export function EventCard({ event }: EventCardProps) {
  const { user, dbUser } = useAuth();
  const hoverStart = useRef<number | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { toast } = useToast();
  
  const isExternal = event.ticketingType === 'external';
  const eventDate = new Date(event.date);
  const isPast = event.status === 'archived' || eventDate < new Date();

  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}${isPast ? `/archives/${event.id}?type=event` : `/events/${event.slug || event.id}`}` : '';
  const shareText = `Check out this event: ${event.name}!`;

  useEffect(() => {
    // Check user's bookmarks when dbUser is available
    if (dbUser?.bookmarkedEvents?.includes(event.id)) {
      setIsBookmarked(true);
    } else {
      setIsBookmarked(false);
    }
  }, [dbUser, event.id]);

  const handleInteraction = (action: UserEvent['action'], durationMs?: number) => {
    if (user) {
      logUserEvent({
        uid: user.uid,
        action: action,
        eventId: event.id,
        timestamp: Date.now(),
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
        // Optionally, prompt the user to log in
        toast({
            title: "Please log in",
            description: "You need to be logged in to bookmark events.",
        })
        return;
    }

    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState); // Optimistic UI update
    handleInteraction('bookmark_event');
    
    const result = await toggleBookmark(event.id, user.uid);

    if (!result.success) {
      // Revert the state if the server action fails
      setIsBookmarked(!newBookmarkState);
      toast({
          variant: "destructive",
          title: "Failed to bookmark",
          description: result.error,
      })
    }
  };
  
  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleInteraction('share_event');
    setIsShareModalOpen(true);
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast({ title: "Link Copied!", description: "Event link copied to your clipboard." });
    handleInteraction('share_event');
  };

  const renderPrice = () => {
    if (isPast) return null;

    if (isExternal) {
      return (
        <span className="text-lg font-bold text-accent">
          {event.externalPrice}
        </span>
      );
    }
    if (event.tickets && event.tickets.length > 0) {
        const prices = event.tickets.map(t => Number(t.price)).filter(p => !isNaN(p) && p > 0);
        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            return (
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  From Ksh {minPrice.toLocaleString()}
              </span>
            );
        }
    }
    return (
      <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
        Free
      </span>
    );
  };
  
  const renderButton = () => {
    if (isPast) {
        return (
            <div className="flex items-center text-sm font-medium text-muted-foreground">
                <Eye className="w-4 h-4 mr-1" />
                <span>View Details</span>
            </div>
        )
    }
    if (isExternal) {
        return (
             <div className="flex items-center text-sm font-medium text-accent">
              <span>Details</span>
            </div>
        )
    }
    const remaining = event.remainingTickets || event.tickets?.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
    return (
        <div className="flex items-center text-sm font-medium">
            <Ticket className="w-4 h-4 mr-1 text-primary" />
            <span>{remaining} left</span>
        </div>
    )
  }
  
  const cardContent = (
    <Card 
        className="overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
    >
      <div className="relative w-full aspect-[3/4]">
        <Image
          src={event.imageUrl}
          alt={event.name}
          data-ai-hint={event.imageHint}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 text-center shadow-lg w-14">
            <p className="text-xs font-bold uppercase text-red-500">{format(eventDate, 'eee')}</p>
            <p className="text-2xl font-extrabold">{format(eventDate, 'd')}</p>
            <p className="text-xs font-bold uppercase text-muted-foreground">{format(eventDate, 'MMM')}</p>
        </div>

        <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background backdrop-blur-sm" onClick={handleShareClick}>
                    <Share2 className="h-4 w-4" />
                </Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 hover:bg-background backdrop-blur-sm" onClick={handleBookmarkClick}>
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'text-primary fill-current' : ''}`} />
                </Button>
            </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="font-bold text-lg truncate group-hover:text-primary">{event.name}</h3>
            <div className="flex items-center gap-2 text-sm mt-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{event.venue}</span>
            </div>
             <div className="flex items-center justify-between mt-2">
              {renderPrice()}
              {renderButton()}
            </div>
        </div>
      </div>
    </Card>
  );

  const ShareModal = () => (
    <AlertDialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Share "{event.name}"</AlertDialogTitle>
                <AlertDialogDescription>
                    Share this event with your friends on social media.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-around py-4">
                 <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${eventUrl}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary">
                    <WhatsAppIcon className="h-8 w-8" />
                    <span>WhatsApp</span>
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary">
                    <Facebook className="h-8 w-8" />
                    <span>Facebook</span>
                </a>
                 <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter" className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary">
                    <Twitter className="h-8 w-8" />
                    <span>Twitter</span>
                </a>
                 <button onClick={handleCopyLink} aria-label="Copy Link" className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary">
                    <LinkIcon className="h-8 w-8" />
                    <span>Copy Link</span>
                </button>
            </div>
             <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );

  const content = (
    <>
      {cardContent}
      <ShareModal />
    </>
  );

  const destinationUrl = isPast ? `/archives/${event.id}?type=event` : `/events/${event.slug || event.id}`;

  if (isExternal) {
    return (
        <a href={event.slug} target="_blank" rel="noopener noreferrer" className="cursor-pointer" onClick={() => handleInteraction('click_event')}>
            {content}
        </a>
    )
  }

  return (
    <Link href={destinationUrl} onClick={() => handleInteraction('click_event')}>
      {content}
    </Link>
  );
}
