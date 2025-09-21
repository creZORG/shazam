
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, Pencil, BarChart2, Loader2, AlertTriangle, Route, Ticket, Archive, EyeOff, UserPlus, Link as LinkIcon, Copy, Send, QrCode, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo, Suspense, useTransition } from "react";
import { getListings, updateListingStatus } from "../actions";
import { generateInviteLink, getVerifiersForEvent } from "@/app/admin/users/actions";
import { useAuth } from "@/hooks/use-auth";
import type { Event, Tour, FirebaseUser } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


type Listing = (Event | Tour) & { id: string; status: string; updatedAt?: { seconds: number } };
type ListingStatus = 'all' | 'published' | 'drafts' | 'review' | 'rejected' | 'archived';

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
    published: { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Published' },
    draft: { variant: 'secondary', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: 'Draft' },
    'submitted for review': { variant: 'secondary', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'In Review' },
    rejected: { variant: 'destructive', className: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Rejected' },
    archived: { variant: 'outline', className: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30', label: 'Archived' },
    'taken-down': { variant: 'outline', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Taken Down' },
};

const inviteSchema = z.object({
  email: z.string().email("A valid email is required.").optional().or(z.literal('')),
});

function AssignedVerifiers({ eventId }: { eventId: string }) {
    const [verifiers, setVerifiers] = useState<FirebaseUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getVerifiersForEvent(eventId).then(result => {
            if (result.success && result.data) {
                setVerifiers(result.data);
            }
            setLoading(false);
        });
    }, [eventId]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">Assigned Verifiers</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="animate-spin" /> : verifiers.length > 0 ? (
                    <div className="space-y-3">
                        {verifiers.map(v => (
                            <div key={v.uid} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={v.profilePicture} />
                                    <AvatarFallback>{v.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{v.name}</p>
                                    <p className="text-xs text-muted-foreground">{v.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No verifiers assigned yet.</p>
                )}
            </CardContent>
        </Card>
    );
}

function InviteVerifierForm({ eventId, eventName }: { eventId: string, eventName: string }) {
    const { toast } = useToast();
    const [isGeneratingLink, startGeneratingLink] = useTransition();
    const [isSendingEmail, startSendingEmail] = useTransition();
    const [inviteLink, setInviteLink] = useState<string | null>(null);

    const form = useForm<z.infer<typeof inviteSchema>>({
        resolver: zodResolver(inviteSchema),
        defaultValues: { email: "" }
    });

    const handleInvite = async (sendEmail: boolean) => {
        const values = form.getValues();
        if (sendEmail && !values.email) {
            form.setError('email', { message: 'Email is required to send an invite.' });
            return;
        }

        const transition = sendEmail ? startSendingEmail : startGeneratingLink;
        transition(async () => {
            const result = await generateInviteLink({
                email: values.email || undefined,
                role: 'verifier',
                eventId: eventId,
                sendEmail: sendEmail,
            });

            if (result.success && result.inviteLink) {
                setInviteLink(result.inviteLink);
                if (sendEmail) {
                    toast({ title: "Invite Sent!", description: `An invitation has been emailed to ${values.email}.` });
                } else {
                     toast({ title: "Link Generated!", description: `You can now share the link below.` });
                }
                form.reset();
            } else {
                toast({ variant: 'destructive', title: 'Failed', description: result.error });
            }
        });
    }
    
     const handleCopyLink = () => {
        if(inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            toast({ title: "Link Copied!"});
        }
    }

    return (
        <Form {...form}>
            <form className="space-y-4">
                <p className="text-sm text-muted-foreground">
                   Invite a user to be a ticket verifier for this event. They must have a NaksYetu account with a 'verifier' role.
                </p>
                <FormField control={form.control} name="email" render={({field}) => (
                    <FormItem>
                        <FormLabel>Verifier's Email (Optional)</FormLabel>
                        <FormControl><Input type="email" placeholder="verifier@example.com" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-2">
                     <Button type="button" onClick={() => handleInvite(false)} disabled={isGeneratingLink || isSendingEmail}>
                        {isGeneratingLink ? <Loader2 className="animate-spin mr-2" /> : <LinkIcon className="mr-2" />}
                        Generate Link
                    </Button>
                    <Button type="button" onClick={() => handleInvite(true)} disabled={isGeneratingLink || isSendingEmail}>
                        {isSendingEmail ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                        Send Email Invite
                    </Button>
                </div>
                
                 {inviteLink && (
                    <Alert className="mt-6">
                        <AlertTitle>Share this Invitation Link</AlertTitle>
                        <AlertDescription className="flex items-center justify-between gap-4">
                            <Input value={inviteLink} readOnly className="flex-grow" />
                            <Button variant="outline" size="icon" onClick={handleCopyLink} type="button"><Copy className="h-4 w-4"/></Button>
                        </AlertDescription>
                    </Alert>
                )}
            </form>
        </Form>
    )
}


function ListingCard({ listing, onStatusChange }: { listing: Listing, onStatusChange: () => void }) {
    const isEvent = 'venue' in listing;
    const { toast } = useToast();
    let [isPending, startTransition] = useTransition();

    const lastSaved = listing.updatedAt ? formatDistanceToNow(new Date(listing.updatedAt.seconds * 1000), { addSuffix: true }) : 'N/A';
    const name = listing.name || "Untitled Draft";

    const statusInfo = statusConfig[listing.status] || { variant: 'outline', className: '', label: listing.status };

    const handleStatusUpdate = (status: 'taken-down' | 'archived' | 'submitted for review') => {
        startTransition(async () => {
            const listingType = 'venue' in listing ? 'event' : 'tour';
            const result = await updateListingStatus(listing.id, listingType, status);
            if (result.success) {
                toast({ title: 'Success', description: `Listing has been ${status.replace('-', ' ')}.` });
                onStatusChange();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                         <CardTitle className="text-xl flex items-center gap-2 mb-1">
                            {isEvent ? <Ticket className="text-primary"/> : <Route className="text-primary"/>}
                            {name}
                        </CardTitle>
                        <CardDescription>
                            Last updated: {lastSaved}
                        </CardDescription>
                    </div>
                     <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
                 {listing.status === 'draft' && (
                    <Button className="w-full mt-4" size="sm" onClick={() => handleStatusUpdate('submitted for review')}>
                        <Upload className="mr-2" /> Submit for Review
                    </Button>
                 )}
            </CardContent>
            <CardFooter className="flex gap-2">
                 <Dialog>
                    <DialogTrigger asChild>
                       <Button variant="outline" className="w-full">Manage</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Manage "{name}"</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="actions" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="actions">Actions</TabsTrigger>
                                <TabsTrigger value="verifiers">Verifiers</TabsTrigger>
                            </TabsList>
                            <TabsContent value="actions" className="pt-4">
                                <div className="grid grid-cols-2 gap-4 py-4">
                                    <Link href={`/organizer/events/create?id=${listing.id}&type=${isEvent ? 'event' : 'tour'}`} passHref>
                                        <Button variant="outline" className="w-full h-20 flex-col gap-1">
                                            <Pencil />
                                            Edit Listing
                                        </Button>
                                    </Link>
                                    <Link href={`/organizer/analytics/${isEvent ? 'event' : 'tour'}/${listing.id}`} passHref>
                                        <Button variant="outline" className="w-full h-20 flex-col gap-1">
                                            <BarChart2 />
                                            View Stats
                                        </Button>
                                    </Link>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full h-20 flex-col gap-1 text-yellow-400 border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-300" disabled={listing.status !== 'published'}>
                                            <EyeOff />
                                            Take Down
                                        </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Are you sure?</DialogTitle></DialogHeader>
                                            <DialogDescription>Taking a listing down will unpublish it from the site, but it won't be deleted. You can republish it later after review.</DialogDescription>
                                            <DialogFooter>
                                                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                                <DialogClose asChild><Button variant="destructive" onClick={() => handleStatusUpdate('taken-down')} disabled={isPending}>
                                                    {isPending && <Loader2 className="animate-spin mr-2" />}
                                                    Yes, Take Down
                                                </Button></DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full h-20 flex-col gap-1 text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-400" disabled={listing.status === 'archived'}>
                                                <Archive />
                                                Archive
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Are you sure?</DialogTitle></DialogHeader>
                                            <DialogDescription>Archiving a listing is permanent. It will be moved to past events and cannot be edited or republished.</DialogDescription>
                                            <DialogFooter>
                                                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                                 <DialogClose asChild><Button variant="destructive" onClick={() => handleStatusUpdate('archived')} disabled={isPending}>
                                                    {isPending && <Loader2 className="animate-spin mr-2" />}
                                                    Yes, Archive
                                                </Button></DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                     </Dialog>
                                </div>
                            </TabsContent>
                            <TabsContent value="verifiers" className="pt-4 space-y-4">
                                <Card className="bg-primary/10 border-primary/20">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-primary">Verify Tickets Yourself</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-4">You can scan tickets for your own event. Click the button below to open the verification portal.</p>
                                        <Link href={`/verify/scan/${listing.id}`} className="w-full">
                                            <Button className="w-full">
                                                <QrCode className="mr-2" /> Start Scanning Now
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><UserPlus /> Invite Verification Agents</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <InviteVerifierForm eventId={listing.id} eventName={listing.name || 'this event'} />
                                    </CardContent>
                                </Card>
                                <AssignedVerifiers eventId={listing.id} />
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    );
}

function ListingsGrid({ listings, statusFilter, onStatusChange }: { listings: Listing[], statusFilter: ListingStatus, onStatusChange: () => void }) {
    
    const filteredListings = useMemo(() => {
        if (statusFilter === 'all') return listings;
        if (statusFilter === 'review') return listings.filter(l => l.status === 'submitted for review');
        return listings.filter(l => l.status === statusFilter);
    }, [listings, statusFilter]);

    if (filteredListings.length === 0) {
        return (
            <div className="text-center py-24">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold mt-4">No listings found</h3>
                <p className="text-muted-foreground mt-2">
                    There are no listings with the status "{statusFilter}".
                </p>
            </div>
        );
    }
    
    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} onStatusChange={onStatusChange} />
            ))}
        </div>
    );
}

function MyListingsPageInternal() {
    const { user } = useAuth();
    const [allListings, setAllListings] = useState<Record<ListingStatus, Listing[]>>({ all: [], published: [], drafts: [], review: [], rejected: [], archived: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState<ListingStatus>('all');
    const [mainTab, setMainTab] = useState<'events' | 'tours'>('events');

    const fetchAllListings = () => {
        if (user) {
            setLoading(true);
            getListings(user.uid)
                .then(result => {
                    if (result.success && result.data) {
                        setAllListings(result.data as any);
                    } else {
                        setError(result.error || 'Failed to load listings.');
                    }
                })
                .finally(() => setLoading(false));
        }
    }

    useEffect(() => {
        fetchAllListings();
    }, [user]);
    
    const events = useMemo(() => allListings.all.filter(l => 'venue' in l), [allListings.all]);
    const tours = useMemo(() => allListings.all.filter(l => !('venue' in l)), [allListings.all]);

    const filterButtons: { status: ListingStatus, label: string }[] = [
        { status: 'all', label: 'All' },
        { status: 'published', label: 'Published' },
        { status: 'drafts', label: 'Drafts' },
        { status: 'review', label: 'In Review' },
        { status: 'rejected', label: 'Rejected' },
        { status: 'archived', label: 'Archived' },
    ];
    
    const getCountForStatus = (status: ListingStatus, type: 'events' | 'tours') => {
        const list = type === 'events' ? events : tours;
        if (status === 'all') return list.length;
        if (status === 'review') return list.filter(l => l.status === 'submitted for review').length;
        return list.filter(l => l.status === status).length;
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-2">Loading listings...</p>
                </div>
            );
        }
        if (error) {
             return (
                <div className="flex flex-col justify-center items-center py-24 text-destructive">
                    <AlertTriangle className="h-8 w-8" />
                    <h3 className="text-lg font-semibold mt-4">Error Loading Listings</h3>
                    <p className="text-center mt-2">{error}</p>
                </div>
            );
        }

        return (
             <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as 'events' | 'tours')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="events">Events</TabsTrigger>
                    <TabsTrigger value="tours">Tours</TabsTrigger>
                </TabsList>
                <TabsContent value="events" className="mt-4">
                     <div className="relative w-full overflow-auto">
                        <div className="flex flex-nowrap gap-2 pt-4 mb-8">
                            {filterButtons.map(({ status, label }) => (
                                <Button 
                                    key={status} 
                                    variant={activeStatusFilter === status ? 'default' : 'outline'}
                                    onClick={() => setActiveStatusFilter(status)}
                                    className="flex-shrink-0"
                                >
                                    {label} ({getCountForStatus(status, 'events')})
                                </Button>
                            ))}
                        </div>
                    </div>
                    <ListingsGrid listings={events} statusFilter={activeStatusFilter} onStatusChange={fetchAllListings} />
                </TabsContent>
                <TabsContent value="tours" className="mt-4">
                      <div className="relative w-full overflow-auto">
                        <div className="flex flex-nowrap gap-2 pt-4 mb-8">
                            {filterButtons.map(({ status, label }) => (
                                <Button 
                                    key={status} 
                                    variant={activeStatusFilter === status ? 'default' : 'outline'}
                                    onClick={() => setActiveStatusFilter(status)}
                                    className="flex-shrink-0"
                                >
                                    {label} ({getCountForStatus(status, 'tours')})
                                </Button>
                            ))}
                        </div>
                    </div>
                    <ListingsGrid listings={tours} statusFilter={activeStatusFilter} onStatusChange={fetchAllListings} />
                </TabsContent>
            </Tabs>
        )
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Listings</h1>
                <Link href="/organizer/events/create" passHref>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Listing
                </Button>
                </Link>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Listings</CardTitle>
                    <CardDescription>Manage all your events and tours from one place.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    )
}

export default function MyListingsPage() {
    return (
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <MyListingsPageInternal />
        </Suspense>
    )
}
