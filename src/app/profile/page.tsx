
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Eye, Bookmark, Ticket, CheckCircle, ArrowRight, Star, Loader2 } from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { TourCard } from '@/components/tours/TourCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useTransition } from 'react';
import type { Event, Ticket as TicketType, Tour } from '@/lib/types';
import { getUserProfileData, rateEvent, upgradeToInfluencer } from './actions';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type ActiveTab = 'purchased' | 'attended' | 'bookmarked' | 'viewed';
type Listing = Event | Tour;

function AttendedEventCard({ item }: { item: Listing }) {
    const { toast } = useToast();
    const [currentRating, setCurrentRating] = useState(item.rating?.average || 0);
    const date = 'venue' in item ? item.date : item.startDate;

    const handleRating = async (rating: number) => {
        const result = await rateEvent(item.id, rating);
        if (result.success) {
            toast({ title: "Rating Submitted!", description: `You rated "${item.name}" ${rating} stars.` });
            if (result.newAverage) {
                setCurrentRating(result.newAverage);
            }
        } else {
            toast({ variant: 'destructive', title: "Rating Failed", description: result.error });
        }
    };

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>{new Date(date).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 <Image src={item.imageUrl} alt={item.name} width={400} height={300} className="rounded-md object-cover aspect-video" />
            </CardContent>
            <CardFooter className="flex-col items-start gap-2">
                 <p className="text-sm font-medium">Your Rating</p>
                 <StarRating onRatingChange={handleRating} initialRating={currentRating} />
            </CardFooter>
        </Card>
    );
}

export default function ProfilePage() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('purchased');
  const [profileData, setProfileData] = useState<{
      purchased: (TicketType & { event?: Listing })[],
      attended: Listing[],
      bookmarked: Listing[],
      viewed: Listing[],
  }>({ purchased: [], attended: [], bookmarked: [], viewed: [] });
  const [isUpgrading, startUpgradeTransition] = useTransition();

  const isProfileComplete = !!(dbUser?.fullName && dbUser?.phone && dbUser?.profilePicture);

  useEffect(() => {
    if (user && !authLoading) {
      setLoading(true);
      getUserProfileData().then(result => {
        if (result.success && result.data) {
          setProfileData(result.data as any);
        }
        setLoading(false);
      });
    } else if (!user && !authLoading) {
        setLoading(false);
    }
  }, [user, authLoading]);

  const handleUpgradeToInfluencer = () => {
    startUpgradeTransition(async () => {
        const result = await upgradeToInfluencer();
        if (result.success) {
            toast({ title: 'Congratulations!', description: 'You are now an influencer. Redirecting you to your dashboard...' });
            router.push('/influencer');
        } else {
            toast({ variant: 'destructive', title: 'Upgrade Failed', description: result.error });
        }
    });
  }

  const navLinks: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'purchased', label: 'My Tickets', icon: Ticket },
    { id: 'attended', label: 'Attended & Rate', icon: CheckCircle },
    { id: 'bookmarked', label: 'Bookmarked', icon: Bookmark },
    { id: 'viewed', label: 'Viewed', icon: Eye },
  ];
  
  const renderTabContent = () => {
    if (loading) {
      return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    const renderGrid = (items: (any)[]) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
                if (!item) return null;
                const key = item.id;
                // Determine if it's an Event or Tour based on properties
                if (item.type === 'tour') {
                    return <TourCard key={key} tour={item as Tour} />;
                }
                return <EventCard key={key} event={item as Event} />;
            })}
        </div>
    );

    switch(activeTab) {
        case 'purchased':
            return profileData.purchased.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {profileData.purchased.map(ticket => ticket.event && (
                        (ticket.event as Event).type === 'event' 
                            ? <EventCard key={ticket.id} event={ticket.event as Event} />
                            : <TourCard key={ticket.id} tour={ticket.event as Tour} />
                    ))}
                </div>
            ) : <p className="text-muted-foreground text-center py-8">You haven't purchased any tickets yet.</p>;

        case 'attended':
            return profileData.attended.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {profileData.attended.map(item => <AttendedEventCard key={item.id} item={item} />)}
                </div>
            ) : <p className="text-muted-foreground text-center py-8">You haven't attended any events yet. After an event, they'll show up here for you to rate!</p>;

        case 'bookmarked':
            return profileData.bookmarked.length > 0 ? renderGrid(profileData.bookmarked)
             : <p className="text-muted-foreground text-center py-8">You haven't bookmarked any items yet.</p>;

        case 'viewed':
             return profileData.viewed.length > 0 ? renderGrid(profileData.viewed)
             : <p className="text-muted-foreground text-center py-8">You haven't viewed any events recently.</p>;

        default:
            return null;
    }
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
      
      {dbUser.role === 'attendee' && (
          <Card className="max-w-4xl mx-auto mb-12 bg-gradient-to-r from-primary/10 to-accent/10">
            <CardHeader>
              <CardTitle>Grow with NaksYetu</CardTitle>
               <CardDescription>
                Ready to take the next step? Partner with us to organize events or earn as an influencer.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                 <Link href="/partner-with-us" className="w-full">
                 <Button variant="outline" className="w-full justify-between h-12">
                    Become an Organizer
                    <ArrowRight />
                 </Button>
                </Link>
                {isProfileComplete ? (
                    <Button className="w-full justify-between h-12" onClick={handleUpgradeToInfluencer} disabled={isUpgrading}>
                        {isUpgrading ? <Loader2 className="animate-spin" /> : <>Become an Influencer <ArrowRight /></>}
                    </Button>
                ) : (
                    <Link href="/profile/edit" className="w-full">
                        <Button variant="outline" className="w-full justify-between h-12">
                            Complete Profile to be an Influencer
                            <ArrowRight />
                        </Button>
                    </Link>
                )}
            </CardContent>
          </Card>
      )}

        <div className="sticky top-14 z-40 flex justify-center py-2 bg-background/80 backdrop-blur-sm -mx-4 px-4">
            <div className="bg-muted p-1 rounded-full shadow-lg">
                <nav className="flex items-center space-x-1 text-sm font-medium">
                    {navLinks.map((link) => {
                         const isActive = activeTab === link.id;
                         return (
                            <Button
                                key={link.id}
                                variant={isActive ? 'default' : 'ghost'}
                                onClick={() => setActiveTab(link.id)}
                                className={cn(
                                    "transition-colors flex items-center gap-2 rounded-full px-3 py-1.5",
                                    isActive && "shadow"
                                )}
                            >
                                <link.icon className="h-5 w-5" />
                                <span className={cn(!isActive && "hidden md:inline")}>{link.label}</span>
                            </Button>
                         )
                    })}
                </nav>
            </div>
        </div>

      <div className="mt-8">
        {renderTabContent()}
      </div>
    </div>
  );
}
