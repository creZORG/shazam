
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
                if (field === 'tickets' && value.some(t => !t.name || t.price &lt; 0 || t.quantity &lt;= 0)) return false;
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

    
    if (isLoadingDraft) return &lt;div className="flex items-center justify-center p-12"&gt;&lt;Loader2 className="h-8 w-8 animate-spin" /&gt;&lt;p className="ml-4 text-muted-foreground"&gt;Loading draft...&lt;/p&gt;&lt;/div&gt;;

    return (
        &lt;Card className="max-w-4xl mx-auto"&gt;
            &lt;CardHeader&gt;
                &lt;CardTitle&gt;{form.getValues('id') ? 'Edit Event' : 'Create New Event'}&lt;/CardTitle&gt;
                &lt;CardDescription&gt;Follow the steps to publish your event.&lt;/CardDescription&gt;
            &lt;/CardHeader&gt;
            &lt;CardContent&gt;
                &lt;Form {...form}&gt;
                    &lt;form className="space-y-8"&gt;
                        &lt;div className="space-y-8"&gt;
                          {/* Step 1 */}
                          {step === 1 && &lt;Card&gt;&lt;StepValidationTracker form={form as AnyForm} fields={stepFields[1]} title="Step 1: Event Details" /&gt;&lt;CardContent className="space-y-6 pt-6"&gt;
                              &lt;FormField control={form.control} name="name" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Event Name&lt;/FormLabel&gt; &lt;FormControl&gt; &lt;Input placeholder="e.g., Mov33 Fest" {...field} /&gt; &lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                              &lt;FormField control={form.control} name="description" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Description&lt;/FormLabel&gt; &lt;FormControl&gt; &lt;Textarea placeholder="Tell attendees all about your event..." rows={5} {...field} /&gt; &lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                              &lt;div className="grid md:grid-cols-2 gap-6"&gt;
                                  &lt;FormField control={form.control} name="date" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Start Date&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="date" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                  &lt;FormField control={form.control} name="startTime" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Start Time&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="time" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                  &lt;FormField control={form.control} name="endDate" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;End Date (Optional)&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="date" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                  &lt;FormField control={form.control} name="endTime" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;End Time (Optional)&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="time" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                              &lt;/div&gt;
                              &lt;div className="grid md:grid-cols-2 gap-6"&gt;
                                  &lt;FormField control={form.control} name="county" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;County&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input placeholder="e.g., Nairobi, Mombasa" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                  &lt;FormField control={form.control} name="venue" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Venue Name&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input placeholder="e.g., KICC" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                              &lt;/div&gt;
                               &lt;div className="grid md:grid-cols-2 gap-6"&gt;
                                  &lt;FormField control={form.control} name="category" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Event Category&lt;/FormLabel&gt; &lt;Select onValueChange={field.onChange} defaultValue={field.value}&gt; &lt;FormControl&gt;&lt;SelectTrigger&gt;&lt;SelectValue placeholder="Select a category" /&gt;&lt;/SelectTrigger&gt;&lt;/FormControl&gt; &lt;SelectContent&gt; {eventCategories.map(c =&gt; &lt;SelectItem key={c} value={c}&gt;{c}&lt;/SelectItem&gt;)} &lt;/SelectContent&gt; &lt;/Select&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                  &lt;FormField control={form.control} name="ageCategory" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Age Category&lt;/FormLabel&gt; &lt;Select onValueChange={field.onChange} defaultValue={field.value}&gt; &lt;FormControl&gt;&lt;SelectTrigger&gt;&lt;SelectValue placeholder="Select an age group" /&gt;&lt;/SelectTrigger&gt;&lt;/FormControl&gt; &lt;SelectContent&gt; {ageCategories.map(a =&gt; &lt;SelectItem key={a} value={a}&gt;{a}&lt;/SelectItem&gt;)} &lt;/SelectContent&gt; &lt;/Select&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                              &lt;/div&gt;
                               {selectedCategory === 'Sports &amp; Fitness' && (
                                &lt;div className="p-4 border rounded-md space-y-4 bg-muted/50"&gt;
                                    &lt;h4 className="font-semibold"&gt;Football Match Details (Optional)&lt;/h4&gt;
                                    &lt;div className="grid md:grid-cols-2 gap-6"&gt;
                                        &lt;FormField control={form.control} name="homeTeam" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Home Team&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input placeholder="e.g., Gor Mahia" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                        &lt;FormField control={form.control} name="awayTeam" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Away Team&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input placeholder="e.g., AFC Leopards" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                    &lt;/div&gt;
                                    &lt;FormField control={form.control} name="league" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;League / Tournament&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input placeholder="e.g., FKF Premier League" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                &lt;/div&gt;
                              )}
                              &lt;FormField control={form.control} name="whatsappGroupLink" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;WhatsApp Group Link (Optional)&lt;/FormLabel&gt; &lt;FormControl&gt; &lt;Input placeholder="https://chat.whatsapp.com/..." {...field} /&gt; &lt;/FormControl&gt; &lt;FormDescription&gt;Attendees will see this link after purchasing a ticket.&lt;/FormDescription&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                          &lt;/CardContent&gt;&lt;/Card&gt;}
                          
                          {/* Step 2 */}
                          {step === 2 && &lt;Card&gt;&lt;StepValidationTracker form={form as AnyForm} fields={stepFields[2]} title="Step 2: Media &amp; Branding" /&gt;&lt;CardContent className="space-y-6 pt-6"&gt;
                              &lt;FormField control={form.control} name="imageUrl" render={() =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Event Banner (16:9 ratio recommended)&lt;/FormLabel&gt; &lt;ImageUpload onUploadComplete={handleFileUpload} maxFiles={1} formFieldName="imageUrl" initialUrls={form.getValues('imageUrl') ? [form.getValues('imageUrl')] : []} onRemove={() =&gt; form.setValue('imageUrl', '')} /&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                               &lt;FormField control={form.control} name="gallery" render={({ field }) =&gt; (
                                    &lt;FormItem&gt;
                                        &lt;FormLabel&gt;Event Gallery (Optional, max 6)&lt;/FormLabel&gt;
                                        &lt;ImageUpload onUploadComplete={handleGalleryUpload} maxFiles={6} formFieldName="gallery" initialUrls={field.value} onRemove={removeGalleryImage} /&gt;
                                        &lt;FormMessage /&gt;
                                    &lt;/FormItem&gt;
                                )}/&gt;
                          &lt;/CardContent&gt;&lt;/Card&gt;}

                          {/* Step 3 */}
                          {step === 3 && &lt;Card&gt;&lt;StepValidationTracker form={form as AnyForm} fields={stepFields[3]} title="Step 3: Ticketing" /&gt;&lt;CardContent className="space-y-4 pt-6"&gt;
                              {fields.map((field, index) =&gt; (
                                &lt;Collapsible key={field.id} asChild&gt;
                                  &lt;Card className="p-4 relative bg-muted/30"&gt;
                                      &lt;div className="flex items-center justify-between"&gt;
                                        &lt;div className="grid md:grid-cols-2 gap-4 flex-grow"&gt;
                                            &lt;FormField control={form.control} name={`tickets.${index}.name`} render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Ticket Name&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input placeholder="e.g., VIP" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                            &lt;div className="grid grid-cols-2 gap-4"&gt;
                                                &lt;FormField control={form.control} name={`tickets.${index}.price`} render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Price (Ksh)&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="number" placeholder="1500" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                                &lt;FormField control={form.control} name={`tickets.${index}.quantity`} render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Quantity&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="number" placeholder="100" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                            &lt;/div&gt;
                                        &lt;/div&gt;
                                         &lt;div className="flex items-center ml-2"&gt;
                                            {fields.length &gt; 1 && &lt;Button type="button" variant="ghost" size="icon" onClick={() =&gt; remove(index)}&gt; &lt;Trash2 className="h-4 w-4 text-destructive" /&gt; &lt;/Button&gt;}
                                         &lt;/div&gt;
                                      &lt;/div&gt;
                                      &lt;CollapsibleTrigger asChild&gt;
                                        &lt;Button variant="link" size="sm" className="mt-2 p-0 h-auto"&gt;Advanced Options &lt;ChevronsUpDown className="ml-2 h-4 w-4" /&gt;&lt;/Button&gt;
                                      &lt;/CollapsibleTrigger&gt;
                                      &lt;CollapsibleContent className="mt-4 space-y-4"&gt;
                                         &lt;FormField control={form.control} name={`tickets.${index}.description`} render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Description (Optional)&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Textarea placeholder="e.g., Includes a free drink and front-row access" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                         &lt;div className="grid grid-cols-2 gap-4"&gt;
                                            &lt;FormField control={form.control} name={`tickets.${index}.salesStart`} render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Sales Start (Optional)&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="datetime-local" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                            &lt;FormField control={form.control} name={`tickets.${index}.salesEnd`} render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Sales End (Optional)&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="datetime-local" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                        &lt;/div&gt;
                                         &lt;div className="grid grid-cols-2 gap-4"&gt;
                                             &lt;FormField control={form.control} name={`tickets.${index}.discountQuantity`} render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Discount Quantity&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="number" placeholder="e.g., 5" {...field} /&gt;&lt;/FormControl&gt;&lt;FormDescription&gt;Buy this many tickets...&lt;/FormDescription&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                             &lt;FormField control={form.control} name={`tickets.${index}.discountPercentage`} render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Discount (%)&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="number" placeholder="e.g., 10" {...field} /&gt;&lt;/FormControl&gt;&lt;FormDescription&gt;...to get this percent off.&lt;/FormDescription&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                         &lt;/div&gt;
                                      &lt;/CollapsibleContent&gt;
                                  &lt;/Card&gt;
                                &lt;/Collapsible&gt;
                              ))}
                              &lt;Button type="button" variant="outline" onClick={() =&gt; append({ name: '', price: 0, quantity: 1, description: '' })}&gt; &lt;PlusCircle className="mr-2"/&gt; Add Ticket Type &lt;/Button&gt;
                          &lt;/CardContent&gt;&lt;/Card&gt;}

                          {/* Step 4 */}
                          {step === 4 && &lt;Card&gt;&lt;StepValidationTracker form={form as AnyForm} fields={stepFields[4]} title="Step 4: Review &amp; Submit" /&gt;&lt;CardContent className="space-y-6 pt-6"&gt;
                              &lt;FormField control={form.control} name="acceptTerms" render={({ field }) =&gt; ( &lt;FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4"&gt;&lt;FormControl&gt;&lt;Checkbox checked={field.value} onCheckedChange={field.onChange}/&gt;&lt;/FormControl&gt;&lt;div className="space-y-1 leading-none"&gt;&lt;FormLabel&gt;I accept the Mov33 Terms of Service for Organizers.&lt;/FormLabel&gt;&lt;FormMessage /&gt;&lt;/div&gt;&lt;/FormItem&gt; )}/&gt;
                              &lt;FormField control={form.control} name="acceptRefundPolicy" render={({ field }) =&gt; ( &lt;FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4"&gt;&lt;FormControl&gt;&lt;Checkbox checked={field.value} onCheckedChange={field.onChange}/&gt;&lt;/FormControl&gt;&lt;div className="space-y-1 leading-none"&gt;&lt;FormLabel&gt;I agree to the Mov33 Refund Policy.&lt;/FormLabel&gt;&lt;FormMessage /&gt;&lt;/div&gt;&lt;/FormItem&gt; )}/&gt;
                          &lt;/CardContent&gt;&lt;/Card&gt;}
                        &lt;/div&gt;

                        {/* Navigation */}
                        &lt;div className="flex justify-between items-center pt-4"&gt;
                            &lt;div&gt;{step &gt; 1 && &lt;Button type="button" variant="outline" onClick={() =&gt; setStep(s =&gt; s - 1)} disabled={isSaving || isSubmitting}&gt;&lt;ArrowLeft className="mr-2"/&gt; Back&lt;/Button&gt;}&lt;/div&gt;
                            &lt;div className="flex items-center gap-2"&gt;
                                &lt;Button type="button" variant="secondary" onClick={() =&gt; handleSave('draft')} disabled={isSaving || isSubmitting}&gt;{isSaving ? &lt;Loader2 className="mr-2 animate-spin"/&gt; : &lt;Save className="mr-2"/&gt;}Save Draft&lt;/Button&gt;
                                {step &lt; totalSteps && &lt;Button type="button" onClick={() =&gt; setStep(s =&gt; s + 1)} disabled={!isStepValid}&gt;Next &lt;ArrowRight className="ml-2"/&gt;&lt;/Button&gt;}
                                {step === totalSteps && &lt;Button type="button" onClick={() =&gt; handleSave('submitted for review')} disabled={isSaving || isSubmitting || !isStepValid}&gt;{isSubmitting ? &lt;Loader2 className="mr-2 animate-spin"/&gt; : &lt;CheckCircle className="mr-2"/&gt;}Submit for Review&lt;/Button&gt;}
                            &lt;/div&gt;
                        &lt;/div&gt;
                    &lt;/form&gt;
                &lt;/Form&gt;
            &lt;/CardContent&gt;
        &lt;/Card&gt;
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
            getListingById('tour', tourId).then(result =&gt; {
                if (result.success && result.data) form.reset(result.data as any);
                setIsLoadingDraft(false);
            });
        } else {
            setIsLoadingDraft(false);
        }
    }, [searchParams, form]);
    
    const handleFileUpload = useCallback((urls: string[]) =&gt; {
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
    
    if (isLoadingDraft) return &lt;div className="flex items-center justify-center p-12"&gt;&lt;Loader2 className="h-8 w-8 animate-spin" /&gt;&lt;p className="ml-4 text-muted-foreground"&gt;Loading draft...&lt;/p&gt;&lt;/div&gt;;
    
    // Abstracted function for dynamic fields
    const renderDynamicFieldArray = (
        title: string,
        fields: any[], 
        removeFn: (index: number) =&gt; void, 
        appendFn: () =&gt; void,
        name: "itinerary" | "inclusions" | "exclusions",
        placeholder: string
    ) =&gt; (
        &lt;div className="space-y-4"&gt;
            &lt;FormLabel&gt;{title}&lt;/FormLabel&gt;
            {fields.map((field, index) =&gt; (
                &lt;div key={field.id} className="flex items-center gap-2"&gt;
                    &lt;FormField
                        control={form.control}
                        name={`${name}.${index}.value` as const}
                        render={({ field }) =&gt; (
                            &lt;FormItem className="flex-grow"&gt;
                                &lt;FormControl&gt;
                                    &lt;Input placeholder={placeholder} {...field} /&gt;
                                &lt;/FormControl&gt;
                                &lt;FormMessage /&gt;
                            &lt;/FormItem&gt;
                        )}
                    /&gt;
                    {fields.length &gt; 1 && (
                        &lt;Button type="button" variant="ghost" size="icon" onClick={() =&gt; removeFn(index)}&gt;
                            &lt;Trash2 className="h-4 w-4 text-destructive" /&gt;
                        &lt;/Button&gt;
                    )}
                &lt;/div&gt;
            ))}
            &lt;Button type="button" variant="outline" size="sm" onClick={appendFn}&gt;
                &lt;PlusCircle className="mr-2" /&gt; Add Item
            &lt;/Button&gt;
        &lt;/div&gt;
    );


    return (
        &lt;Card className="max-w-4xl mx-auto"&gt;
            &lt;CardHeader&gt;
                &lt;CardTitle&gt;{form.getValues('id') ? 'Edit Tour' : 'Create New Tour'}&lt;/CardTitle&gt;
                &lt;CardDescription&gt;Follow the steps to get your tour listed.&lt;/CardDescription&gt;
            &lt;/CardHeader&gt;
            &lt;CardContent&gt;
                &lt;Form {...form}&gt;
                    &lt;form className="space-y-8"&gt;
                        {step === 1 && (
                            &lt;Card&gt;
                                &lt;StepValidationTracker form={form as AnyForm} fields={['name', 'description', 'destination', 'startDate', 'endDate', 'startingPoint', 'endPoint', 'availability']} title="Step 1: Tour Details" /&gt;
                                &lt;CardContent className="space-y-6 pt-6"&gt;
                                    &lt;FormField control={form.control} name="name" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Tour Name&lt;/FormLabel&gt; &lt;FormControl&gt; &lt;Input placeholder="e.g., Lake Nakuru Safari" {...field} /&gt; &lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                    &lt;FormField control={form.control} name="description" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Description&lt;/FormLabel&gt; &lt;FormControl&gt; &lt;Textarea placeholder="Describe the tour experience..." rows={5} {...field} /&gt; &lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                     &lt;div className="grid md:grid-cols-2 gap-6"&gt;
                                        &lt;FormField control={form.control} name="startDate" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Start Date&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="date" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                        &lt;FormField control={form.control} name="endDate" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;End Date&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="date" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                    &lt;/div&gt;
                                    &lt;div className="grid md:grid-cols-2 gap-6"&gt;
                                        &lt;FormField control={form.control} name="destination" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Main Destination&lt;/FormLabel&gt; &lt;FormControl&gt; &lt;Input placeholder="e.g., Lake Nakuru" {...field} /&gt; &lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                        &lt;FormField control={form.control} name="availability" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Availability&lt;/FormLabel&gt; &lt;Select onValueChange={field.onChange} defaultValue={field.value}&gt; &lt;FormControl&gt;&lt;SelectTrigger&gt;&lt;SelectValue placeholder="Select availability" /&gt;&lt;/SelectTrigger&gt;&lt;/FormControl&gt; &lt;SelectContent&gt; &lt;SelectItem value="Daily"&gt;Daily&lt;/SelectItem&gt; &lt;SelectItem value="Weekends"&gt;Weekends&lt;/SelectItem&gt; &lt;SelectItem value="Custom"&gt;Custom Dates&lt;/SelectItem&gt; &lt;/SelectContent&gt; &lt;/Select&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                    &lt;/div&gt;
                                    &lt;div className="grid md:grid-cols-2 gap-6"&gt;
                                        &lt;FormField control={form.control} name="startingPoint" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Starting Point&lt;/FormLabel&gt; &lt;FormControl&gt; &lt;Input placeholder="e.g., Nakuru Town CBD" {...field} /&gt; &lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                        &lt;FormField control={form.control} name="endPoint" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;End Point&lt;/FormLabel&gt; &lt;FormControl&gt; &lt;Input placeholder="e.g., Nakuru Town CBD" {...field} /&gt; &lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                    &lt;/div&gt;
                                    &lt;FormField control={form.control} name="whatsappGroupLink" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;WhatsApp Group Link (Optional)&lt;/FormLabel&gt; &lt;FormControl&gt; &lt;Input placeholder="https://chat.whatsapp.com/..." {...field} /&gt; &lt;/FormControl&gt; &lt;FormDescription&gt;Attendees will see this link after purchasing a ticket.&lt;/FormDescription&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                &lt;/CardContent&gt;
                            &lt;/Card&gt;
                        )}
                        {step === 2 && (
                             &lt;Card&gt;
                                &lt;StepValidationTracker form={form as AnyForm} fields={['imageUrl', 'price']} title="Step 2: Media &amp; Pricing" /&gt;
                                &lt;CardContent className="space-y-6 pt-6"&gt;
                                    &lt;FormField control={form.control} name="imageUrl" render={() =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Tour Banner (16:9 ratio)&lt;/FormLabel&gt; &lt;ImageUpload onUploadComplete={handleFileUpload} maxFiles={1} formFieldName="imageUrl" initialUrls={form.getValues('imageUrl') ? [form.getValues('imageUrl')] : []} onRemove={() =&gt; form.setValue('imageUrl', '')} /&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                    &lt;div className="grid md:grid-cols-2 gap-6"&gt;
                                        &lt;FormField control={form.control} name="price" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Full Price (Ksh)&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="number" placeholder="7500" {...field} /&gt;&lt;/FormControl&gt; &lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                        &lt;FormField control={form.control} name="bookingFee" render={({ field }) =&gt; ( &lt;FormItem&gt; &lt;FormLabel&gt;Booking Fee (Ksh, Optional)&lt;/FormLabel&gt; &lt;FormControl&gt;&lt;Input type="number" placeholder="2000" {...field} /&gt;&lt;/FormControl&gt; &lt;FormDescription&gt;Allows customers to reserve a spot.&lt;/FormDescription&gt;&lt;FormMessage /&gt; &lt;/FormItem&gt; )}/&gt;
                                    &lt;/div&gt;
                                &lt;/CardContent&gt;
                            &lt;/Card&gt;
                        )}
                         {step === 3 && (
                            &lt;Card&gt;
                                &lt;StepValidationTracker form={form as AnyForm} fields={['itinerary', 'inclusions', 'exclusions']} title="Step 3: What to Expect" /&gt;
                                &lt;CardContent className="space-y-6 pt-6"&gt;
                                   {renderDynamicFieldArray("Itinerary", itineraryFields, removeItinerary, () =&gt; appendItinerary({ value: '' }), "itinerary", "e.g., 8:00 AM: Depart from Nakuru")}
                                   {renderDynamicFieldArray("Inclusions", inclusionFields, removeInclusion, () =&gt; appendInclusion({ value: '' }), "inclusions", "e.g., Park Fees")}
                                   {renderDynamicFieldArray("Exclusions", exclusionFields, removeExclusion, () =&gt; appendExclusion({ value: '' }), "exclusions", "e.g., Gratuities")}
                                &lt;/CardContent&gt;
                            &lt;/Card&gt;
                        )}
                         {step === 4 && (
                            &lt;Card&gt;
                                &lt;StepValidationTracker form={form as AnyForm} fields={['acceptTerms']} title="Step 4: Review &amp; Submit" /&gt;
                                &lt;CardContent className="space-y-6 pt-6"&gt;
                                    &lt;FormField control={form.control} name="acceptTerms" render={({ field }) =&gt; ( &lt;FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4"&gt;&lt;FormControl&gt;&lt;Checkbox checked={field.value} onCheckedChange={field.onChange}/&gt;&lt;/FormControl&gt;&lt;div className="space-y-1 leading-none"&gt;&lt;FormLabel&gt;I accept the Mov33 Terms of Service for Organizers.&lt;/FormLabel&gt;&lt;FormMessage /&gt;&lt;/div&gt;&lt;/FormItem&gt; )}/&gt;
                                &lt;/CardContent&gt;
                            &lt;/Card&gt;
                        )}

                        &lt;div className="flex justify-between items-center pt-4"&gt;
                            &lt;div&gt;{step &gt; 1 && &lt;Button type="button" variant="outline" onClick={() =&gt; setStep(s =&gt; s - 1)} disabled={isSaving || isSubmitting}&gt;&lt;ArrowLeft className="mr-2"/&gt; Back&lt;/Button&gt;}&lt;/div&gt;
                            &lt;div className="flex items-center gap-2"&gt;
                                &lt;Button type="button" variant="secondary" onClick={() =&gt; handleSave('draft')} disabled={isSaving || isSubmitting}&gt;{isSaving ? &lt;Loader2 className="mr-2 animate-spin"/&gt; : &lt;Save className="mr-2"/&gt;}Save Draft&lt;/Button&gt;
                                {step &lt; totalSteps && &lt;Button type="button" onClick={() =&gt; setStep(s =&gt; s + 1)}&gt;Next &lt;ArrowRight className="ml-2"/&gt;&lt;/Button&gt;}
                                {step === totalSteps && &lt;Button type="button" onClick={() =&gt; handleSave('submitted for review')} disabled={isSaving || isSubmitting}&gt;{isSubmitting ? &lt;Loader2 className="mr-2 animate-spin"/&gt; : &lt;CheckCircle className="mr-2"/&gt;}Submit for Review&lt;/Button&gt;}
                            &lt;/div&gt;
                        &lt;/div&gt;
                    &lt;/form&gt;
                &lt;/Form&gt;
            &lt;/CardContent&gt;
        &lt;/Card&gt;
    )
}


// Main Page Component
function CreateListingPageInternal() {
    return (
        &lt;div className="container mx-auto p-4 md:p-8"&gt;
            &lt;Tabs defaultValue="event" className="w-full"&gt;
                &lt;TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto mb-8"&gt;
                    &lt;TabsTrigger value="event"&gt;&lt;PartyPopper className="mr-2"/&gt;Create Event&lt;/TabsTrigger&gt;
                    &lt;TabsTrigger value="tour"&gt;&lt;Route className="mr-2"/&gt;Create Tour&lt;/TabsTrigger&gt;
                &lt;/TabsList&gt;
                &lt;TabsContent value="event"&gt;
                    &lt;EventCreationWizard /&gt;
                &lt;/TabsContent&gt;
                &lt;TabsContent value="tour"&gt;
                    &lt;TourCreationWizard /&gt;
                &lt;/TabsContent&gt;
            &lt;/Tabs&gt;
        &lt;/div&gt;
    );
}

// Suspense Wrapper
export default function CreateListingPage() {
    return (
        &lt;React.Suspense fallback=&lt;div className="flex h-64 items-center justify-center"&gt;&lt;Loader2 className="h-8 w-8 animate-spin" /&gt;&lt;/div&gt;&gt;
            &lt;CreateListingPageInternal /&gt;
        &lt;/React.Suspense&gt;
    )
}
