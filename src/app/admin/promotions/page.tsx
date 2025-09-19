

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo, useTransition } from "react";
import { getPromocodesByOrganizer } from "@/app/organizer/promocodes/actions";
import { getPublishedEvents, getPublishedTours } from "./actions";
import type { Promocode, Event, Tour, TrackingLink } from "@/lib/types";
import { QrCode, Download, Link as LinkIcon, PlusCircle, Copy, BarChart, Ticket, Loader2, Eye } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createTrackingLink, getCampaignDetails } from "@/app/influencer/campaigns/[id]/actions";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger, DialogFooter, DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from 'next/link';


type Listing = { id: string; name: string; type: 'event' | 'tour' };

function CampaignLinkManager() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [listings, setListings] = useState<Listing[]>([]);
    const [promocodes, setPromocodes] = useState<Promocode[]>([]);
    const [selectedListing, setSelectedListing] = useState<string>('');
    const [selectedPromocodeId, setSelectedPromocodeId] = useState<string>('none');
    const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
    
    const [newLinkName, setNewLinkName] = useState('');
    const [customShortId, setCustomShortId] = useState('');
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
            getPromocodesByOrganizer(user.uid).then(res => { 
                if (res.success && res.data) {
                    setPromocodes(res.data);
                }
            })
        }
    }, [user?.uid]);

    useEffect(() => {
        if (selectedPromocodeId && selectedPromocodeId !== 'none') {
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
                setTrackingLinks(prev => [result.data!, ...prev]);
                setNewLinkName('');
                setCustomShortId('');
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

    const handleDownloadQr = (shortId: string, name: string) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(`${protocol}//${host}/l/${shortId}`)}`;
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = `${name.replace(/\s+/g, '_')}_QR.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                        <Label>2. Attach Promocode (Optional)</Label>
                         <Select onValueChange={setSelectedPromocodeId} value={selectedPromocodeId} disabled={!selectedListing}>
                            <SelectTrigger><SelectValue placeholder="Select a promocode..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {availablePromocodes.map(p => <SelectItem key={p.id} value={p.id}>{p.code} ({p.influencerName || 'General'})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                    <Label>3. Create & Track New Link</Label>
                     <div className="grid sm:grid-cols-2 gap-2">
                        <Input placeholder="Name for this link, e.g., 'Facebook Ad'" value={newLinkName} onChange={e => setNewLinkName(e.target.value)} disabled={!selectedListing} />
                         <div className="relative">
                            <Input placeholder="Custom path (optional)" value={customShortId} onChange={e => setCustomShortId(e.target.value)} disabled={!selectedListing} className="pl-16" />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{host}/l/</span>
                        </div>
                    </div>
                     <Button onClick={handleCreateLink} disabled={!newLinkName || isCreating} className="w-full">
                        {isCreating ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                        <span className="ml-2">Create Link</span>
                    </Button>
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
                                                    <Link href={`/admin/promotions/${link.id}?promocodeId=${selectedPromocodeId}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                                                    </Link>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(link.shortId)}><Copy className="h-4 w-4"/></Button>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"><QrCode className="h-4 w-4"/></Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                             <DialogHeader>
                                                                <DialogTitle>QR Code for "{link.name}"</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="flex flex-col items-center justify-center p-4">
                                                                <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${protocol}//${host}/l/${link.shortId}`)}`} alt="Generated QR Code" width={250} height={250} />
                                                                <p className="font-mono text-sm mt-2">{`${host}/l/${link.shortId}`}</p>
                                                            </div>
                                                            <DialogFooter>
                                                                <DialogClose asChild>
                                                                    <Button variant="outline">Close</Button>
                                                                </DialogClose>
                                                                <Button onClick={() => handleDownloadQr(link.shortId, link.name)}>
                                                                    <Download className="mr-2 h-4 w-4" /> Download PNG
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                           {trackingLinks.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">Select a listing and promocode to see its tracking links.</p>}
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

    
