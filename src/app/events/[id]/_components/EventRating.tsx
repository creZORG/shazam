
'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function EventRating() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate This Event</CardTitle>
        <CardDescription>Event rating will be available after the event has concluded. Attendees will receive a link to share their feedback.</CardDescription>
      </CardHeader>
    </Card>
  );
}
