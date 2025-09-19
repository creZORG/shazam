
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { QrCode, CalendarPlus, Share2, Facebook } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { logUserEvent } from '@/app/actions';
import type { Event } from '@/lib/types';
import { format, parseISO } from 'date-fns';

// A simple inline SVG for the WhatsApp icon
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor" />
  </svg>
);

const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.931 6.064-6.931z"/></svg>
);


export function EventActions({ event }: { event: Event; }) {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const { toast } = useToast();
  const shareText = `Check out this event: ${event.name}!`;
  const { user } = useAuth();
  
  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/events/${event.slug || event.id}` : '';

  const handleShare = (platform: string) => {
      if (user) {
          logUserEvent({
              uid: user.uid,
              action: 'share_event',
              eventId: event.id,
              timestamp: Date.now(),
          })
      }
  }

  const getGoogleCalendarUrl = () => {
    const startDate = parseISO(`${event.date}T${event.startTime}`);
    // Default to 2 hours if no end time
    const endDate = event.endDate && event.endTime 
        ? parseISO(`${event.endDate}T${event.endTime}`) 
        : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const formatForGoogle = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'");

    const url = new URL('https://www.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', event.name);
    url.searchParams.append('dates', `${formatForGoogle(startDate)}/${formatForGoogle(endDate)}`);
    url.searchParams.append('details', event.description);
    url.searchParams.append('location', `${event.venue}, ${event.subCounty}`);
    return url.toString();
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions &amp; Sharing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" className="w-full" onClick={() => setIsQrModalOpen(true)}>
          <QrCode className="mr-2 h-5 w-5" />
          Show Event QR Code
        </Button>

        <AlertDialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Scan to view event</AlertDialogTitle>
              <AlertDialogDescription>
                Use your phone camera to scan this code and open the event page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-center p-4">
              <Image 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(eventUrl)}`}
                alt="Event QR Code"
                width={250}
                height={250}
              />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

         <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="w-full">
            <Button variant="outline" className="w-full">
            <CalendarPlus className="mr-2 h-5 w-5" />
            Add to Calendar
            </Button>
        </a>
        <Separator />
        <p className="text-sm font-medium text-center text-muted-foreground">Share this event</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${eventUrl}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" onClick={() => handleShare('whatsapp')}>
              <WhatsAppIcon className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" onClick={() => handleShare('facebook')}>
              <Facebook className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter" onClick={() => handleShare('twitter')}>
              <Twitter className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
              navigator.clipboard.writeText(eventUrl).then(() => toast({ title: 'Link Copied!' }));
              handleShare('copy_link');
            }}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
