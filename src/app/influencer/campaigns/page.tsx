

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Promocode } from "@/lib/types";
import { Loader2, AlertTriangle, FileText, Check, Link as LinkIcon, BarChart, Ticket, Route, Settings, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


function getPromocodeStatus(code: Promocode) {
    if (!code.isActive) return 'void';
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return 'expired';
    if (code.usageLimit > 0 && code.usageCount >= code.usageLimit) return 'limit_reached';
    if (code.influencerId && code.influencerStatus !== 'accepted') return 'active_pending';
    return 'active_accepted';
}

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

    const status = getPromocodeStatus(campaign);
    const isInactive = status === 'expired' || status === 'void' || status === 'limit_reached';

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
                 {isAccepted && !isInactive && (
                     <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Actions</h4>
                         <Link href={`/influencer/campaigns/${campaign.id}`} className="w-full">
                            <Button variant="outline" className="w-full">
                                <Settings className="mr-2"/> Manage Campaign
                            </Button>
                         </Link>
                     </div>
                )}
                {isInactive && (
                     <div className="p-3 bg-destructive/10 rounded-lg text-center">
                        <p className="font-semibold text-destructive text-sm capitalize">{status.replace('_', ' ')}</p>
                    </div>
                )}
            </CardContent>
            {!isAccepted && !isInactive && (
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
    const [allCampaigns, setAllCampaigns] = useState<Promocode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (user?.uid) {
            const q = query(collection(db, "promocodes"), where("influencerId", "==", user.uid));
            
            getDocs(q).then(snapshot => {
                if (!snapshot.empty) {
                    const fetchedCampaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promocode));
                    setAllCampaigns(fetchedCampaigns);
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

    const { pendingCampaigns, activeCampaigns, pastCampaigns } = useMemo(() => {
        const pending: Promocode[] = [];
        const active: Promocode[] = [];
        const past: Promocode[] = [];

        allCampaigns.forEach(c => {
            const status = getPromocodeStatus(c);
            if (status === 'active_pending') {
                pending.push(c);
            } else if (status === 'active_accepted') {
                active.push(c);
            } else {
                past.push(c);
            }
        });
        return { pendingCampaigns: pending, activeCampaigns: active, pastCampaigns: past };
    }, [allCampaigns]);


    const renderContent = (campaigns: Promocode[], type: 'pending' | 'active' | 'past') => {
        if (loading) {
             return (
                <div className="flex justify-center items-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                    <h3 className="text-lg font-semibold mt-4">No {type} campaigns</h3>
                    <p className="text-muted-foreground mt-2">
                       {type === 'pending' && "When an organizer assigns you a new campaign, it will appear here for you to accept."}
                       {type === 'active' && "Your currently active campaigns will be shown here."}
                       {type === 'past' && "Expired or completed campaigns will be listed here."}
                    </p>
                </div>
            );
        }

        return (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
            </div>
        )
    }

  return (
    <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Campaigns</h1>
        </div>
        
         <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg mb-8">
                <TabsTrigger value="pending"><RotateCcw className="mr-2"/>Pending ({pendingCampaigns.length})</TabsTrigger>
                <TabsTrigger value="active"><Check className="mr-2"/>Active ({activeCampaigns.length})</TabsTrigger>
                <TabsTrigger value="past"><FileText className="mr-2"/>Past ({pastCampaigns.length})</TabsTrigger>
            </TabsList>
             <TabsContent value="pending">
                {renderContent(pendingCampaigns, 'pending')}
            </TabsContent>
            <TabsContent value="active">
                {renderContent(activeCampaigns, 'active')}
            </TabsContent>
            <TabsContent value="past">
                {renderContent(pastCampaigns, 'past')}
            </TabsContent>
        </Tabs>

    </div>
  );
}
