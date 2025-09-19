
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertTriangle, Percent, DollarSign, Info, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { getPromocodesByOrganizer } from "./actions";
import type { Promocode } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


type PromocodeWithDetails = Promocode & { 
    influencerName?: string;
    revenueGenerated: number;
    influencerPayout: number;
};

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
    active_pending: { variant: 'secondary', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Pending Influencer' },
    active_accepted: { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Active' },
    expired: { variant: 'outline', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Expired' },
    void: { variant: 'destructive', className: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Void' },
    limit_reached: { variant: 'outline', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Usage Limit Reached' },
};


function getPromocodeStatus(code: Promocode) {
    if (!code.isActive) return 'void';
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return 'expired';
    if (code.usageCount >= code.usageLimit) return 'limit_reached';
    if (code.influencerId && code.influencerStatus === 'pending') return 'active_pending';
    return 'active_accepted';
}

function PromocodeCard({ code }: { code: PromocodeWithDetails }) {
    const status = getPromocodeStatus(code);
    const statusInfo = statusConfig[status];
    const discount = code.discountType === 'percentage' ? `${code.discountValue}%` : `Ksh ${code.discountValue}`;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <p className="font-mono text-primary text-xl font-bold">{code.code}</p>
                    <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>
                </div>
                 <CardTitle className="text-lg pt-2">{code.listingName}</CardTitle>
                 <CardDescription>Influencer: {code.influencerName}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Usage</p>
                        <p className="font-semibold">{code.usageCount} / {code.usageLimit}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Discount</p>
                        <p className="font-semibold">{discount}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Revenue</p>
                        <p className="font-semibold">Ksh {code.revenueGenerated.toLocaleString()}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Payout</p>
                        <p className="font-semibold">Ksh {code.influencerPayout.toLocaleString()}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Link href={`/organizer/promocodes/${code.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">Manage</Button>
                </Link>
            </CardFooter>
        </Card>
    )

}


export default function OrganizerPromocodesPage() {
    const { user } = useAuth();
    const [promocodes, setPromocodes] = useState<PromocodeWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (user?.uid) {
            getPromocodesByOrganizer(user.uid).then(result => {
                if (result.success && result.data) {
                    setPromocodes(result.data as PromocodeWithDetails[]);
                } else {
                    setError(result.error || 'Could not load promocodes');
                }
                setLoading(false);
            });
        }
    }, [user]);

    const renderContent = () => {
         if (loading) {
            return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4">Loading promocodes...</p></div>;
        }

        if (error) {
            return <p className="text-destructive text-center py-12 flex items-center justify-center gap-2"><AlertTriangle /> {error}</p>;
        }

        if (promocodes.length === 0) {
            return (
                <div className="text-center py-12">
                    <Percent className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mt-4">No Promocodes Yet</h3>
                    <p className="text-muted-foreground mt-2">
                    Click the button above to create your first promocode and start a campaign.
                    </p>
                </div>
            )
        }

        return (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {promocodes.map(code => <PromocodeCard key={code.id} code={code} />)}
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Promocodes</h1>
                <Link href="/organizer/promocodes/create">
                    <Button><PlusCircle className="mr-2"/> Create New</Button>
                </Link>
            </div>

            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Find Your Next Partner!</AlertTitle>
                <AlertDescription>
                    Looking for the perfect influencer to promote your event? Browse our <Link href="/influencers" className="font-semibold underline hover:text-primary">Public Influencer Directory</Link> to find top-performing talent.
                </AlertDescription>
            </Alert>
            
            <Card>
                <CardHeader>
                    <CardTitle>Your Campaigns</CardTitle>
                    <CardDescription>An overview of all promocodes you've created for your listings.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}
