
'use client';

import { notFound, useRouter } from 'next/navigation';
import { getListingDetailsForAdmin, updateListingStatus, generateManualTicketForAdmin, updateEventGallery } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, User, Ticket, Calendar, BarChart2, DollarSign, Users, Percent, Eye, Settings, UserCheck, Shield, Check, X, Archive, Redo, PlusCircle, Loader2, EyeOff, Download, Minus, Image as ImageIcon, UploadCloud } from 'lucide-react';
import type { Ticket as TicketType, FirebaseUser, Event, Tour, VerificationScan, TicketDefinition } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useTransition, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assignVerifierByAdmin, getVerifierStatsForEvent } from '@/app/admin/verifiers/actions';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { uploadImage } from '@/app/organizer/events/create/cloudinary-actions';

type ListingWithId = (Event | Tour) & { id: string };

type VerifierWithStats = FirebaseUser & {
    stats: {
        total: number;
        valid: number;
        invalid: number;
    }
}

function StatCard({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType, description?: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function OrganizerCard({ organizer }: { organizer: FirebaseUser | null }) {
    if (!organizer) {
        return (
            <Card>
                <CardHeader><CardTitle>Organizer</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">No organizer information available.</p></CardContent>
            </Card>
        )
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Organizer</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                 <Avatar className="h-16 w-16">
                    <AvatarImage src={organizer.profilePicture} />
                    <AvatarFallback>{organizer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold text-lg">{organizer.organizerName || organizer.name}</p>
                    <p className="text-sm text-muted-foreground">{organizer.email}</p>
                </div>
            </CardContent>
            <CardFooter>
                 <Link href={`/admin/users/${organizer.uid}`} className="w-full">
                    <Button variant="outline" className="w-full">Manage Organizer</Button>
                </Link>
            </CardFooter>
        </Card>
    )
}

function GalleryManagementModal({ listing, onGalleryUpdate }: { listing: ListingWithId, onGalleryUpdate: (urls: string[]) => void }) {
    const [imageUrls, setImageUrls] = useState<string[]>(listing.gallery || []);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    const onDrop = async (acceptedFiles: File[]) => {
        setIsUploading(true);
        const filesToUpload = acceptedFiles.slice(0, 15 - imageUrls.length);

        if (filesToUpload.length !== acceptedFiles.length) {
            toast({ variant: 'destructive', title: 'Upload Limit Exceeded', description: 'You can only upload a maximum of 15 images.' });
        }

        const uploadPromises = filesToUpload.map(file => {
            const formData = new FormData();
            formData.append("file", file);
            return uploadImage(formData);
        });

        try {
            const results = await Promise.all(uploadPromises);
            const successfulUrls = results.filter(r => r.success).map(r => r.url!);
            setImageUrls(prev => [...prev, ...successfulUrls]);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Some images failed to upload.' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const removeImage = (index: number) => {
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    });
    
    const handleSave = () => {
        startSaving(async () => {
            const result = await updateEventGallery(listing.id, imageUrls);
            if (result.success) {
                onGalleryUpdate(imageUrls);
                toast({ title: "Gallery Updated!", description: "The event gallery has been saved." });
            } else {
                toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
            }
        });
    }

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Manage Event Gallery</DialogTitle>
                <DialogDescription>Upload up to 15 images to showcase this event.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary", isDragActive && "border-primary")}>
                    <input {...getInputProps()} />
                    {isUploading ? <Loader2 className="mx-auto h-12 w-12 animate-spin" /> : <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />}
                    <p className="mt-2 text-sm text-muted-foreground">Drag 'n' drop images here, or click to select files (up to 15).</p>
                </div>
                {imageUrls.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {imageUrls.map((url, index) => (
                            <div key={index} className="relative group aspect-square">
                                <Image src={url} alt={`Gallery image ${index + 1}`} fill className="object-cover rounded-md" />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 z-10" onClick={() => removeImage(index)}><X className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <Button onClick={handleSave} disabled={isSaving || isUploading}>
                    {isSaving && <Loader2 className="mr-2 animate-spin" />}
                    Save Gallery
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function GateTicketModal({ event, onTicketsGenerated }: { event: ListingWithId, onTicketsGenerated: (orderId: string) => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    
    useEffect(() => {
        setQuantities({});
    }, [event]);

    const handleQuantityChange = (name: string, delta: number) => {
        setQuantities(prev => ({
            ...prev,
            [name]: Math.max(0, (prev[name] || 0) + delta)
        }));
    };

    const ticketsToGenerate = Object.entries(quantities)
        .map(([name, quantity]) => ({ name, quantity }))
        .filter(t => t.quantity > 0);
        
    const totalTickets = ticketsToGenerate.reduce((sum, t) => sum + t.quantity, 0);

    const handleGenerate = async (status: 'valid' | 'used') => {
        if (!event || ticketsToGenerate.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select tickets to generate.' });
            return;
        }
        setLoading(true);
        const result = await generateManualTicketForAdmin(event.id, ticketsToGenerate, status);
        if(result.success && result.orderId) {
            toast({ title: 'Tickets Generated!', description: `${totalTickets} new ticket(s) have been created.`});
            onTicketsGenerated(result.orderId);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setLoading(false);
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Generate At-the-Gate Tickets</DialogTitle>
                <DialogDescription>
                    Create tickets for attendees. Select the type and quantity below.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                    <Label>Ticket Types</Label>
                    {(event as Event).tickets && (event as Event).tickets!.length > 0 ? (event as Event).tickets!.map(def => (
                        <div key={def.name} className="flex justify-between items-center p-3 border rounded-md">
                            <span className="font-medium">{def.name}</span>
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleQuantityChange(def.name, -1)}><Minus className="h-4 w-4"/></Button>
                                <span className="font-bold w-6 text-center">{quantities[def.name] || 0}</span>
                                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleQuantityChange(def.name, 1)}><PlusCircle className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground">No ticket types are configured for this event.</p>
                    )}
                </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
                 <div className="flex-grow space-y-2">
                     <Button onClick={() => handleGenerate('valid')} disabled={loading || totalTickets === 0} variant="secondary" className="w-full">
                        {loading && <Loader2 className="animate-spin mr-2" />}
                        Generate Valid Ticket(s)
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">Creates a standard, unscanned ticket for later use.</p>
                 </div>
                 <div className="flex-grow space-y-2">
                    <Button onClick={() => handleGenerate('used')} disabled={loading || totalTickets === 0} className="w-full">
                        {loading && <Loader2 className="animate-spin mr-2" />}
                        Generate & Use for Entry
                    </Button>
                     <p className="text-xs text-muted-foreground text-center">For attendees entering now. Ticket will be marked as used.</p>
                 </div>
            </DialogFooter>
        </DialogContent>
    )
}

function ActionsTab({ listing }: { listing: ListingWithId }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [generatedOrderId, setGeneratedOrderId] = useState<string | null>(null);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

    const handleStatusUpdate = (status: 'published' | 'rejected' | 'taken-down' | 'archived') => {
        startTransition(async () => {
            const result = await updateListingStatus(listing.id, (listing as Event).venue ? 'event' : 'tour', status);
            if (result.success) {
                toast({ title: 'Status Updated', description: `Listing has been ${status}.`});
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
            }
        });
    };
    
    const handleTicketsGenerated = (orderId: string) => {
        setIsTicketModalOpen(false);
        setGeneratedOrderId(orderId);
        setShowSuccessModal(true);
    };

    const listingType = (listing as Event).venue ? 'event' : 'tour';
    const isEvent = listingType === 'event';

    return (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Change Status</CardTitle>
                    <CardDescription>Approve, reject, or archive this listing.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    {listing.status !== 'published' && <Button onClick={() => handleStatusUpdate('published')} disabled={isPending}><Check className="mr-2"/>Approve</Button>}
                    {listing.status === 'published' && <Button variant="destructive" onClick={() => handleStatusUpdate('taken-down')} disabled={isPending}><EyeOff className="mr-2"/>Take Down</Button>}
                    {listing.status !== 'published' && listing.status !== 'rejected' && <Button variant="destructive" onClick={() => handleStatusUpdate('rejected')} disabled={isPending}><X className="mr-2"/>Reject</Button>}
                    {listing.status === 'rejected' && <Button onClick={() => handleStatusUpdate('published')} disabled={isPending}><Redo className="mr-2"/>Re-approve</Button>}
                    {listing.status !== 'archived' && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="destructive" className="col-span-2" disabled={isPending}><Archive className="mr-2"/>Archive</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Confirm Archiving</AlertDialogTitle><AlertDialogDescription>Archiving this listing is a permanent action and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleStatusUpdate('archived')}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </CardContent>
            </Card>
            
            {isEvent && (
                <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
                 <Card>
                    <CardHeader>
                        <CardTitle>Generate Gate Ticket</CardTitle>
                        <CardDescription>Manually create tickets for gate entry.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <DialogTrigger asChild>
                            <Button className="w-full">
                                <PlusCircle className="mr-2" /> Generate Tickets
                            </Button>
                        </DialogTrigger>
                    </CardContent>
                </Card>
                 <GateTicketModal event={listing} onTicketsGenerated={handleTicketsGenerated} />
                </Dialog>
            )}

             <Card>
                <CardHeader>
                    <CardTitle>Other Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Link href={`/organizer/events/create?id=${listing.id}&type=${listingType}`} className="w-full block">
                        <Button variant="outline" className="w-full">Edit Full Listing</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
        <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Ticket Generated Successfully!</AlertDialogTitle>
                    <AlertDialogDescription>A new ticket has been created. You can now download it from the Ticket Center.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                     <AlertDialogCancel>Close</AlertDialogCancel>
                     <Link href={`/ticket-center?orderId=${generatedOrderId}`} target="_blank">
                        <Button><Download className="mr-2" /> Download Tickets</Button>
                    </Link>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}

function VerifiersTab({ eventId }: { eventId: string }) {
    const { toast } = useToast();
    const [isAssigning, startAssigning] = useTransition();
    const [username, setUsername] = useState('');
    const [verifiers, setVerifiers] = useState<VerifierWithStats[]>([]);
    const [loadingVerifiers, setLoadingVerifiers] = useState(true);

    const fetchVerifiers = useCallback(() => {
        setLoadingVerifiers(true);
        getVerifierStatsForEvent(eventId).then(result => {
            if (result.success && result.data) {
                setVerifiers(result.data as VerifierWithStats[]);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
            setLoadingVerifiers(false);
        });
    }, [eventId, toast]);

    useEffect(() => {
        fetchVerifiers();
    }, [fetchVerifiers]);

    const handleAssign = () => {
        if (!username) return;
        startAssigning(async () => {
            const result = await assignVerifierByAdmin({ username, eventId });
            if (result.success) {
                toast({ title: 'Success', description: result.message });
                setUsername('');
                fetchVerifiers(); // Refresh the list
            } else {
                toast({ variant: 'destructive', title: 'Assignment Failed', description: result.error });
            }
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Assign Verifier</CardTitle>
                    <CardDescription>Assign a user to verify tickets for this event. If the user is an attendee, their role will be upgraded to Verifier.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="verifier-username">Username</Label>
                        <div className="flex gap-2">
                             <Input id="verifier-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username..." />
                             <Button onClick={handleAssign} disabled={isAssigning || !username}>
                                {isAssigning && <Loader2 className="animate-spin mr-2" />}
                                Assign
                             </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Assigned Verifiers</CardTitle>
                    <CardDescription>Users who can scan tickets for this event.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingVerifiers ? <Loader2 className="animate-spin" /> : verifiers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Verifier</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Valid</TableHead>
                                    <TableHead>Invalid</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {verifiers.map(v => (
                                    <TableRow key={v.uid}>
                                        <TableCell className="font-medium">{v.name}</TableCell>
                                        <TableCell>{v.stats.total}</TableCell>
                                        <TableCell className="text-green-500">{v.stats.valid}</TableCell>
                                        <TableCell className="text-red-500">{v.stats.invalid}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-8">No verifiers assigned yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function AttendeesTab({ attendees }: { attendees: (TicketType & { user?: FirebaseUser; })[] }) {
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

    const filteredAttendees = useMemo(() => {
        let filtered = attendees;
        if (activeTab === 'used') {
            filtered = attendees.filter(a => a.status === 'used');
        } else if (activeTab === 'valid') {
            filtered = attendees.filter(a => a.status === 'valid');
        }

        if (debouncedSearchTerm) {
            filtered = filtered.filter(a => 
                a.userName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                a.user?.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            );
        }
        return filtered;
    }, [attendees, activeTab, debouncedSearchTerm]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Attendee List</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                     <Input 
                        placeholder="Search by name or email..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                     />
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="all">All ({attendees.length})</TabsTrigger>
                            <TabsTrigger value="used">Used ({attendees.filter(a => a.status === 'used').length})</TabsTrigger>
                            <TabsTrigger value="valid">Valid ({attendees.filter(a => a.status === 'valid').length})</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Ticket Type</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAttendees.map(attendee => (
                            <TableRow key={attendee.id}>
                                <TableCell className="font-medium">{attendee.userName}</TableCell>
                                <TableCell>{attendee.user?.email || 'N/A'}</TableCell>
                                <TableCell>{attendee.ticketType}</TableCell>
                                <TableCell>
                                    <Badge variant={attendee.status === 'used' ? 'secondary' : 'default'} className="capitalize">{attendee.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {filteredAttendees.length === 0 && <p className="text-center py-12 text-muted-foreground">No attendees match your criteria.</p>}
            </CardContent>
        </Card>
    );
}

export default function ListingManagementPage({ params, searchParams }: { params: { id: string }, searchParams: { type: 'event' | 'tour' } }) {
    const { id } = params;
    const { type } = searchParams;
    const [listingData, setListingData] = useState<{ listing: ListingWithId; stats: any; attendees: (TicketType & { user?: FirebaseUser | undefined; })[]; organizer: FirebaseUser | null; } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    
    useEffect(() => {
        if (id && type) {
            getListingDetailsForAdmin(id, type).then(result => {
                if (result.success && result.data) {
                    setListingData(result.data as any);
                } else {
                    notFound();
                }
                setLoading(false);
            });
        } else {
            notFound();
        }
    }, [id, type]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>

    if (!listingData) {
        notFound();
    }
    
    const { listing, stats, attendees, organizer } = listingData;
    const listingDate = (listing as Event).date || (listing as Tour).startDate;

    const isPast = new Date(listingDate) < new Date();

    const handleGalleryUpdate = (urls: string[]) => {
        setListingData(prev => prev ? ({ ...prev, listing: { ...prev.listing, gallery: urls } as ListingWithId }) : null);
    }

    const tabItems = [
      { value: "overview", icon: BarChart2, label: "Overview" },
      { value: "attendees", icon: Users, label: `Attendees (${attendees.length})` },
      { value: "verifiers", icon: UserCheck, label: "Verifiers" },
      { value: "actions", icon: Shield, label: "Actions" },
    ]

    return (
        <div className="space-y-8">
            <Link href={`/admin/${type}s`} className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2" /> Back to All {type === 'event' ? 'Events' : 'Tours'}
            </Link>
            
             <div className="flex justify-between items-start">
                <div>
                    <Badge variant="secondary" className="capitalize mb-2">{listing.status}</Badge>
                    <h1 className="text-3xl font-bold">{listing.name}</h1>
                    <p className="text-muted-foreground font-mono text-xs">{listing.id}</p>
                </div>
                 <div className="text-right">
                    <p className="font-semibold">{format(new Date(listingDate), 'EEEE, MMMM d, yyyy')}</p>
                     <p className="text-sm text-muted-foreground">{(listing as Event).venue || (listing as Tour).destination}</p>
                 </div>
            </div>
            
            <Tabs defaultValue="overview" onValueChange={setActiveTab}>
                <div className="flex justify-center">
                    <TabsList className="p-1.5 h-auto rounded-full bg-background border shadow-md">
                        {tabItems.map(tab => (
                            <TabsTrigger 
                                key={tab.value}
                                value={tab.value} 
                                className={cn(
                                    "rounded-full px-3 py-1.5 flex items-center gap-2 transition-all duration-300",
                                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
                                    "data-[state=inactive]:text-muted-foreground",
                                    "sm:w-auto",
                                    activeTab === tab.value ? 'sm:w-auto' : 'sm:w-10 sm:justify-center'
                                )}
                            >
                               <tab.icon className="h-5 w-5 flex-shrink-0" />
                               <span className={cn(
                                   "overflow-hidden transition-all duration-300",
                                    "sm:max-w-xs",
                                    activeTab === tab.value ? 'max-w-xs' : 'max-w-0 sm:max-w-0'
                               )}>
                                   {tab.label}
                               </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                
                <TabsContent value="overview" className="mt-6 space-y-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Revenue" value={`Ksh ${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} />
                        <StatCard title="Tickets Sold" value={stats.totalTicketsSold.toLocaleString()} icon={Ticket} />
                        <StatCard title="Page Views" value={stats.pageViews.toLocaleString()} icon={Eye} />
                        <StatCard title="Conversion Rate" value={`${stats.conversionRate.toFixed(2)}%`} icon={Percent} />
                    </div>

                    {listing.type === 'event' && (
                        <Card>
                            <CardHeader><CardTitle>Ticket Sales Breakdown</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {stats.salesByTicketType.map((ticket: any) => (
                                    <div key={ticket.name}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium">{ticket.name}</span>
                                            <span className="text-muted-foreground">{ticket.sold} / {ticket.total} sold</span>
                                        </div>
                                        <Progress value={(ticket.sold / ticket.total) * 100} />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        <OrganizerCard organizer={organizer} />
                        <Card>
                            <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
                             <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-3xl font-bold">{stats.attendance.scanned}</p>
                                        <p className="text-muted-foreground">Attendees Checked In</p>
                                    </div>
                                    <p className="text-4xl font-bold text-primary">{stats.attendance.rate.toFixed(1)}%</p>
                                </div>
                                <Progress value={stats.attendance.rate} />
                             </CardContent>
                        </Card>
                         {isPast && (
                            <Dialog>
                                <Card>
                                    <CardHeader><CardTitle>Event Gallery</CardTitle><CardDescription>Manage the photos displayed on the public event page now that the event is over.</CardDescription></CardHeader>
                                    <CardFooter>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full"><ImageIcon className="mr-2" /> Manage Gallery</Button>
                                        </DialogTrigger>
                                    </CardFooter>
                                </Card>
                                <GalleryManagementModal listing={listing} onGalleryUpdate={handleGalleryUpdate} />
                            </Dialog>
                        )}
                    </div>

                </TabsContent>
                
                <TabsContent value="attendees" className="mt-6">
                    <AttendeesTab attendees={attendees} />
                </TabsContent>
                <TabsContent value="verifiers" className="mt-6">
                     <VerifiersTab eventId={id} />
                </TabsContent>
                <TabsContent value="actions" className="mt-6">
                    <ActionsTab listing={listing} />
                </TabsContent>

            </Tabs>

        </div>
    )
}
