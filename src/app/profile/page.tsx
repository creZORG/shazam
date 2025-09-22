
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Award, Ticket, Mountain, Loader2 } from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { TourCard } from '@/components/tours/TourCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import type { Event, Ticket as TicketType, Tour } from '@/lib/types';
import { getUserProfileData } from './actions';

type Listing = Event | Tour;

export default function ProfilePage() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{
      purchased: (TicketType & { listing?: Listing })[],
      loyaltyPoints: number,
  }>({ purchased: [], loyaltyPoints: 0 });

  useEffect(() => {
    if (user && !authLoading) {
      setLoading(true);
      getUserProfileData().then(result => {
          if (result.success && result.data) {
            setProfileData(result.data as any);
          }
          setLoading(false);
      })
    } else if (!user && !authLoading) {
        setLoading(false);
    }
  }, [user, authLoading]);
  
  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return profileData.purchased.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profileData.purchased.map(ticket => ticket.listing && (
                (ticket.listing as Listing).type === 'event' 
                    ? <EventCard key={ticket.id} event={ticket.listing as Event} />
                    : <TourCard key={ticket.id} tour={ticket.listing as Tour} />
            ))}
        </div>
    ) : <p className="text-muted-foreground text-center py-8">You haven't purchased any tickets yet.</p>;
  };


  if (authLoading || !dbUser || !user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto" />
        <p className="mt-2">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Card className="max-w-4xl mx-auto mb-12">
        <CardHeader className="flex flex-col sm:flex-row items-center gap-6 p-6">
          <Avatar className="h-24 w-24 border-2 border-primary">
            <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
            <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">{user.displayName}</h1>
                <Badge variant="secondary" className="capitalize">{dbUser.role.replace('-', ' ')}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{user.email}</p>
             <Link href="/profile/edit">
                <Button variant="outline" size="sm" className="mt-4">Edit Profile</Button>
            </Link>
          </div>
        </CardHeader>
      </Card>
      
       <div className="max-w-4xl mx-auto mb-12 grid md:grid-cols-3 gap-6">
        <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
                <Award className="h-5 w-5 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{profileData.loyaltyPoints.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Earn points on every purchase</p>
            </CardContent>
        </Card>
        <Link href="/events">
            <Card className="h-full hover:shadow-primary/20 hover:border-primary/50 transition-all">
                <CardHeader className="flex-row items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Ticket className="h-8 w-8" />
                    </div>
                    <div>
                        <CardTitle>Explore Events</CardTitle>
                        <CardDescription>Find your next concert.</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        </Link>
        <Link href="/tours">
             <Card className="h-full hover:shadow-primary/20 hover:border-primary/50 transition-all">
                <CardHeader className="flex-row items-center gap-4">
                     <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Mountain className="h-8 w-8" />
                    </div>
                    <div>
                        <CardTitle>Discover Tours</CardTitle>
                        <CardDescription>Experience Nakuru.</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        </Link>
      </div>

       <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">My Tickets</h2>
            {renderContent()}
        </div>
    </div>
  );
}
