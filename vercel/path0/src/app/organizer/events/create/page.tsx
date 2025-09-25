
'use client';
import React, { useMemo, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, FieldErrors, UseFormReturn } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ageCategories,
  eventCategories,
} from '@/lib/data';
import { PlusCircle, Trash2, X, ArrowLeft, ArrowRight, Save, Loader2, ImagePlus, PartyPopper, Route, AlertCircle, ChevronsUpDown, Gift, Settings } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { saveEvent, saveTour, getListingById } from '../../actions';
import { useAuth } from '@/hooks/use-auth';
import { useSearchParams, useRouter } from 'next/navigation';
import { uploadImage } from './cloudinary-actions';
import { Progress } from '@/components/ui/progress';
import { getProductsForSelect } from './actions';
import type { Product } from '@/lib/types';
import { CheckCircle } from 'lucide-react';

// Schemas
const ticketSchema = z.object({
  name: z.string().min(2, 'Ticket name is too short.'),
  price: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, "Price can't be negative.")),
  quantity: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().positive("Quantity must be positive.")),
  description: z.string().optional(),
  salesStart: z.string().optional(),
  salesEnd: z.string().optional(),
  discountQuantity: z.preprocess((a) => (a ? parseInt(z.string().parse(a), 10) : undefined), z.number().positive("Discount quantity must be positive.").optional()),
  discountPercentage: z.preprocess((a) => (a ? parseFloat(z.string().parse(a)) : undefined), z.number().min(1, "Discount must be at least 1%").max(100, "Discount cannot exceed 100%").optional()),
});

const freeMerchSchema = z.object({
    productId: z.string(),
    productName: z.string(),
}).optional();

const createEventSchema = z.object({
  id: z.string().optional(),
  organizerId: z.string().optional(),
  name: z.string().min(3, 'Event name must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  date: z.string().min(1, 'Date is required.'),
  startTime: z.string().min(1, 'Start time is required.'),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  county: z.string().min(3, 'County is required.'),
  venue: z.string().min(3, 'Venue name is required.'),
  whatsappGroupLink: z.string().url({ message: "Please enter a valid WhatsApp group link." }).optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required.'),
  ageCategory: z.string().min(1, 'Age category is required.'),
  imageUrl: z.string().url('Banner image is required.').min(1, 'Banner image is required.'),
  gallery: z.array(z.string().url()).max(6, "You can upload a maximum of 6 gallery images.").optional(),
  sponsors: z.array(z.string().url()).optional(),
  tickets: z.array(ticketSchema).min(1, 'At least one ticket type is required.'),
  freeMerch: freeMerchSchema,
  acceptTerms: z.boolean().refine((val) => val === true, { message: "You must accept the terms." }),
  acceptRefundPolicy: z.boolean().refine((val) => val === true, { message: "You must accept the policy." }),
  // Football specific
  homeTeam: z.string().optional(),
  awayTeam: z.string().optional(),
  league: z.string().optional(),
});

const tourSchema = z.object({
  id: z.string().optional(),
  organizerId: z.string().optional(),
  name: z.string().min(3, 'Tour name is too short.'),
  description: z.string().min(10, 'Description is too short.'),
  destination: z.string().min(3, 'Destination is required.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  startingPoint: z.string().min(3, 'Starting point is required.'),
  endPoint: z.string().min(3, 'End point is required.'),
  availability: z.string().min(1, 'Availability is required.'),
  itinerary: z.array(z.object({ value: z.string().min(3, 'Itinerary item is too short.')})).min(2, 'At least two itinerary items are required.'),
  inclusions: z.array(z.object({ value: z.string().min(3, 'Inclusion is too short.')})).min(1, 'At least one inclusion is required.'),
  exclusions: z.array(z.object({ value: z.string().min(3, 'Exclusion is too short.')})).min(1, 'At least one exclusion is required.'),
  imageUrl: z.string().url('Banner image is required.').min(1, 'Banner image is required.'),
  price: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, "Price can't be negative.")),
  bookingFee: z.preprocess((a) => a ? parseFloat(z.string().parse(a)) : 0, z.number().min(0).optional()),
  whatsappGroupLink: z.string().url({ message: "Please enter a valid WhatsApp group link." }).optional().or(z.literal('')),
  acceptTerms: z.boolean().refine((val) => val === true, { message: "You must accept the terms." }),
});

type AnyForm = UseFormReturn<z.infer<typeof createEventSchema>> | UseFormReturn<z.infer<typeof tourSchema>>;

// Step Validation Tracker Component
const StepValidationTracker = ({ form, fields, title }: { form: AnyForm, fields: string[], title: string }) => {
  const { formState: { errors, touchedFields } } = form;

  const getFieldValue = (field: string) => form.getValues(field as any);

  const stats = useMemo(() => {
    let completed = 0;
    let fieldErrors = 0;
    
    fields.forEach(field => {
      const value = getFieldValue(field);
      const hasError = !!errors[field as keyof typeof errors];
      
      const isCompleted = Array.isArray(value) ? value.length > 0 : !!value;
      if (isCompleted && !hasError) {
          completed++;
      }

      if (touchedFields[field as keyof typeof touchedFields] && hasError) {
        fieldErrors++;
      }
    });

    return { completed, total: fields.length, errors: fieldErrors };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch()]); // Watching the entire form to trigger re-renders

  return (
      <CardHeader>
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-4 text-sm mt-2">
              <span className="font-medium">{stats.completed}/{stats.total} fields completed</span>
              {stats.errors > 0 && (
                  <span className="flex items-center text-destructive font-medium">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      {stats.errors} {stats.errors === 1 ? 'error' : 'errors'}
                  </span>
              )}
          </div>
      </CardHeader>
  );
};


type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';
type FileUpload = {
  file: File;
  status: UploadStatus;
  progress: number;
  url?: string;
  error?: string;
};

// Image Upload Component
const ImageUpload = ({ onUploadComplete, maxFiles = 1, formFieldName, onRemove, initialUrls = [] }: { onUploadComplete: (urls: string[]) => void; maxFiles: number; formFieldName: "imageUrl" | "gallery", onRemove: (url: string) => void, initialUrls: string[] }) => {
    const [uploads, setUploads] = useState<FileUpload[]>([]);
    const { toast } = useToast();
    
    useEffect(() => {
        setUploads(initialUrls.map(url => ({ file: new File([], ""), status: 'success', progress: 100, url })));
    }, [initialUrls]);
    
    const handleUpload = async (filesToUpload: File[]) => {
      const newUploads: FileUpload[] = filesToUpload.map(file => ({ file, status: 'pending', progress: 0 }));
      setUploads(prev => [...prev, ...newUploads]);
    
      const uploadPromises = newUploads.map(async (upload) => {
        try {
          const formData = new FormData();
          formData.append('file', upload.file);
          
          setUploads(prev => prev.map(u => u === upload ? { ...u, status: 'uploading', progress: 50 } : u));
          
          const result = await uploadImage(formData);

          if (result.success && result.url) {
            setUploads(prev => prev.map(u => u === upload ? { ...u, status: 'success', progress: 100, url: result.url } : u));
            return result.url;
          } else {
             const errorMessage = result.error || 'Unknown upload error';
             setUploads(prev => prev.map(u => u === upload ? { ...u, status: 'error', error: errorMessage } : u));
             toast({ variant: 'destructive', title: `Upload Failed: ${upload.file.name}`, description: errorMessage });
             return null;
          }
        } catch (error: any) {
          const errorMessage = error.message || 'An unexpected client-side error occurred.';
          setUploads(prev => prev.map(u => u === upload ? { ...u, status: 'error', error: errorMessage } : u));
          toast({ variant: 'destructive', title: `Upload Failed: ${upload.file.name}`, description: errorMessage });
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUrls = results.filter((url): url is string => url !== null);
      
      const allSuccessfulUrls = [...uploads.filter(u => u.status === 'success' && u.url).map(u => u.url!), ...successfulUrls];
      onUploadComplete(allSuccessfulUrls);
    };

    const { getRootProps, getInputProps, open } = useDropzone({
        onDrop: (acceptedFiles) => {
            const currentSuccessfulUploads = uploads.filter(u => u.status === 'success').length;
            const filesToUpload = acceptedFiles.slice(0, maxFiles - currentSuccessfulUploads);
            handleUpload(filesToUpload);
        },
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        noClick: true,
        noKeyboard: true,
    });
    
    const removeFile = (urlToRemove: string) => {
      setUploads(prev => prev.filter(u => u.url !== urlToRemove));
      onRemove(urlToRemove);
    };

    return (
      <div className="space-y-4">
        <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary")}>
            <input {...getInputProps()} />
            <Button type="button" onClick={open}>
                <ImagePlus className="mr-2" /> Select Images
            </Button>
            <p className="text-xs text-muted-foreground mt-2">or drag and drop here</p>
        </div>
        
        {uploads.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {uploads.map((upload, index) => (
                    <div key={index} className="relative group aspect-square border rounded-lg overflow-hidden">
                         <Image src={upload.url || URL.createObjectURL(upload.file)} alt={upload.file.name} fill className="object-cover" />
                        
                         {upload.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
                                <Loader2 className="animate-spin" />
                                <p className="text-xs mt-2">Uploading...</p>
                            </div>
                        )}
                        {upload.status === 'success' && (
                             <div className="absolute inset-0 bg-green-500/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <CheckCircle />
                            </div>
                        )}
                         {upload.status === 'error' && (
                             <div className="absolute inset-0 bg-destructive/70 flex flex-col items-center justify-center text-white text-center p-2">
                                <AlertCircle />
                                <p className="text-xs mt-2 truncate">{upload.error}</p>
                            </div>
                        )}

                         <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 z-10" onClick={() => removeFile(upload.url!)}><X className="h-4 w-4" /></Button>
                    </div>
                ))}
            </div>
        )}
      </div>
    );
}

// Event Wizard Component
const EventCreationWizard = () => {
    const [step, setStep] = useState(1);
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingDraft, setIsLoadingDraft] = useState(true);
    const submitted = useRef(false);

    const totalSteps = 4;
    const form = useForm<z.infer<typeof createEventSchema>>({ 
        resolver: zodResolver(createEventSchema), 
        mode: 'onBlur', 
        defaultValues: { 
            tickets: [{ name: 'Regular', price: 1000, quantity: 100, description: '' }], 
            imageUrl: '', 
            gallery: [], 
            sponsors: [], 
            acceptTerms: false, 
            acceptRefundPolicy: false,
            freeMerch: undefined,
        }
    });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'tickets' });
    const selectedCategory = form.watch('category');
    
    const stepFields: { [key: number]: (keyof z.infer<typeof createEventSchema>)[] } = {
      1: ['name', 'description', 'date', 'startTime', 'county', 'venue', 'category', 'ageCategory'],
      2: ['imageUrl'],
      3: ['tickets'],
      4: ['acceptTerms', 'acceptRefundPolicy']
    };

    const isStepValid = useMemo(() => {
        const currentFields = stepFields[step];
        if (!currentFields) return false;

        const { formState: { errors } } = form;
        const values = form.getValues();

        for (const field of currentFields) {
            if (errors[field as keyof typeof errors]) return false;
            
            const value = values[field as keyof typeof values];
            if (Array.isArray(value)) {
                if (value.length === 0) return false;
                if (field === 'tickets' && value.some(t => !t.name || t.price < 0 || t.quantity <= 0)) return false;
            } else if (typeof value === 'boolean') {
                if (!value) return false;
            } else if (!value) {
                return false;
            }
        }
        return true;
    }, [form, step, stepFields, form.watch()]); // Added form.watch() to re-evaluate on every form change


    useEffect(() => {
        const eventId = searchParams.get('id');
        const type = searchParams.get('type');
        if (eventId && type === 'event') {
            setIsLoadingDraft(true);
            getListingById('event', eventId).then(result => {
                if (result.success && result.data) {
                    const data = result.data as any;
                    // Ensure gallery is an array
                    data.gallery = Array.isArray(data.gallery) ? data.gallery : [];
                    form.reset(data);
                }
                setIsLoadingDraft(false);
            });
        } else {
            setIsLoadingDraft(false);
        }
    }, [searchParams, form]);

    const handleFileUpload = useCallback((urls: string[]) => {
      form.setValue('imageUrl', urls[0] || '', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }, [form]);
    
    const handleGalleryUpload = useCallback((urls: string[]) => {
        form.setValue('gallery', urls, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }, [form]);

    const removeGalleryImage = (url: string) => {
        const currentGallery = form.getValues('gallery') || [];
        form.setValue('gallery', currentGallery.filter(u => u !== url), { shouldValidate: true, shouldDirty: true });
    };

    const handleSave = useCallback(async (status: 'draft' | 'submitted for review') => {
        if (!user) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
            return;
        }
        
        status === 'submitted for review' ? setIsSubmitting(true) : setIsSaving(true);
        
        if (status === 'submitted for review') {
            submitted.current = true;
        }

        const result = await saveEvent({ ...form.getValues(), organizerId: user.uid }, status);
        
        if (result.success && result.id) {
            form.setValue('id', result.id);
            toast({ title: `Event ${status === 'draft' ? 'Draft Saved' : 'Submitted'}!`, description: status === 'draft' ? "Your progress has been saved." : "Your event is submitted for review." });
            if (status === 'submitted for review') {
                router.push('/organizer/listings');
            }
        } else {
            toast({ variant: "destructive", title: "Save Failed", description: result.error });
            submitted.current = false;
        }
        status === 'submitted for review' ? setIsSubmitting(false) : setIsSaving(false);
    }, [form, user, toast, router]);

    
    if (isLoadingDraft) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4 text-muted-foreground">Loading draft...</p></div>;

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>{form.getValues('id') ? 'Edit Event' : 'Create New Event'}</CardTitle>
                <CardDescription>Follow the steps to publish your event.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form className="space-y-8">
                        <div className="space-y-8">
                          {/* Step 1 */}
                          {step === 1 && <Card><StepValidationTracker form={form as AnyForm} fields={stepFields[1]} title="Step 1: Event Details" /><CardContent className="space-y-6 pt-6">
                              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Event Name</FormLabel> <FormControl> <Input placeholder="e.g., NaksYetu Fest" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Textarea placeholder="Tell attendees all about your event..." rows={5} {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                              <div className="grid md:grid-cols-2 gap-6">
                                  <FormField control={form.control} name="date" render={({ field }) => ( <FormItem> <FormLabel>Start Date</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                  <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem> <FormLabel>Start Time</FormLabel> <FormControl><Input type="time" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                  <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem> <FormLabel>End Date (Optional)</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                  <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem> <FormLabel>End Time (Optional)</FormLabel> <FormControl><Input type="time" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                              </div>
                              <div className="grid md:grid-cols-2 gap-6">
                                  <FormField control={form.control} name="county" render={({ field }) => ( <FormItem> <FormLabel>County</FormLabel> <FormControl><Input placeholder="e.g., Nakuru" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                  <FormField control={form.control} name="venue" render={({ field }) => ( <FormItem> <FormLabel>Venue Name</FormLabel> <FormControl><Input placeholder="e.g., KICC" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                              </div>
                               <div className="grid md:grid-cols-2 gap-6">
                                  <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel>Event Category</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl> <SelectContent> {eventCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                                  <FormField control={form.control} name="ageCategory" render={({ field }) => ( <FormItem> <FormLabel>Age Category</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select an age group" /></SelectTrigger></FormControl> <SelectContent> {ageCategories.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                              </div>
                               {selectedCategory === 'Sports & Fitness' && (
                                <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                                    <h4 className="font-semibold">Football Match Details (Optional)</h4>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="homeTeam" render={({ field }) => ( <FormItem> <FormLabel>Home Team</FormLabel> <FormControl><Input placeholder="e.g., Gor Mahia" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                        <FormField control={form.control} name="awayTeam" render={({ field }) => ( <FormItem> <FormLabel>Away Team</FormLabel> <FormControl><Input placeholder="e.g., AFC Leopards" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                    </div>
                                    <FormField control={form.control} name="league" render={({ field }) => ( <FormItem> <FormLabel>League / Tournament</FormLabel> <FormControl><Input placeholder="e.g., FKF Premier League" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                </div>
                              )}
                              <FormField control={form.control} name="whatsappGroupLink" render={({ field }) => ( <FormItem> <FormLabel>WhatsApp Group Link (Optional)</FormLabel> <FormControl> <Input placeholder="https://chat.whatsapp.com/..." {...field} /> </FormControl> <FormDescription>Attendees will see this link after purchasing a ticket.</FormDescription> <FormMessage /> </FormItem> )}/>
                          </CardContent></Card>}
                          
                          {/* Step 2 */}
                          {step === 2 && <Card><StepValidationTracker form={form as AnyForm} fields={stepFields[2]} title="Step 2: Media & Branding" /><CardContent className="space-y-6 pt-6">
                              <FormField control={form.control} name="imageUrl" render={() => ( <FormItem> <FormLabel>Event Banner (16:9 ratio recommended)</FormLabel> <ImageUpload onUploadComplete={handleFileUpload} maxFiles={1} formFieldName="imageUrl" initialUrls={form.getValues('imageUrl') ? [form.getValues('imageUrl')] : []} onRemove={() => form.setValue('imageUrl', '')} /> <FormMessage /> </FormItem> )}/>
                               <FormField control={form.control} name="gallery" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Event Gallery (Optional, max 6)</FormLabel>
                                        <ImageUpload onUploadComplete={handleGalleryUpload} maxFiles={6} formFieldName="gallery" initialUrls={field.value} onRemove={removeGalleryImage} />
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                          </CardContent></Card>}

                          {/* Step 3 */}
                          {step === 3 && <Card><StepValidationTracker form={form as AnyForm} fields={stepFields[3]} title="Step 3: Ticketing" /><CardContent className="space-y-4 pt-6">
                              {fields.map((field, index) => (
                                <Collapsible key={field.id} asChild>
                                  <Card className="p-4 relative bg-muted/30">
                                      <div className="flex items-center justify-between">
                                        <div className="grid md:grid-cols-2 gap-4 flex-grow">
                                            <FormField control={form.control} name={`tickets.${index}.name`} render={({ field }) => ( <FormItem> <FormLabel>Ticket Name</FormLabel> <FormControl><Input placeholder="e.g., VIP" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name={`tickets.${index}.price`} render={({ field }) => ( <FormItem> <FormLabel>Price (Ksh)</FormLabel> <FormControl><Input type="number" placeholder="1500" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                                <FormField control={form.control} name={`tickets.${index}.quantity`} render={({ field }) => ( <FormItem> <FormLabel>Quantity</FormLabel> <FormControl><Input type="number" placeholder="100" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                            </div>
                                        </div>
                                         <div className="flex items-center ml-2">
                                            {fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}> <Trash2 className="h-4 w-4 text-destructive" /> </Button>}
                                         </div>
                                      </div>
                                      <CollapsibleTrigger asChild>
                                        <Button variant="link" size="sm" className="mt-2 p-0 h-auto">Advanced Options <ChevronsUpDown className="ml-2 h-4 w-4" /></Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="mt-4 space-y-4">
                                         <FormField control={form.control} name={`tickets.${index}.description`} render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea placeholder="e.g., Includes a free drink and front-row access" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                         <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name={`tickets.${index}.salesStart`} render={({ field }) => ( <FormItem> <FormLabel>Sales Start (Optional)</FormLabel> <FormControl><Input type="datetime-local" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                            <FormField control={form.control} name={`tickets.${index}.salesEnd`} render={({ field }) => ( <FormItem> <FormLabel>Sales End (Optional)</FormLabel> <FormControl><Input type="datetime-local" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                        </div>
                                         <div className="grid grid-cols-2 gap-4">
                                             <FormField control={form.control} name={`tickets.${index}.discountQuantity`} render={({ field }) => ( <FormItem> <FormLabel>Discount Quantity</FormLabel> <FormControl><Input type="number" placeholder="e.g., 5" {...field} /></FormControl><FormDescription>Buy this many tickets...</FormDescription> <FormMessage /> </FormItem> )}/>
                                             <FormField control={form.control} name={`tickets.${index}.discountPercentage`} render={({ field }) => ( <FormItem> <FormLabel>Discount (%)</FormLabel> <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl><FormDescription>...to get this percent off.</FormDescription> <FormMessage /> </FormItem> )}/>
                                         </div>
                                      </CollapsibleContent>
                                  </Card>
                                </Collapsible>
                              ))}
                              <Button type="button" variant="outline" onClick={() => append({ name: '', price: 0, quantity: 1, description: '' })}> <PlusCircle className="mr-2"/> Add Ticket Type </Button>
                          </CardContent></Card>}

                          {/* Step 4 */}
                          {step === 4 && <Card><StepValidationTracker form={form as AnyForm} fields={stepFields[4]} title="Step 4: Review & Submit" /><CardContent className="space-y-6 pt-6">
                              <FormField control={form.control} name="acceptTerms" render={({ field }) => ( <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><div className="space-y-1 leading-none"><FormLabel>I accept the Mov33 Terms of Service for Organizers.</FormLabel><FormMessage /></div></FormItem> )}/>
                              <FormField control={form.control} name="acceptRefundPolicy" render={({ field }) => ( <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><div className="space-y-1 leading-none"><FormLabel>I agree to the Mov33 Refund Policy.</FormLabel><FormMessage /></div></FormItem> )}/>
                          </CardContent></Card>}
                        </div>

                        {/* Navigation */}
                        <div className="flex justify-between items-center pt-4">
                            <div>{step > 1 && <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} disabled={isSaving || isSubmitting}><ArrowLeft className="mr-2"/> Back</Button>}</div>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="secondary" onClick={() => handleSave('draft')} disabled={isSaving || isSubmitting}>{isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}Save Draft</Button>
                                {step < totalSteps && <Button type="button" onClick={() => setStep(s => s + 1)} disabled={!isStepValid}>Next <ArrowRight className="ml-2"/></Button>}
                                {step === totalSteps && <Button type="button" onClick={() => handleSave('submitted for review')} disabled={isSaving || isSubmitting || !isStepValid}>{isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <CheckCircle className="mr-2"/>}Submit for Review</Button>}
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
// Tour Wizard Component
const TourCreationWizard = () => {
    const [step, setStep] = useState(1);
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingDraft, setIsLoadingDraft] = useState(true);

    const totalSteps = 4;

    const form = useForm<z.infer<typeof tourSchema>>({
        resolver: zodResolver(tourSchema),
        mode: 'onBlur',
        defaultValues: {
            name: '',
            description: '',
            destination: '',
            startingPoint: '',
            endPoint: '',
            availability: 'Weekends',
            itinerary: [{ value: '' }, { value: '' }],
            inclusions: [{ value: '' }],
            exclusions: [{ value: '' }],
            imageUrl: '',
            price: 5000,
            bookingFee: 1000,
            acceptTerms: false,
        },
    });

    const { fields: itineraryFields, append: appendItinerary, remove: removeItinerary } = useFieldArray({ control: form.control, name: "itinerary" });
    const { fields: inclusionFields, append: appendInclusion, remove: removeInclusion } = useFieldArray({ control: form.control, name: "inclusions" });
    const { fields: exclusionFields, append: appendExclusion, remove: removeExclusion } = useFieldArray({ control: form.control, name: "exclusions" });

    useEffect(() => {
        const tourId = searchParams.get('id');
        const type = searchParams.get('type');
        if (tourId && type === 'tour') {
            setIsLoadingDraft(true);
            getListingById('tour', tourId).then(result => {
                if (result.success && result.data) form.reset(result.data as any);
                setIsLoadingDraft(false);
            });
        } else {
            setIsLoadingDraft(false);
        }
    }, [searchParams, form]);
    
    const handleFileUpload = useCallback((urls: string[]) => {
      form.setValue('imageUrl', urls[0] || '', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }, [form]);


    async function handleSave(status: 'draft' | 'submitted for review') {
        if (!user) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
            return;
        }
        
        status === 'submitted for review' ? setIsSubmitting(true) : setIsSaving(true);
        const result = await saveTour({ ...form.getValues(), organizerId: user.uid }, status);
        
        if (result.success && result.id) {
            form.setValue('id', result.id);
            toast({ title: `Tour ${status === 'draft' ? 'Draft Saved' : 'Submitted'}!`, description: status === 'draft' ? "Your progress has been saved." : "Your tour is submitted for review." });
            if (status === 'submitted for review') {
                router.push('/organizer/listings');
            }
        } else {
            toast({ variant: "destructive", title: "Save Failed", description: result.error });
        }
        status === 'submitted for review' ? setIsSubmitting(false) : setIsSaving(false);
    }
    
    if (isLoadingDraft) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4 text-muted-foreground">Loading draft...</p></div>;
    
    // Abstracted function for dynamic fields
    const renderDynamicFieldArray = (
        title: string,
        fields: any[], 
        removeFn: (index: number) => void, 
        appendFn: () => void,
        name: "itinerary" | "inclusions" | "exclusions",
        placeholder: string
    ) => (
        <div className="space-y-4">
            <FormLabel>{title}</FormLabel>
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                    <FormField
                        control={form.control}
                        name={`${name}.${index}.value` as const}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormControl>
                                    <Input placeholder={placeholder} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFn(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={appendFn}>
                <PlusCircle className="mr-2" /> Add Item
            </Button>
        </div>
    );


    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>{form.getValues('id') ? 'Edit Tour' : 'Create New Tour'}</CardTitle>
                <CardDescription>Follow the steps to get your tour listed.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form className="space-y-8">
                        {step === 1 && (
                            <Card>
                                <StepValidationTracker form={form as AnyForm} fields={['name', 'description', 'destination', 'startDate', 'endDate', 'startingPoint', 'endPoint', 'availability']} title="Step 1: Tour Details" />
                                <CardContent className="space-y-6 pt-6">
                                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Tour Name</FormLabel> <FormControl> <Input placeholder="e.g., Lake Nakuru Safari" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Textarea placeholder="Describe the tour experience..." rows={5} {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                     <div className="grid md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem> <FormLabel>Start Date</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                        <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem> <FormLabel>End Date</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="destination" render={({ field }) => ( <FormItem> <FormLabel>Main Destination</FormLabel> <FormControl> <Input placeholder="e.g., Lake Nakuru" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                        <FormField control={form.control} name="availability" render={({ field }) => ( <FormItem> <FormLabel>Availability</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select availability" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="Daily">Daily</SelectItem> <SelectItem value="Weekends">Weekends</SelectItem> <SelectItem value="Custom">Custom Dates</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="startingPoint" render={({ field }) => ( <FormItem> <FormLabel>Starting Point</FormLabel> <FormControl> <Input placeholder="e.g., Nakuru Town CBD" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                        <FormField control={form.control} name="endPoint" render={({ field }) => ( <FormItem> <FormLabel>End Point</FormLabel> <FormControl> <Input placeholder="e.g., Nakuru Town CBD" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                    </div>
                                    <FormField control={form.control} name="whatsappGroupLink" render={({ field }) => ( <FormItem> <FormLabel>WhatsApp Group Link (Optional)</FormLabel> <FormControl> <Input placeholder="https://chat.whatsapp.com/..." {...field} /> </FormControl> <FormDescription>Attendees will see this link after purchasing a ticket.</FormDescription> <FormMessage /> </FormItem> )}/>
                                </CardContent>
                            </Card>
                        )}
                        {step === 2 && (
                             <Card>
                                <StepValidationTracker form={form as AnyForm} fields={['imageUrl', 'price']} title="Step 2: Media & Pricing" />
                                <CardContent className="space-y-6 pt-6">
                                    <FormField control={form.control} name="imageUrl" render={() => ( <FormItem> <FormLabel>Tour Banner (16:9 ratio)</FormLabel> <ImageUpload onUploadComplete={handleFileUpload} maxFiles={1} formFieldName="imageUrl" initialUrls={form.getValues('imageUrl') ? [form.getValues('imageUrl')] : []} onRemove={() => form.setValue('imageUrl', '')} /> <FormMessage /> </FormItem> )}/>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Full Price (Ksh)</FormLabel> <FormControl><Input type="number" placeholder="7500" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                        <FormField control={form.control} name="bookingFee" render={({ field }) => ( <FormItem> <FormLabel>Booking Fee (Ksh, Optional)</FormLabel> <FormControl><Input type="number" placeholder="2000" {...field} /></FormControl> <FormDescription>Allows customers to reserve a spot.</FormDescription><FormMessage /> </FormItem> )}/>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                         {step === 3 && (
                            <Card>
                                <StepValidationTracker form={form as AnyForm} fields={['itinerary', 'inclusions', 'exclusions']} title="Step 3: What to Expect" />
                                <CardContent className="space-y-6 pt-6">
                                   {renderDynamicFieldArray("Itinerary", itineraryFields, removeItinerary, () => appendItinerary({ value: '' }), "itinerary", "e.g., 8:00 AM: Depart from Nakuru")}
                                   {renderDynamicFieldArray("Inclusions", inclusionFields, removeInclusion, () => appendInclusion({ value: '' }), "inclusions", "e.g., Park Fees")}
                                   {renderDynamicFieldArray("Exclusions", exclusionFields, removeExclusion, () => appendExclusion({ value: '' }), "exclusions", "e.g., Gratuities")}
                                </CardContent>
                            </Card>
                        )}
                         {step === 4 && (
                            <Card>
                                <StepValidationTracker form={form as AnyForm} fields={['acceptTerms']} title="Step 4: Review & Submit" />
                                <CardContent className="space-y-6 pt-6">
                                    <FormField control={form.control} name="acceptTerms" render={({ field }) => ( <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><div className="space-y-1 leading-none"><FormLabel>I accept the NaksYetu Terms of Service for Organizers.</FormLabel><FormMessage /></div></FormItem> )}/>
                                </CardContent>
                            </Card>
                        )}

                        <div className="flex justify-between items-center pt-4">
                            <div>{step > 1 && <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} disabled={isSaving || isSubmitting}><ArrowLeft className="mr-2"/> Back</Button>}</div>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="secondary" onClick={() => handleSave('draft')} disabled={isSaving || isSubmitting}>{isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}Save Draft</Button>
                                {step < totalSteps && <Button type="button" onClick={() => setStep(s => s + 1)}>Next <ArrowRight className="ml-2"/></Button>}
                                {step === totalSteps && <Button type="button" onClick={() => handleSave('submitted for review')} disabled={isSaving || isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <CheckCircle className="mr-2"/>}Submit for Review</Button>}
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}


// Main Page Component
function CreateListingPageInternal() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Tabs defaultValue="event" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto mb-8">
                    <TabsTrigger value="event"><PartyPopper className="mr-2"/>Create Event</TabsTrigger>
                    <TabsTrigger value="tour"><Route className="mr-2"/>Create Tour</TabsTrigger>
                </TabsList>
                <TabsContent value="event">
                    <EventCreationWizard />
                </TabsContent>
                <TabsContent value="tour">
                    <TourCreationWizard />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Suspense Wrapper
export default function CreateListingPage() {
    return (
        <React.Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CreateListingPageInternal />
        </React.Suspense>
    )
}

