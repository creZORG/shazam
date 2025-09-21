
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Eye, Bookmark, Ticket, CheckCircle, ArrowRight, Star, Loader2, Gift, Mountain, PartyPopper } from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { TourCard } from '@/components/tours/TourCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useTransition } from 'react';
import type { Event, Ticket as TicketType, Tour, Promocode } from '@/lib/types';
import { getUserProfileData, rateEvent, upgradeToInfluencer } from './actions';
import { getUserCoupons } from '@/app/organizer/promocodes/actions';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';


type ActiveView = 'purchased' | 'attended' | 'bookmarked' | 'coupons';
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

function CouponCard({ coupon }: { coupon: Promocode }) {
    const discountText = coupon.discountType === 'percentage'
        ? `${coupon.discountValue}% OFF`
        : `Ksh ${coupon.discountValue} OFF`;
        
    return (
         <Card className="bg-muted/30">
            <CardHeader>
                <div className="flex justify-between items-start">
                     <CardTitle className="text-2xl font-mono text-primary">{coupon.code}</CardTitle>
                     <Badge variant="secondary">{discountText}</Badge>
                </div>
                <CardDescription>
                    Valid for: {coupon.listingName}
                </CardDescription>
            </CardHeader>
             <CardContent>
                <p className="text-sm text-muted-foreground">
                    {coupon.expiresAt ? `Expires on ${format(new Date(coupon.expiresAt), 'PP')}` : 'No expiration date.'}
                </p>
            </CardContent>
        </Card>
    );
}

export default function ProfilePage() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('purchased');
  const [profileData, setProfileData] = useState<{
      purchased: (TicketType & { listing?: Listing })[],
      attended: Listing[],
      bookmarked: Listing[],
  }>({ purchased: [], attended: [], bookmarked: [] });
  const [coupons, setCoupons] = useState<Promocode[]>([]);
  const [isUpgrading, startUpgradeTransition] = useTransition();

  const isProfileComplete = !!(dbUser?.fullName && dbUser?.phone && dbUser?.profilePicture);

  useEffect(() => {
    if (user && !authLoading) {
      setLoading(true);
      Promise.all([
          getUserProfileData(),
          getUserCoupons(user.uid)
      ]).then(([profileResult, couponResult]) => {
          if (profileResult.success && profileResult.data) {
            setProfileData(profileResult.data as any);
          }
           if (couponResult.success && couponResult.data) {
            setCoupons(couponResult.data);
          }
          setLoading(false);
      })
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
  
  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    const renderGrid = (items: (any)[]) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
                if (!item) return null;
                const key = item.id;
                if (item.type === 'tour') {
                    return <TourCard key={key} tour={item as Tour} />;
                }
                return <EventCard key={key} event={item as Event} />;
            })}
        </div>
    );

    switch(activeView) {
        case 'purchased':
            return profileData.purchased.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {profileData.purchased.map(ticket => ticket.listing && (
                        (ticket.listing as Listing).type === 'event' 
                            ? <EventCard key={ticket.id} event={ticket.listing as Event} />
                            : <TourCard key={ticket.id} tour={ticket.listing as Tour} />
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
             : <p className="text-muted-foreground text-center py-8">You haven't bookmarked any events.</p>;

        case 'coupons':
            return coupons.length > 0 ? (
                <div className="max-w-2xl mx-auto space-y-4">
                    {coupons.map(coupon => <CouponCard key={coupon.id} coupon={coupon} />)}
                </div>
            ) : <p className="text-muted-foreground text-center py-8">You don't have any active coupons.</p>;

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

    const tabItems = [
        { value: "purchased", icon: Ticket, label: "My Tickets" },
        { value: "attended", icon: Star, label: "Attended & Rate" },
        { value: "bookmarked", icon: Bookmark, label: "Bookmarked" },
        { value: "coupons", icon: Gift, label: `My Coupons (${coupons.length})` },
    ];

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
      
      <div className="max-w-4xl mx-auto mb-12 grid md:grid-cols-2 gap-6">
        <Link href="/events">
            <Card className="h-full hover:shadow-primary/20 hover:border-primary/50 transition-all">
                <CardHeader className="flex-row items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Ticket className="h-8 w-8" />
                    </div>
                    <div>
                        <CardTitle>Explore Events</CardTitle>
                        <CardDescription>Find your next concert or festival.</CardDescription>
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
                        <CardDescription>Experience the beauty of Nakuru.</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        </Link>
      </div>

        <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm py-4 -mx-4 px-4 mb-8 border-b">
             <div className="flex justify-center">
                 <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ActiveView)} className="w-auto">
                    <TabsList className="p-1.5 h-auto rounded-full bg-muted border shadow-md">
                        {tabItems.map(tab => (
                             <TabsTrigger 
                                key={tab.value}
                                value={tab.value} 
                                className={cn(
                                    "rounded-full px-3 py-1.5 flex items-center gap-2 transition-all duration-300",
                                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
                                    "data-[state=inactive]:text-muted-foreground"
                                )}
                            >
                               <tab.icon className="h-5 w-5 flex-shrink-0" />
                               <span>{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                 </Tabs>
             </div>
        </div>

      <div className="mt-8">
        {renderContent()}
      </div>
    </div>
  );
}
