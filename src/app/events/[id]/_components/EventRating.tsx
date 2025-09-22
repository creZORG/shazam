
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/ui/star-rating';
import { Button } from '@/components/ui/button';
import { rateEvent, canUserRateEvent } from '@/app/profile/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export function EventRating({ event }: { event: Event }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userCanRate, setUserCanRate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      canUserRateEvent(user.uid, event.id).then(canRate => {
        setUserCanRate(canRate);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, event.id]);

  const handleRatingSubmit = async (rating: number) => {
    setIsSubmitting(true);
    const result = await rateEvent(event.id, rating);
    if (result.success) {
      toast({ title: 'Thank you for your rating!' });
      // Here you might want to refresh the event data to show the new average rating
    } else {
      toast({ variant: 'destructive', title: 'Rating Failed', description: result.error });
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This Event has Passed</CardTitle>
          <CardDescription>Loading your rating options...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>This Event has Passed</CardTitle>
          <CardDescription>Log in to rate this event.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full">Log In to Rate</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }
  
  if (!userCanRate) {
     return (
       <Card>
        <CardHeader>
          <CardTitle>This Event has Passed</CardTitle>
          <CardDescription>Only attendees who purchased tickets can rate this event.</CardDescription>
        </CardHeader>
      </Card>
     )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>How was the event?</CardTitle>
        <CardDescription>Your feedback helps other attendees and the organizer.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <StarRating onRatingChange={handleRatingSubmit} />
        {isSubmitting && <Loader2 className="animate-spin" />}
      </CardContent>
    </Card>
  );
}
