
'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getRatingTokenDetails, submitRating } from './actions';
import type { Event, Tour, RatingToken } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { Loader2, Send, CheckCircle, AlertTriangle, HelpCircle, Phone, Mail, UploadCloud, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import NextImage from 'next/image';
import { uploadImage } from '@/app/organizer/events/create/cloudinary-actions';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSiteContent } from '@/app/admin/content/actions';
import { getOrganizerById } from '@/app/actions';

type SiteContact = { phone?: string; email?: string; };
type OrganizerContact = { name?: string; };

function ImageUploader({ onUpload, onRemove, existingImages }: { onUpload: (url: string) => void, onRemove: (url: string) => void, existingImages: string[] }) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
        if (existingImages.length + acceptedFiles.length > 5) {
            toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can upload a maximum of 5 images.'});
            return;
        }
        setIsUploading(true);
        const uploadPromises = acceptedFiles.map(file => {
            const formData = new FormData();
            formData.append("file", file);
            return uploadImage(formData);
        });

        const results = await Promise.all(uploadPromises);
        results.forEach(result => {
            if (result.success && result.url) {
                onUpload(result.url);
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
            }
        });
        setIsUploading(false);
    },
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    multiple: true,
  });

  return (
    <div className="space-y-4">
        <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary", isDragActive && "border-primary")}>
            <input {...getInputProps()} />
            {isUploading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />}
            <p className="text-xs mt-2 text-muted-foreground">Click or drag images here (up to 5)</p>
        </div>
        {existingImages.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {existingImages.map(url => (
                    <div key={url} className="relative aspect-square group">
                        <NextImage src={url} alt="Uploaded image" fill className="object-cover rounded-md" />
                         <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => onRemove(url)}>
                            <X className="h-3 w-3"/>
                        </Button>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}

export default function RatingPage() {
    const params = useParams();
    const token = params.token as string;
    const { toast } = useToast();

    const [listing, setListing] = useState<Event | Tour | null>(null);
    const [tokenData, setTokenData] = useState<RatingToken | null>(null);
    const [siteContact, setSiteContact] = useState<SiteContact>({});
    const [organizer, setOrganizer] = useState<OrganizerContact | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("No rating token provided.");
            setLoading(false);
            return;
        }

        getRatingTokenDetails(token).then(async result => {
            if (result.success && result.data) {
                setListing(result.data.listing);
                setTokenData(result.data.tokenData);
                const { data: contactData } = await getSiteContent();
                setSiteContact(contactData?.contact || {});
                if(result.data.listing.organizerId) {
                    const org = await getOrganizerById(result.data.listing.organizerId);
                    setOrganizer({ name: org?.name });
                }
            } else {
                setError(result.error || 'Invalid rating link.');
            }
            setLoading(false);
        });
    }, [token]);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({ variant: 'destructive', title: "Please provide a rating." });
            return;
        }
        if (!listing || !tokenData) return;

        setIsSubmitting(true);
        const result = await submitRating({
            token,
            listingId: listing.id,
            listingType: tokenData.listingType,
            organizerId: listing.organizerId || '',
            rating,
            comment,
            imageUrls,
        });

        if (result.success) {
            setIsSubmitted(true);
        } else {
            toast({ variant: 'destructive', title: "Submission Failed", description: result.error });
        }
        setIsSubmitting(false);
    };

    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
    }
    
    if (isSubmitted) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
                <Card>
                    <CardHeader>
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                        <CardTitle className="text-3xl mt-4">Thank You!</CardTitle>
                        <CardDescription>Your feedback has been submitted successfully. It helps our community and organizers grow.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Link href="/">
                            <Button>Back to Homepage</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (error || !listing) {
        return (
            <div className="container mx-auto max-w-2xl text-center py-20">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-2xl font-bold mt-4">Invalid Link</h2>
                <p className="text-muted-foreground mt-2">{error}</p>
                 <Link href="/"><Button variant="outline" className="mt-6">Go to Homepage</Button></Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">How was "{listing.name}"?</CardTitle>
                    <CardDescription>Your feedback helps other attendees and the organizer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex justify-center">
                        <StarRating onRatingChange={setRating} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="comment">Your Comments (Optional)</Label>
                        <Textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="What did you like or dislike?" />
                    </div>
                    
                     <div className="space-y-2">
                        <Label>Upload Photos (Optional)</Label>
                        <ImageUploader onUpload={(url) => setImageUrls(prev => [...prev, url])} onRemove={(url) => setImageUrls(prev => prev.filter(u => u !== url))} existingImages={imageUrls} />
                    </div>
                    
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <HelpCircle className="mr-2" /> Lost & Found or Other Issues?
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Support & Contact</DialogTitle>
                                <DialogDescription>
                                    If you lost an item or have an urgent issue, please use the contact details below.
                                </DialogDescription>
                            </DialogHeader>
                             <div className="py-4 space-y-4">
                                {organizer?.name && (
                                     <div>
                                        <h4 className="font-semibold">Event Organizer: {organizer.name}</h4>
                                        <p className="text-sm text-muted-foreground">Contact the organizer for event-specific issues.</p>
                                        {/* In a real app, organizer contact would be here */}
                                    </div>
                                )}
                                 <div>
                                    <h4 className="font-semibold">Mov33 Support</h4>
                                    <p className="text-sm text-muted-foreground">For platform or payment issues.</p>
                                    {siteContact.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {siteContact.phone}</p>}
                                    {siteContact.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {siteContact.email}</p>}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0} className="w-full" size="lg">
                        {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                        Submit Feedback
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
