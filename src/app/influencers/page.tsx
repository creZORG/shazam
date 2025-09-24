
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInfluencerLeaderboard, type InfluencerLeaderboardEntry } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Ticket, DollarSign, ArrowRight, EyeOff, Twitter, Instagram, Linkedin, Facebook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { FirebaseUser } from "@/lib/types";
import Link from 'next/link';

type SortOption = 'revenue' | 'newest';

const TikTokIcon = (props: any) => (
  <svg {...props} viewBox="0 0 2859 3333" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd">
    <path d="M2081 0c55 473 319 755 778 785v532c-266 26-499-61-770-225v995c0 1264-1378 1659-1932 753-356-583-138-1606 1004-1647v561c-87 14-180 36-265 65-254 86-398 247-358 531 77 544 1075 705 992-358V1h551z"/>
  </svg>
);


function InfluencerCard({ influencer, rank }: { influencer: InfluencerLeaderboardEntry, rank: number }) {
    const showStats = influencer.privacy?.showStats ?? true;

    return (
        <Card key={influencer.uid} className="flex flex-col group hover:shadow-lg transition-shadow">
            <CardHeader className="text-center items-center">
                <div className="relative">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                        <AvatarImage src={influencer.profilePicture} alt={influencer.name} />
                        <AvatarFallback>{influencer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                     {rank < 3 && (
                        <Badge className="absolute -top-2 -right-4 flex items-center gap-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white border-none" variant={rank === 0 ? "default" : "secondary"}>
                            <Crown className="h-4 w-4" /> Top {rank + 1}
                        </Badge>
                    )}
                </div>
                <CardTitle className="mt-4">{influencer.name}</CardTitle>
                <CardDescription>@{influencer.name.toLowerCase().replace(' ', '_')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                {showStats ? (
                     <div className="flex justify-around text-center">
                        <div>
                            <p className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-orange-500">{`Ksh ${influencer.totalRevenue.toLocaleString()}`}</p>
                            <p className="text-xs text-muted-foreground">Revenue Generated</p>
                        </div>
                        <div>
                            <p className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-orange-500">{influencer.ticketsSold.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Tickets Sold</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center text-center p-4 bg-muted/50 rounded-md">
                        <EyeOff className="h-5 w-5 mr-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Stats are private</p>
                    </div>
                )}
               
                <div className="flex justify-center gap-2">
                    {influencer.socials?.twitter && <Link href={influencer.socials.twitter} target="_blank"><Button variant="ghost" size="icon"><Twitter/></Button></Link>}
                    {influencer.socials?.instagram && <Link href={influencer.socials.instagram} target="_blank"><Button variant="ghost" size="icon"><Instagram/></Button></Link>}
                    {influencer.socials?.tiktok && <Link href={influencer.socials.tiktok} target="_blank"><Button variant="ghost" size="icon"><TikTokIcon className="h-5 w-5 fill-current"/></Button></Link>}
                    {influencer.socials?.facebook && <Link href={influencer.socials.facebook} target="_blank"><Button variant="ghost" size="icon"><Facebook/></Button></Link>}
                </div>
                 
            </CardContent>
            <CardContent>
                <Button className="w-full bg-gradient-to-r from-pink-500 to-orange-500">
                    Partner with {influencer.name.split(' ')[0]} <ArrowRight className="ml-2"/>
                </Button>
            </CardContent>
        </Card>
    )
}

export default function InfluencersPage() {
    const [influencers, setInfluencers] = useState<InfluencerLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sort, setSort] = useState<SortOption>('revenue');

    useEffect(() => {
        setLoading(true);
        getInfluencerLeaderboard().then(result => {
            if (result.success && result.data) {
                setInfluencers(result.data);
            } else {
                setError(result.error || "Could not load influencer data.");
            }
            setLoading(false);
        });
    }, []);

    const sortedInfluencers = [...influencers].sort((a, b) => {
        if (sort === 'newest') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // Default to revenue sort
        // Push influencers with private stats to the bottom
        const aStats = a.privacy?.showStats ?? true;
        const bStats = b.privacy?.showStats ?? true;
        if (aStats && !bStats) return -1;
        if (!aStats && bStats) return 1;
        return b.totalRevenue - a.totalRevenue;
    });

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-orange-500">Meet Our Influencers</h1>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-4">
                    Discover Nakuru's top event promoters. Partner with our best influencers to sell more tickets and amplify your reach.
                </p>
            </div>

            <div className="flex justify-end mb-8">
                <Select onValueChange={(value: SortOption) => setSort(value)} defaultValue={sort}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="revenue">Top Earners</SelectItem>
                        <SelectItem value="newest">Newest Members</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin" /></div>
            ) : error ? (
                <p className="text-destructive text-center">{error}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortedInfluencers.map((influencer, index) => (
                        <InfluencerCard key={influencer.uid} influencer={influencer} rank={index} />
                    ))}
                </div>
            )}

        </div>
    );
}
