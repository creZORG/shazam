
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UploadCloud, X, ArrowLeft, ArrowRight, CircleCheck, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { uploadImage } from '@/app/organizer/events/create/cloudinary-actions';
import { createNightlifeEvent } from '../../actions';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

const nightlifeEventSchema = z.object({
  eventName: z.string().min(3, 'Event name must be at least 3 characters long.'),
  date: z.date({ required_error: 'A date is required.'}),
  description: z.string().min(10, 'A description of at least 10 characters is required.'),
  musicPolicy: z.string().min(3, 'Music policy must be at least 3 characters.'),
  specialAppearances: z.string().optional(),
  dressCode: z.string().min(3, 'Dress code must be at least 3 characters.'),
  imageUrl: z.string().url('An event flyer is required.'),
  imageHint: z.string().optional(),
  entranceFee: z.string().min(1, 'Entrance fee description is required.'),
});

export default function CreateNightlifeEventPage() {
    const [step, setStep] = useState(1);
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const totalSteps = 3;

    const form = useForm<z.infer<typeof nightlifeEventSchema>>({
        resolver: zodResolver(nightlifeEventSchema),
        mode: 'onBlur',
        defaultValues: {
            eventName: '',
            description: '',
            musicPolicy: '',
            specialAppearances: '',
            dressCode: 'Smart Casual',
            imageUrl: '',
            entranceFee: 'Ksh 500',
        },
    });

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await uploadImage(formData);

        if (result.success && result.url) {
            form.setValue('imageUrl', result.url, { shouldValidate: true, shouldDirty: true });
        } else {
            toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
        }
        setIsUploading(false);
    }, [form, toast]);


    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        maxSize: 6 * 1024 * 1024,
        maxFiles: 1,
    });
    
    const removeImage = () => {
        form.setValue('imageUrl', '', { shouldValidate: true });
    };

    const handleNext = async () => {
        let fieldsToValidate: (keyof z.infer<typeof nightlifeEventSchema>)[] = [];
        if (step === 1) fieldsToValidate = ['eventName', 'date', 'description'];
        if (step === 2) fieldsToValidate = ['imageUrl', 'musicPolicy', 'dressCode'];

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) setStep(s => s + 1);
        else toast({ variant: "destructive", title: "Incomplete Step", description: "Please fill out all required fields." });
    }

    const handleBack = () => setStep(s => s - 1);

    async function onSubmit(values: z.infer<typeof nightlifeEventSchema>) {
        setIsSubmitting(true);
        const eventData = {
            ...values,
            date: values.date.toISOString(),
            musicPolicy: values.musicPolicy.split(',').map(s => s.trim()),
            specialAppearances: values.specialAppearances?.split(',').map(s => s.trim()) || [],
        };

        const result = await createNightlifeEvent(eventData);

        if (result.success) {
            toast({ title: "Nightlife Event Submitted!", description: "Your event is now live." });
            router.push('/club');
        } else {
            toast({ variant: "destructive", title: "Something went wrong", description: result.error });
        }
        setIsSubmitting(false);
    }
    
    const imageUrl = form.watch('imageUrl');

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Post New Nightlife Event</CardTitle>
                    <CardDescription>
                        Follow the steps to get your nightlife event listed on NaksYetu.
                    </CardDescription>
                    <Progress value={(step / totalSteps) * 100} className="w-full mt-4" />
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    <div className={cn("space-y-8", step !== 1 && "hidden")}>
                        <Card>
                            <CardHeader><CardTitle>Step 1: Event Details</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                            <FormField control={form.control} name="eventName" render={({ field }) => ( <FormItem> <FormLabel>Event Name</FormLabel> <FormControl> <Input placeholder="e.g., Soulful Saturdays" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><Button type="button" variant={"outline"} className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl> <Textarea placeholder="Tell everyone what makes this night special..." rows={5} {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className={cn("space-y-8", step !== 2 && "hidden")}>
                        <Card>
                            <CardHeader><CardTitle>Step 2: Vibe & Media</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <FormField control={form.control} name="musicPolicy" render={({ field }) => ( <FormItem> <FormLabel>Music Policy</FormLabel> <FormControl> <Input placeholder="e.g., Afrobeats, Amapiano, Gengetone" {...field} /> </FormControl> <FormDescription>Separate genres with commas.</FormDescription> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="specialAppearances" render={({ field }) => ( <FormItem> <FormLabel>Special Appearances (Optional)</FormLabel> <FormControl> <Input placeholder="e.g., DJ Lyta, MC Gogo" {...field} /> </FormControl> <FormDescription>List any guest DJs, artists, or hosts. Separate with commas.</FormDescription> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="dressCode" render={({ field }) => ( <FormItem> <FormLabel>Dress Code</FormLabel> <FormControl> <Input placeholder="e.g., All Black, Smart Casual" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>

                                 <FormField control={form.control} name="imageUrl" render={() => (
                                    <FormItem>
                                        <FormLabel>Event Flyer</FormLabel>
                                        <FormControl>
                                        <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary">
                                            <input {...getInputProps()} />
                                            {isUploading ? <Loader2 className="animate-spin h-12 w-12 mx-auto" /> : <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />}
                                            <p>Drag 'n' drop a flyer here, or click to select a file</p>
                                        </div>
                                        </FormControl>
                                        {imageUrl && (
                                            <div className="relative mt-4 w-full aspect-[4/5] max-h-96">
                                                <Image src={imageUrl} alt="Flyer preview" layout="fill" objectFit="contain" className="rounded-md" />
                                                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={removeImage}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </CardContent>
                        </Card>
                    </div>

                     <div className={cn("space-y-8", step !== 3 && "hidden")}>
                         <Card>
                            <CardHeader>
                                <CardTitle>Step 3: Entry Details & Submit</CardTitle>
                                <CardDescription>Define how patrons will enter the event.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <FormField control={form.control} name="entranceFee" render={({ field }) => ( <FormItem> <FormLabel>Entry Requirement</FormLabel> <FormControl> <Input placeholder="e.g., Ksh 500, or 'Free Entry', or 'One Drink Minimum'" {...field} /> </FormControl><FormDescription>Clearly state what is required for entry.</FormDescription> <FormMessage /> </FormItem> )}/>
                            </CardContent>
                         </Card>
                     </div>

                    <div className="flex justify-between">
                        {step > 1 && <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2"/> Back</Button>}
                        {step < totalSteps && <Button type="button" onClick={handleNext}>Next <ArrowRight className="ml-2"/></Button>}
                        {step === totalSteps && <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <CircleCheck className="ml-2"/>} Post Nightlife Event</Button>}
                    </div>
                    </form>
                </Form>
                </CardContent>
            </Card>
        </div>
    )
}
