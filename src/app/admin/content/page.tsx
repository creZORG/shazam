

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Contact, FileImage, Users, Briefcase, Rss, Loader2, UploadCloud, X, Share2, MousePointerClick, Calendar as CalendarIcon, Image as ImageIcon, Trash2, ShoppingBag, Home } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useTransition, useCallback } from "react";
import { getSiteContent, updateSiteContent, createPoster, getPosters, getTeamMembers, createTeamMember, getBlogPosts, createBlogPost, trackPosterInteraction, deletePoster, createOpportunity, getOpportunities, deleteOpportunity, createProduct, getProducts } from "./actions";
import type { Poster } from "./actions";
import type { TeamMember, BlogPost, ExternalEventPricing, Opportunity, Product, FeatureCardContent, PartnerSectionContent } from "@/lib/types";
import { uploadImage } from "@/app/organizer/events/create/cloudinary-actions";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


const featureCardSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  href: z.string().min(1, "Link is required"),
  cta: z.string().min(1, "CTA text is required"),
  imageUrl: z.string().url("Image URL is required"),
});

const partnerSectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  href: z.string().min(1, "Link is required"),
  cta: z.string().min(1, "CTA text is required"),
  imageUrl: z.string().url("Image URL is required"),
});


const contentSchema = z.object({
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().email({ message: "Invalid email address." }).optional(),
    location: z.string().optional(),
    mapsLink: z.string().url({ message: "Invalid URL." }).optional(),
  }),
  socials: z.object({
    twitter: z.string().url({ message: "Invalid URL." }).optional(),
    instagram: z.string().url({ message: "Invalid URL." }).optional(),
    facebook: z.string().url({ message: "Invalid URL." }).optional(),
  }),
  homepage: z.object({
      featureCards: z.array(featureCardSchema).optional(),
      partnerSection: partnerSectionSchema.optional(),
  }).optional()
});

const posterSchema = z.object({
    title: z.string().min(3, "Title is required."),
    imageUrl: z.string().url("An uploaded image is required."),
    ctaLink: z.string().url("A valid URL is required."),
    venue: z.string().min(3, "Venue is required."),
    date: z.date({ required_error: "A date is required."}),
    pricingType: z.enum(['Free', 'Paid', 'RSVP', 'Online'], { required_error: "You must select a pricing type."}),
});

const teamMemberSchema = z.object({
    name: z.string().min(3, "Name is required."),
    role: z.string().min(2, "Role is required."),
    imageUrl: z.string().url("An image is required."),
    bio: z.string().optional(),
});

const blogPostSchema = z.object({
    title: z.string().min(3, "Title is required."),
    tldr: z.string().max(200, "TLDR is too long").optional(),
    content: z.string().min(50, "Content must be at least 50 characters."),
    expiresAt: z.date().optional(),
});

const carouselSchema = z.object({
    title: z.string().min(3, "Title is required (e.g., Carousel Image 1)."),
    imageUrl: z.string().url("An uploaded image is required."),
    ctaLink: z.string().url("A valid URL is required for the carousel link."),
});

const opportunitySchema = z.object({
    title: z.string().min(3, "Title is required."),
    description: z.string().min(10, "A short description is required."),
    type: z.enum(['Job', 'Partnership', 'Volunteer'], { required_error: "You must select an opportunity type."}),
    ctaLink: z.string().url("A valid URL for the call to action is required."),
});

function ImageUploader({ onUpload, children, className }: { onUpload: (url: string) => void, children: React.ReactNode, className?: string }) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadImage(formData);
      if (result.success && result.url) {
        onUpload(result.url);
      } else {
        toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
      }
      setIsUploading(false);
    },
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    maxFiles: 1,
  });

  return (
    <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary relative aspect-video flex items-center justify-center", className)}>
      <input {...getInputProps()} />
      {children}
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}

function HomePageContentTab({ form }: { form: any }) { // Using `any` for simplicity as it's complex
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "homepage.featureCards",
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>"What are you looking for?" Section</CardTitle>
          <CardDescription>Manage the three feature cards on the homepage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((item, index) => (
            <Card key={item.id} className="p-4 bg-muted/30">
                <FormField control={form.control} name={`homepage.featureCards.${index}.imageUrl`} render={({ field }) => (
                    <FormItem className="mb-4">
                        <FormLabel>Card {index + 1} Image</FormLabel>
                         <ImageUploader onUpload={(url) => field.onChange(url)}>
                            {field.value ? <Image src={field.value} alt={`Card ${index + 1} preview`} fill className="object-cover rounded-md" /> : <ImageIcon className="h-10 w-10 text-muted-foreground" />}
                        </ImageUploader>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`homepage.featureCards.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`homepage.featureCards.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`homepage.featureCards.${index}.href`} render={({ field }) => (<FormItem><FormLabel>Link URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name={`homepage.featureCards.${index}.cta`} render={({ field }) => (<FormItem><FormLabel>Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
            </Card>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
            <CardTitle>"Partner With Us" Section</CardTitle>
            <CardDescription>Manage the call-to-action section at the bottom of the homepage.</CardDescription>
        </CardHeader>
         <CardContent className="space-y-4">
            <FormField control={form.control} name="homepage.partnerSection.imageUrl" render={({ field }) => (
                <FormItem><FormLabel>Image</FormLabel>
                    <ImageUploader onUpload={(url) => field.onChange(url)} className="aspect-[4/3]">
                        {field.value ? <Image src={field.value} alt="Partner section preview" fill className="object-cover rounded-md" /> : <ImageIcon className="h-10 w-10 text-muted-foreground" />}
                    </ImageUploader>
                    <FormMessage />
                </FormItem>
            )} />
             <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="homepage.partnerSection.title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="homepage.partnerSection.description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="homepage.partnerSection.href" render={({ field }) => (<FormItem><FormLabel>Link URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="homepage.partnerSection.cta" render={({ field }) => (<FormItem><FormLabel>Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CarouselTab() {
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [carouselImages, setCarouselImages] = useState<Poster[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    const form = useForm<z.infer<typeof carouselSchema>>({
        resolver: zodResolver(carouselSchema),
        defaultValues: { title: "Carousel Image", imageUrl: "", ctaLink: "" },
    });

    const fetchCarouselImages = () => {
         getPosters().then(result => {
            if (result.data) {
                setCarouselImages(result.data.filter(p => p.title.toLowerCase().includes('carousel')));
            }
            setIsLoading(false);
        })
    }

    useEffect(() => {
        fetchCarouselImages();
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles) => {
            if (carouselImages.length >= 6) {
                toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can only have 6 carousel images.' });
                return;
            }
            const file = acceptedFiles[0];
            if (!file) return;
            setIsUploading(true);
            const formData = new FormData();
            formData.append("file", file);
            const result = await uploadImage(formData);
            if (result.success && result.url) {
                form.setValue('imageUrl', result.url, { shouldValidate: true, shouldDirty: true });
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
            }
            setIsUploading(false);
        },
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        maxFiles: 1,
    });
    
    const handleRemoveImage = () => {
        form.setValue('imageUrl', '', { shouldValidate: true, shouldDirty: true });
    }

    const onSubmit = (values: z.infer<typeof carouselSchema>) => {
        startSavingTransition(async () => {
            const cleanedValues = {
                ...values,
                imageUrl: values.imageUrl.trim(),
            };
            const result = await createPoster(cleanedValues as any);
            if (result.success) {
                toast({ title: "Carousel Image Added!", description: "The new image has been added to the carousel."});
                fetchCarouselImages();
                form.reset({ title: "Carousel Image", imageUrl: "", ctaLink: "" });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

    const handleDelete = (id: string) => {
        startDeletingTransition(async () => {
            const result = await deletePoster(id);
            if (result.success) {
                toast({ title: "Image Deleted" });
                fetchCarouselImages();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }
    
    const imageUrl = form.watch('imageUrl');

    return (
        <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
                 <Card>
                    <CardHeader><CardTitle>Add Carousel Image</CardTitle></CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormItem>
                                    <FormLabel>Image (Max 6)</FormLabel>
                                    <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary aspect-video flex items-center justify-center", isDragActive && "border-primary", imageUrl && "p-0")}>
                                        <input {...getInputProps()} />
                                        { isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : imageUrl ? (
                                            <div className="relative w-full h-full group">
                                                <Image src={imageUrl} alt="Poster preview" fill className="object-cover rounded-lg" />
                                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 z-10" onClick={handleRemoveImage}><X className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground">
                                                <UploadCloud className="mx-auto h-12 w-12" />
                                                <p>Click or drag to upload</p>
                                            </div>
                                        )}
                                    </div>
                                    <FormMessage>{form.formState.errors.imageUrl?.message}</FormMessage>
                                </FormItem>
                                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Carousel Image 1" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="ctaLink" render={({ field }) => (<FormItem><FormLabel>Link URL</FormLabel><FormControl><Input placeholder="https://example.com/event" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <Button type="submit" disabled={isSaving || isUploading || carouselImages.length >= 6} className="w-full">{isSaving && <Loader2 className="mr-2 animate-spin"/>} Save Image</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-3">
                 <Card>
                    <CardHeader><CardTitle>Current Carousel Images</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : carouselImages.length === 0 ? <p className="text-muted-foreground text-center">No carousel images uploaded yet.</p> :
                            carouselImages.map(poster => (
                                <div key={poster.id} className="flex items-center gap-4 p-2 border rounded-lg">
                                    <Image src={poster.imageUrl} alt={poster.title} width={128} height={72} className="rounded-md object-cover aspect-video" />
                                    <div className="flex-grow">
                                        <h4 className="font-semibold">{poster.title}</h4>
                                        <a href={poster.ctaLink} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline truncate">{poster.ctaLink}</a>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={isDeleting}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the carousel image.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(poster.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


function PostersTab() {
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [posters, setPosters] = useState<Poster[]>([]);
    const [isLoadingPosters, setIsLoadingPosters] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    const form = useForm<z.infer<typeof posterSchema>>({
        resolver: zodResolver(posterSchema),
        defaultValues: { title: "", imageUrl: "", ctaLink: "", venue: "", pricingType: 'Paid' },
    });

    const fetchPosters = () => {
        getPosters().then(result => {
            if (result.data) setPosters(result.data.filter(p => !p.title.toLowerCase().includes('carousel')));
            setIsLoadingPosters(false);
        })
    }

    useEffect(() => {
        fetchPosters();
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;
            setIsUploading(true);
            const formData = new FormData();
            formData.append("file", file);
            const result = await uploadImage(formData);
            if (result.success && result.url) {
                form.setValue('imageUrl', result.url, { shouldValidate: true, shouldDirty: true });
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
            }
            setIsUploading(false);
        },
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        maxFiles: 1,
    });
    
    const handleRemoveImage = () => {
        form.setValue('imageUrl', '', { shouldValidate: true, shouldDirty: true });
    }

    const onSubmit = (values: z.infer<typeof posterSchema>) => {
        startSavingTransition(async () => {
            const result = await createPoster({
                ...values,
                date: values.date.toISOString(),
            });
            if (result.success) {
                toast({ title: "Poster Created!", description: "The new poster has been added."});
                fetchPosters();
                form.reset();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

    const handleDelete = (id: string) => {
        startDeletingTransition(async () => {
            const result = await deletePoster(id);
            if (result.success) {
                toast({ title: "Poster Deleted" });
                fetchPosters();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }
    
    const imageUrl = form.watch('imageUrl');

    return (
        <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
                 <Card>
                    <CardHeader><CardTitle>Add New Poster</CardTitle></CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormItem>
                                    <FormLabel>Poster Image</FormLabel>
                                    <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary aspect-[4/5] flex items-center justify-center", isDragActive && "border-primary", imageUrl && "p-0")}>
                                        <input {...getInputProps()} />
                                        { isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : imageUrl ? (
                                            <div className="relative w-full h-full group">
                                                <Image src={imageUrl} alt="Poster preview" fill className="object-cover rounded-lg" />
                                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 z-10" onClick={handleRemoveImage}><X className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground">
                                                <UploadCloud className="mx-auto h-12 w-12" />
                                                <p>Click or drag to upload</p>
                                            </div>
                                        )}
                                    </div>
                                    <FormMessage>{form.formState.errors.imageUrl?.message}</FormMessage>
                                </FormItem>
                                 <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Event Title</FormLabel><FormControl><Input placeholder="e.g., Nakuru Tech Fest" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                 <FormField control={form.control} name="venue" render={({ field }) => (<FormItem><FormLabel>Venue</FormLabel><FormControl><Input placeholder="e.g., Nakuru Athletics Club" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                 <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><Button type="button" variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="pricingType" render={({ field }) => (
                                    <FormItem className="space-y-3"><FormLabel>Pricing</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                                {(['Free', 'Paid', 'RSVP', 'Online'] as ExternalEventPricing[]).map(type => (
                                                    <FormItem key={type} className="flex items-center space-x-2">
                                                        <FormControl><RadioGroupItem value={type} /></FormControl>
                                                        <FormLabel className="font-normal">{type}</FormLabel>
                                                    </FormItem>
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}/>

                                 <FormField control={form.control} name="ctaLink" render={({ field }) => (<FormItem><FormLabel>External Link (for tickets/RSVP)</FormLabel><FormControl><Input placeholder="https://example.com/tickets" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <Button type="submit" disabled={isSaving || isUploading} className="w-full">{isSaving && <Loader2 className="mr-2 animate-spin"/>} Save Poster</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-3">
                 <Card>
                    <CardHeader><CardTitle>Uploaded Posters</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {isLoadingPosters ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : posters.length === 0 ? <p className="text-muted-foreground text-center">No posters uploaded yet.</p> :
                            posters.map(poster => (
                                <div key={poster.id} className="flex items-center gap-4 p-2 border rounded-lg">
                                    <Image src={poster.imageUrl} alt={poster.title} width={100} height={125} className="rounded-md object-cover aspect-[4/5]" />
                                    <div className="flex-grow">
                                        <h4 className="font-semibold">{poster.title}</h4>
                                        <p className="text-sm text-muted-foreground">{poster.venue}</p>
                                        <p className="text-xs text-muted-foreground">{poster.date ? format(new Date(poster.date), 'PP') : ''}</p>
                                        <a href={poster.ctaLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">{poster.ctaLink}</a>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 text-sm">
                                        <div className="flex items-center gap-1 text-muted-foreground" title="Clicks"><MousePointerClick className="h-4 w-4" /> {poster.clicks}</div>
                                        <div className="flex items-center gap-1 text-muted-foreground" title="Shares"><Share2 className="h-4 w-4" /> {poster.shares}</div>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={isDeleting}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the poster.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(poster.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function TeamMembersTab() {
    const { toast } = useToast();
    const [isSaving, startTransition] = useTransition();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    const form = useForm<z.infer<typeof teamMemberSchema>>({
        resolver: zodResolver(teamMemberSchema),
        defaultValues: { name: "", role: "", imageUrl: "", bio: "" },
    });

    useEffect(() => {
        getTeamMembers().then(result => {
            if (result.data) setMembers(result.data);
            setIsLoading(false);
        })
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;
            setIsUploading(true);
            const formData = new FormData();
            formData.append("file", file)
            const result = await uploadImage(formData);
            if (result.success && result.url) {
                form.setValue('imageUrl', result.url, { shouldValidate: true, shouldDirty: true });
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
            }
            setIsUploading(false);
        },
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        maxFiles: 1,
    });

    const onSubmit = (values: z.infer<typeof teamMemberSchema>) => {
        startTransition(async () => {
            const result = await createTeamMember(values);
            if (result.success) {
                toast({ title: "Team Member Added!" });
                getTeamMembers().then(result => { if (result.data) setMembers(result.data); });
                form.reset();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };
    
    const imageUrl = form.watch('imageUrl');

    return (
        <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
                 <Card>
                    <CardHeader><CardTitle>Add New Member</CardTitle></CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role / Position</FormLabel><FormControl><Input placeholder="e.g., CEO, Lead Developer" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormItem>
                                    <FormLabel>Photo</FormLabel>
                                    <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary aspect-square flex items-center justify-center", isDragActive && "border-primary", imageUrl && "p-0")}>
                                        <input {...getInputProps()} />
                                        { isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : imageUrl ? (
                                            <div className="relative w-full h-full group">
                                                <Image src={imageUrl} alt="Preview" fill className="object-cover rounded-lg" />
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground"><UploadCloud className="mx-auto h-12 w-12" /><p>Click or drag to upload</p></div>
                                        )}
                                    </div>
                                    <FormMessage>{form.formState.errors.imageUrl?.message}</FormMessage>
                                </FormItem>
                                <FormField control={form.control} name="bio" render={({ field }) => (<FormItem><FormLabel>Short Bio (Optional)</FormLabel><FormControl><Textarea placeholder="A little about them..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <Button type="submit" disabled={isSaving || isUploading} className="w-full">{isSaving && <Loader2 className="mr-2 animate-spin"/>} Add Team Member</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-3">
                 <Card>
                    <CardHeader><CardTitle>Current Team</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : members.length === 0 ? <p className="text-muted-foreground text-center">No team members added yet.</p> :
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {members.map(member => (
                                    <div key={member.id} className="text-center">
                                        <Image src={member.imageUrl} alt={member.name} width={150} height={150} className="rounded-full aspect-square object-cover mx-auto" />
                                        <h4 className="font-semibold mt-2">{member.name}</h4>
                                        <p className="text-xs text-primary">{member.role}</p>
                                    </div>
                                ))}
                            </div>
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function BlogPostsTab() {
    const { toast } = useToast();
    const [isSaving, startTransition] = useTransition();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const form = useForm<z.infer<typeof blogPostSchema>>({
        resolver: zodResolver(blogPostSchema),
        defaultValues: { title: "", tldr: "", content: "" },
    });

     useEffect(() => {
        getBlogPosts().then(result => {
            if (result.data) setPosts(result.data);
            setIsLoading(false);
        })
    }, []);

    const onSubmit = (values: z.infer<typeof blogPostSchema>) => {
        startTransition(async () => {
            const result = await createBlogPost({
                ...values,
                expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
            });
            if (result.success) {
                toast({ title: "Blog Post Published!" });
                getBlogPosts().then(result => { if (result.data) setPosts(result.data); });
                form.reset();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

    return (
         <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader><CardTitle>Create New Blog Post</CardTitle></CardHeader>
                    <CardContent>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Post Title</FormLabel><FormControl><Input placeholder="e.g., Top 5 Events This Month" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="tldr" render={({ field }) => (<FormItem><FormLabel>TL;DR Summary (Optional)</FormLabel><FormControl><Textarea placeholder="A short, catchy summary." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Full Content</FormLabel><FormControl><Textarea placeholder="Write your blog post here. It supports markdown." rows={10} {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="expiresAt" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Archive Date (Optional)</FormLabel><Popover><PopoverTrigger asChild><Button type="button" variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Never</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                                <Button type="submit" disabled={isSaving} className="w-full">{isSaving && <Loader2 className="mr-2 animate-spin"/>} Publish Post</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
             <div className="md:col-span-3">
                 <Card>
                    <CardHeader><CardTitle>Published Posts</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : posts.length === 0 ? <p className="text-muted-foreground text-center">No blog posts yet.</p> :
                            posts.map(post => (
                                <div key={post.id} className="p-3 border rounded-lg">
                                    <h4 className="font-semibold">{post.title}</h4>
                                    <p className="text-xs text-muted-foreground">By {post.authorName} on {format(new Date(post.createdAt), 'PP')}</p>
                                </div>
                            ))
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function OpportunitiesTab() {
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [isDeleting, startDeletingTransition] = useTransition();
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const form = useForm<z.infer<typeof opportunitySchema>>({
        resolver: zodResolver(opportunitySchema),
        defaultValues: { title: "", description: "", type: "Job", ctaLink: "" },
    });
    
    const fetchOpportunities = () => {
        getOpportunities().then(result => {
            if (result.data) setOpportunities(result.data);
            setIsLoading(false);
        })
    }

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const onSubmit = (values: z.infer<typeof opportunitySchema>) => {
        startSavingTransition(async () => {
            const result = await createOpportunity(values);
            if (result.success) {
                toast({ title: "Opportunity Published!" });
                fetchOpportunities();
                form.reset();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

    const handleDelete = (id: string) => {
        startDeletingTransition(async () => {
            const result = await deleteOpportunity(id);
             if (result.success) {
                toast({ title: "Opportunity Deleted" });
                fetchOpportunities();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }

    return (
         <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader><CardTitle>Create New Opportunity</CardTitle></CardHeader>
                    <CardContent>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Opportunity Title</FormLabel><FormControl><Input placeholder="e.g., Lead Event Planner" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Job">Job</SelectItem><SelectItem value="Partnership">Partnership</SelectItem><SelectItem value="Volunteer">Volunteer</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Short Description</FormLabel><FormControl><Textarea placeholder="A brief overview of the role or opportunity." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="ctaLink" render={({ field }) => (<FormItem><FormLabel>Link for more info / application</FormLabel><FormControl><Input placeholder="https://your-career-page.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <Button type="submit" disabled={isSaving} className="w-full">{isSaving && <Loader2 className="mr-2 animate-spin"/>} Publish Opportunity</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
             <div className="md:col-span-3">
                 <Card>
                    <CardHeader><CardTitle>Live Opportunities</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : opportunities.length === 0 ? <p className="text-muted-foreground text-center">No opportunities posted yet.</p> :
                            opportunities.map(opp => (
                                <div key={opp.id} className="p-3 border rounded-lg flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold">{opp.title} <span className="text-xs font-normal bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full ml-2">{opp.type}</span></p>
                                        <p className="text-sm text-muted-foreground">{opp.description}</p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={isDeleting}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the opportunity.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(opp.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function AdminContentPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState("homepage");

    const defaultValues: z.infer<typeof contentSchema> = {
        contact: { phone: "", email: "", location: "", mapsLink: "" },
        socials: { twitter: "", instagram: "", facebook: "" },
        homepage: {
            featureCards: [
                { title: "Events", description: "From music festivals to tech conferences, find your next experience.", href: "/events", cta: "Browse Events", imageUrl: "https://picsum.photos/seed/cat-event/800/600" },
                { title: "Tours", description: "Explore the beauty of Nakuru with our curated local tours.", href: "/tours", cta: "Discover Tours", imageUrl: "https://picsum.photos/seed/cat-tour/800/600" },
                { title: "Nightlife", description: "Discover the hottest parties, DJ sets, and club events happening tonight.", href: "/nightlife", cta: "Explore Nightlife", imageUrl: "https://picsum.photos/seed/cat-night/800/600" },
            ],
            partnerSection: {
                title: "Launch Your Event to the Moon",
                description: "Are you an event organizer, tour operator, or influencer? NaksYetu provides the platform, tools, and audience to guarantee your success. Manage listings, sell tickets, and engage with your community—all in one place.",
                href: "/partner-with-us",
                cta: "Start Selling Today",
                imageUrl: "https://picsum.photos/seed/partner/800/600",
            }
        }
    };


    const form = useForm<z.infer<typeof contentSchema>>({
        resolver: zodResolver(contentSchema),
        defaultValues,
    });

    useEffect(() => {
        setIsLoading(true);
        getSiteContent().then(result => {
            if (result.data) {
                const mergedData = {
                  ...defaultValues,
                  ...result.data,
                  homepage: {
                    ...defaultValues.homepage,
                    ...result.data.homepage,
                  }
                };
                form.reset(mergedData);
            } else if (result.error) {
                toast({ variant: 'destructive', title: "Error", description: result.error });
            }
            setIsLoading(false);
        });
    }, [form, toast]);

    const handleSaveChanges = (values: z.infer<typeof contentSchema>) => {
        startTransition(async () => {
            const result = await updateSiteContent(values);
            if (result.success) {
                toast({ title: "Content Saved!", description: "Your changes have been saved successfully." });
            } else {
                toast({ variant: 'destructive', title: "Error", description: result.error });
            }
        });
    }

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    
    const tabItems = [
        { value: "homepage", icon: Home, label: "Homepage" },
        { value: "contact", icon: Contact, label: "Contact & Socials" },
        { value: "carousel", icon: ImageIcon, label: "Carousel" },
        { value: "posters", icon: FileImage, label: "Posters" },
        { value: "team", icon: Users, label: "Team Members" },
        { value: "opportunities", icon: Briefcase, label: "Opportunities" },
        { value: "blog", icon: Rss, label: "Blog Posts" },
    ];


  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Manage Site Content</h1>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-8">
                <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-center">
                    <TabsList className="p-1.5 h-auto rounded-full bg-background border shadow-md">
                        {tabItems.map(tab => (
                            <TabsTrigger 
                                key={tab.value}
                                value={tab.value} 
                                disabled={(tab as any).disabled}
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
                
                 <TabsContent value="homepage" className="mt-6">
                    <HomePageContentTab form={form} />
                </TabsContent>
                <TabsContent value="contact" className="mt-6">
                        <Card>
                            <CardHeader><CardTitle>Contact Information</CardTitle><CardDescription>This information will be displayed in the site footer.</CardDescription></CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="contact.phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+254 712 345 678" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contact.email" render={({ field }) => (<FormItem><FormLabel>Public Email</FormLabel><FormControl><Input placeholder="info@naksyetu.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contact.location" render={({ field }) => (<FormItem><FormLabel>Office Location</FormLabel><FormControl><Input placeholder="Nakuru CBD, Kenya" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contact.mapsLink" render={({ field }) => (<FormItem><FormLabel>Google Maps Link</FormLabel><FormControl><Input placeholder="https://maps.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </CardContent>
                        </Card>
                        
                        <Card className="mt-8">
                            <CardHeader><CardTitle>Social Media Links</CardTitle><CardDescription>Links to your social media profiles.</CardDescription></CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="socials.twitter" render={({ field }) => (<FormItem><FormLabel>Twitter / X</FormLabel><FormControl><Input placeholder="https://twitter.com/naksyetu" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="socials.instagram" render={({ field }) => (<FormItem><FormLabel>Instagram</FormLabel><FormControl><Input placeholder="https://instagram.com/naksyetu" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="socials.facebook" render={({ field }) => (<FormItem><FormLabel>Facebook</FormLabel><FormControl><Input placeholder="https://facebook.com/naksyetu" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </CardContent>
                        </Card>
                </TabsContent>
                <TabsContent value="carousel" className="mt-6">
                    <CarouselTab />
                </TabsContent>
                <TabsContent value="posters" className="mt-6">
                    <PostersTab />
                </TabsContent>
                <TabsContent value="team" className="mt-6">
                    <TeamMembersTab />
                </TabsContent>
                <TabsContent value="opportunities" className="mt-6">
                    <OpportunitiesTab />
                </TabsContent>
                <TabsContent value="blog" className="mt-6">
                    <BlogPostsTab />
                </TabsContent>
                </Tabs>

                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 animate-spin"/>}
                    Save All Content Changes
                </Button>
            </form>
        </Form>
    </div>
  );
}



