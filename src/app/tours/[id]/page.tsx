
'use client';

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Clock, MapPin, Ticket, Route, Flag, CircleCheck, Wallet, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { format, formatDistanceStrict } from 'date-fns';
import { useEffect, useState } from 'react';
import { getListingById } from '@/app/actions';
import type { Tour } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function TourDetailPage({ params }: { params: { id: string } }) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await getListingById('tour', params.id);
      if (error || !data) {
        notFound();
      }
      setTour(data as Tour);
      setLoading(false);
    }
    fetchData();
  }, [params.id]);

  if (loading || !tour) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const duration = (tour.startDate && tour.endDate) ? formatDistanceStrict(new Date(tour.startDate), new Date(tour.endDate)) : 'N/A';
  
  const bookingUrlFull = `/checkout?tourId=${tour.id}&paymentType=full`;
  const bookingUrlReserve = `/checkout?tourId=${tour.id}&paymentType=booking`;

  return (
     <div className="flex flex-col min-h-screen">
      <section className="relative w-full h-[50vh] md:h-[60vh]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
        <Image
          src={tour.imageUrl}
          alt={tour.name}
          data-ai-hint={tour.imageHint || 'tour banner'}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-8 text-white">
            <div className="container mx-auto">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>{tour.name}</h1>
                <div className="flex items-center gap-6 mt-4 text-lg">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        <span>{tour.destination}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span className="capitalize">{duration}</span>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-5 gap-8 lg:gap-12">
            <div className="md:col-span-3">
                <Card>
                    <CardHeader>
                        <CardTitle>About the Tour</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-base leading-relaxed">{tour.description}</p>
                    </CardContent>
                </Card>
                
                <Card className="mt-8">
                    <CardHeader>
                        <h3 className="font-bold text-xl mb-4 flex items-center"><Route className='mr-2' /> Itinerary</h3>
                    </CardHeader>
                    <CardContent>
                        <div className="relative pl-6">
                            <div className="absolute left-0 top-0 h-full w-0.5 bg-border -translate-x-1/2 ml-[7px]"></div>
                            {(tour.itinerary || []).map((item, index) => (
                                <div key={index} className="relative flex items-start mb-6">
                                    <div className="absolute left-0 top-1 h-4 w-4 bg-primary rounded-full -translate-x-1/2 border-4 border-background"></div>
                                    <p className="pl-8 text-muted-foreground">{typeof item === 'string' ? item : item.value}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>What's Included</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center text-green-500">
                                <CheckCircle className="mr-2 h-5 w-5" />
                                Inclusions
                            </h4>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                {tour.inclusions?.map((item, index) => <li key={index}>{typeof item === 'string' ? item : item.value}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center text-red-500">
                                <XCircle className="mr-2 h-5 w-5" />
                                Exclusions
                            </h4>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                {tour.exclusions?.map((item, index) => <li key={index}>{typeof item === 'string' ? item : item.value}</li>)}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-2">
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle className="text-2xl">Book Your Spot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Flag className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Starts & Ends at</p>
                                <p className="font-semibold">{tour.startingPoint}</p>
                            </div>
                        </div>
                        <Separator className="my-4" />
                        <div className="space-y-4">
                            <p className="text-lg font-bold">Choose your payment option:</p>
                            
                            <Link href={bookingUrlFull} className='w-full'>
                            <Button size="lg" className="w-full h-auto py-3 flex flex-col items-start">
                                <span className="text-base font-semibold">Pay Full Amount</span>
                                <span className="text-sm font-normal">Ksh {tour.price.toLocaleString()}</span>
                            </Button>
                            </Link>
                            
                            {tour.bookingFee > 0 && (
                                <>
                                    <div className="relative my-2">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-card px-2 text-muted-foreground">OR</span>
                                        </div>
                                    </div>

                                    <Link href={bookingUrlReserve} className='w-full'>
                                    <Button size="lg" variant="outline" className="w-full h-auto py-3 flex flex-col items-start">
                                        <span className="text-base font-semibold">Reserve Your Seat</span>
                                        <span className="text-sm font-normal">Pay Ksh {tour.bookingFee.toLocaleString()}</span>
                                    </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
