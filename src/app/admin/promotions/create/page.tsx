
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo, useTransition } from "react";
import { getPromocodesByOrganizer } from "@/app/organizer/promocodes/actions";
import { getPublishedEvents, getPublishedTours, getGeneralTrackingLinks } from "../actions";
import type { Promocode, Event, Tour, TrackingLink } from "@/lib/types";
import { QrCode, Download, Link as LinkIcon, PlusCircle, Copy, BarChart, Ticket, Loader2, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createTrackingLink, getCampaignDetails } from "@/app/influencer/campaigns/[id]/actions";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger, DialogFooter, DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from 'next/link';


type Listing = { id: string; name: string; type: 'event' | 'tour' };

export default function CreateCampaignLinkPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [listings, setListings] = useState<Listing[]>([]);
    const [promocodes, setPromocodes] = useState<Promocode[]>([]);
    const [selectedListing, setSelectedListing] = useState<string>('');
    const [selectedPromocodeId, setSelectedPromocodeId] = useState<string>('none');
    
    const [newLinkName, setNewLinkName] = useState('');
    const [customShortId, setCustomShortId] = useState('');
    const [isCreating, startCreating] = useTransition();

    useEffect(() => {
        Promise.all([
            getPublishedEvents(),
            getPublishedTours()
        ]).then(([eventsRes, toursRes]) => {
            const fetchedListings: Listing[] = [];
            if(eventsRes.success && eventsRes.data) {
                fetchedListings.push(...eventsRes.data.map(e => ({ ...e, type: 'event' as const })));
            }
            if(toursRes.success && toursRes.data) {
                fetchedListings.push(...toursRes.data.map(t => ({ ...t, type: 'tour' as const })));
            }
            setListings(fetchedListings);
        });
    }, []);
    
    const selectedListingData = useMemo(() => {
        return listings.find(l => l.id === selectedListing);
    }, [selectedListing, listings]);

    useEffect(() => {
        if(user?.uid) {
            getPromocodesByOrganizer(user.uid).then(res => { 
                if (res.success && res.data) {
                    setPromocodes(res.data);
                }
            })
        }
    }, [user?.uid]);

    const availablePromocodes = useMemo(() => {
        if (!selectedListingData) return [];
        return promocodes.filter(p => p.listingId === selectedListingData.id || p.listingType === 'all');
    }, [selectedListingData, promocodes]);

    
    const handleCreateLink = () => {
        if (!selectedListingData || !newLinkName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a listing and provide a link name.'});
            return;
        }

        const promocodeForLink = selectedPromocodeId && selectedPromocodeId !== 'none' ? selectedPromocodeId : undefined;

        startCreating(async () => {
            const result = await createTrackingLink({
                promocodeId: promocodeForLink,
                listingId: selectedListingData.id,
                listingType: selectedListingData.type,
                name: newLinkName,
                shortId: customShortId || undefined,
            });
             if (result.success && result.data) {
                setNewLinkName('');
                setCustomShortId('');
                toast({ title: "Tracking Link Created!", description: "You can view it on the main Promotions page." });
            } else {
                 toast({ variant: 'destructive', title: "Error", description: result.error });
            }
        });
    };

    return (
         <div className="space-y-8">
            <h1 className="text-3xl font-bold">Create New Tracking Link</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Campaign Link Manager</CardTitle>
                    <CardDescription>Create unique, trackable short links and QR codes for your marketing campaigns.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>1. Select Listing (Event or Tour)</Label>
                             <Select onValueChange={setSelectedListing} value={selectedListing}>
                                <SelectTrigger><SelectValue placeholder="Choose a listing..." /></SelectTrigger>
                                <SelectContent>
                                    {listings.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.type})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>2. Attach Promocode (Optional)</Label>
                             <Select onValueChange={setSelectedPromocodeId} value={selectedPromocodeId} disabled={!selectedListing}>
                                <SelectTrigger><SelectValue placeholder="Select a promocode..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (General Link)</SelectItem>
                                    {availablePromocodes.map(p => <SelectItem key={p.id} value={p.id}>{p.code} ({p.influencerName || 'General'})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg space-y-4">
                        <Label>3. Create & Track New Link</Label>
                         <div className="grid sm:grid-cols-2 gap-4">
                            <Input placeholder="Name for this link, e.g., 'Facebook Ad'" value={newLinkName} onChange={e => setNewLinkName(e.target.value)} disabled={!selectedListing} />
                            <Input placeholder="Custom path (optional)" value={customShortId} onChange={e => setCustomShortId(e.target.value)} disabled={!selectedListing} />
                        </div>
                         <Button onClick={handleCreateLink} disabled={!newLinkName || isCreating} className="w-full">
                            {isCreating ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                            <span className="ml-2">Create Link</span>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Link href="/admin/promotions">
                        <Button variant="outline">View All Links</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
