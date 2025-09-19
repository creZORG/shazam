
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Promocode } from "@/lib/types";
import { Loader2, AlertTriangle, FileText, Check, Link as LinkIcon, BarChart, Ticket, Route, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

function CampaignCard({ campaign }: { campaign: Promocode }) {
    const { toast } = useToast();
    const [isAccepting, setIsAccepting] = useState(false);
    const [isAccepted, setIsAccepted] = useState(campaign.influencerStatus === 'accepted');

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            const promoRef = doc(db, 'promocodes', campaign.id);
            await updateDoc(promoRef, {
                influencerStatus: 'accepted'
            });
            setIsAccepted(true);
            toast({ title: "Campaign Accepted!", description: "You can now share your tracking link." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not accept the campaign. Please try again." });
        } finally {
            setIsAccepting(false);
        }
    };

    const commissionText = campaign.commissionType === 'percentage' 
        ? `${campaign.commissionValue}% per ticket`
        : `Ksh ${campaign.commissionValue} per ticket`;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2 mb-1">
                            {campaign.listingType === 'event' ? <Ticket className="text-primary"/> : <Route className="text-primary"/>}
                            {campaign.listingName}
                        </CardTitle>
                        <CardDescription>
                            Your Code: <span className="font-bold text-foreground">{campaign.code}</span>
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">Your Commission</h4>
                    <p className="text-lg font-bold text-primary">{commissionText}</p>
                </div>
                 {isAccepted && (
                     <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Actions</h4>
                         <Link href={`/influencer/campaigns/${campaign.id}`} className="w-full">
                            <Button variant="outline" className="w-full">
                                <Settings className="mr-2"/> Manage Campaign
                            </Button>
                         </Link>
                     </div>
                )}
            </CardContent>
            {!isAccepted && (
                <CardFooter>
                    <Button className="w-full" onClick={handleAccept} disabled={isAccepting}>
                        {isAccepting ? <Loader2 className="animate-spin mr-2"/> : <Check className="mr-2"/>}
                        Accept Agreement
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}


export default function InfluencerCampaignsPage() {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<Promocode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (user?.uid) {
            const q = query(collection(db, "promocodes"), where("influencerId", "==", user.uid));
            
            getDocs(q).then(snapshot => {
                if (!snapshot.empty) {
                    const fetchedCampaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promocode));
                    setCampaigns(fetchedCampaigns);
                }
                setLoading(false);
            }).catch(err => {
                console.error(err);
                setError("Failed to load campaigns.");
                setLoading(false);
            })
        } else if (user === null) { // Auth state has resolved, but there is no user
            setLoading(false);
        }
    }, [user]);

    const renderContent = () => {
        if (loading) {
             return (
                <div className="flex justify-center items-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-2">Loading campaigns...</p>
                </div>
            );
        }
        if (error) {
             return (
                <div className="flex flex-col justify-center items-center py-24 text-destructive">
                    <AlertTriangle className="h-8 w-8" />
                    <h3 className="text-lg font-semibold mt-4">Error Loading Campaigns</h3>
                    <p className="text-center mt-2">{error}</p>
                </div>
            );
        }
        if (campaigns.length === 0) {
             return (
                <div className="text-center py-24">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mt-4">No Campaigns Yet</h3>
                    <p className="text-muted-foreground mt-2">
                        When an organizer assigns you to a campaign, it will appear here.
                    </p>
                </div>
            );
        }

        const pendingCampaigns = campaigns.filter(c => c.influencerStatus !== 'accepted');
        const activeCampaigns = campaigns.filter(c => c.influencerStatus === 'accepted');

        return (
            <div className="space-y-12">
                {pendingCampaigns.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Pending Agreements</h2>
                         <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
                        </div>
                    </div>
                )}
                 {activeCampaigns.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Active Campaigns</h2>
                         <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
                        </div>
                    </div>
                )}
            </div>
        )
    }

  return (
    <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Campaigns</h1>
        </div>
        {renderContent()}
    </div>
  );
}
