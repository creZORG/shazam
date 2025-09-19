
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo, useTransition } from "react";
import { getPromocodesByOrganizer } from "@/app/organizer/promocodes/actions";
import { getPublishedEvents, getPublishedTours } from "./actions";
import type { Promocode, Event, Tour, TrackingLink } from "@/lib/types";
import { QrCode, Download, Link as LinkIcon, PlusCircle, Copy, BarChart, Ticket, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createTrackingLink, getCampaignDetails } from "@/app/influencer/campaigns/[id]/actions";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";


type Listing = { id: string; name: string; type: 'event' | 'tour' };

function CampaignLinkManager() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [listings, setListings] = useState<Listing[]>([]);
    const [promocodes, setPromocodes] = useState<Promocode[]>([]);
    const [selectedListing, setSelectedListing] = useState<string>('');
    const [selectedPromocodeId, setSelectedPromocodeId] = useState<string>('');
    const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
    
    const [newLinkName, setNewLinkName] = useState('');
    const [isCreating, startCreating] = useTransition();
    const [host, setHost] = useState('');
    const [protocol, setProtocol] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHost(window.location.host);
            setProtocol(window.location.protocol);
        }
    }, []);

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
            getPromocodesByOrganizer(user.uid).then(res => { // Fetch all promocodes created by the admin/organizer
                if (res.success && res.data) {
                    setPromocodes(res.data);
                }
            })
        }
    }, [user?.uid]);

    useEffect(() => {
        if (selectedPromocodeId) {
            getCampaignDetails(selectedPromocodeId).then(detailsResult => {
                if (detailsResult.success && detailsResult.data) {
                    setTrackingLinks(detailsResult.data.trackingLinks);
                }
            })
        } else {
            setTrackingLinks([]);
        }
    }, [selectedPromocodeId])


    const availablePromocodes = useMemo(() => {
        if (!selectedListingData) return [];
        // Filter codes that are for this specific listing OR are sitewide
        return promocodes.filter(p => p.listingId === selectedListingData.id || p.listingType === 'all');
    }, [selectedListingData, promocodes]);

    
    const handleCreateLink = () => {
        if (!selectedListingData || !selectedPromocodeId || !newLinkName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a listing, a promocode, and provide a link name.'});
            return;
        }

        startCreating(async () => {
            const result = await createTrackingLink({
                promocodeId: selectedPromocodeId,
                listingId: selectedListingData.id,
                listingType: selectedListingData.type,
                name: newLinkName,
            });
             if (result.success && result.data) {
                setTrackingLinks(prev => [result.data!, ...prev]);
                setNewLinkName('');
                toast({ title: "Tracking Link Created!" });
            } else {
                 toast({ variant: 'destructive', title: "Error", description: result.error });
            }
        });
    };
    
    const handleCopyLink = (shortId: string) => {
        const fullLink = `${protocol}//${host}/l/${shortId}`;
        navigator.clipboard.writeText(fullLink);
        toast({ title: 'Link Copied!' });
    };

    return (
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
                        <Label>2. Attach Promocode</Label>
                         <Select onValueChange={setSelectedPromocodeId} value={selectedPromocodeId} disabled={!selectedListing}>
                            <SelectTrigger><SelectValue placeholder="Select a promocode..." /></SelectTrigger>
                            <SelectContent>
                                {availablePromocodes.map(p => <SelectItem key={p.id} value={p.id}>{p.code} ({p.influencerName || 'General'})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                    <Label>3. Create & Track New Link</Label>
                     <div className="flex gap-2">
                        <Input placeholder="Name for this link, e.g., 'Facebook Ad'" value={newLinkName} onChange={e => setNewLinkName(e.target.value)} disabled={!selectedPromocodeId} />
                        <Button onClick={handleCreateLink} disabled={!newLinkName || isCreating}>
                            {isCreating ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                            <span className="hidden sm:inline ml-2">Create</span>
                        </Button>
                    </div>
                </div>
                
                <div>
                    <h3 className="font-semibold mb-2">Generated Links & Analytics</h3>
                    <Card>
                        <CardContent className="p-0">
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Link Name</TableHead>
                                        <TableHead>Clicks</TableHead>
                                        <TableHead>Purchases</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trackingLinks.map(link => (
                                        <TableRow key={link.id}>
                                            <TableCell className="font-medium">{link.name}</TableCell>
                                            <TableCell>{link.clicks}</TableCell>
                                            <TableCell>{link.purchases}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(link.shortId)}><Copy className="h-4 w-4"/></Button>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"><QrCode className="h-4 w-4"/></Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <div className="flex flex-col items-center justify-center p-4">
                                                                <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${protocol}//${host}/l/${link.shortId}`)}`} alt="Generated QR Code" width={250} height={250} />
                                                                <p className="font-mono text-sm mt-2">{`${host}/l/${link.shortId}`}</p>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                           {trackingLinks.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">Select a promocode to see its tracking links.</p>}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    )
}

export default function AdminPromotionsPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Promotional Tools</h1>
            <CampaignLinkManager />
        </div>
    )
}

    