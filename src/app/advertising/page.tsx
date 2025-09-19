
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Star, Mail, LayoutPanelLeft, ArrowRight, UploadCloud, X, Loader2, BarChart2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useDropzone } from "react-dropzone";
import { useState, useTransition } from "react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { submitAdForReview } from "./actions";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const adOptions = [
    {
        title: "Homepage Feature",
        description: "Get prime placement for your event on our homepage for maximum visibility.",
        icon: Star
    },
    {
        title: "Sponsored Social Posts",
        description: "Leverage our social media reach with dedicated posts about your event or brand.",
        icon: Megaphone
    },
    {
        title: "Email Newsletter Inclusion",
        description: "Feature your event in our weekly newsletter to thousands of engaged users.",
        icon: Mail
    },
    {
        title: "Banner Ads",
        description: "Place banner ads on high-traffic pages like event listings and search results.",
        icon: LayoutPanelLeft
    }
];

const adSchema = z.object({
    campaignName: z.string().min(3, "Campaign name must be at least 3 characters."),
    imageUrls: z.array(z.string().url()).min(1, "At least one image is required.").max(3, "You can upload a maximum of 3 images."),
    ctaText: z.string().min(2, "CTA text is required.").max(25, "CTA text is too long."),
    ctaLink: z.string().refine(val => {
        const isUrl = z.string().url().safeParse(val).success;
        const isPhone = /^\+?[0-9]{10,15}$/.test(val);
        return isUrl || isPhone;
    }, { message: "Must be a valid URL or phone number." }),
    priority: z.number().min(1).max(5),
    duration: z.string().min(1, "Please select a duration."),
    isAdultContent: z.boolean().default(false),
});


export default function AdvertisingPage() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
    const { user, loading } = useAuth();

    const form = useForm<z.infer<typeof adSchema>>({
        resolver: zodResolver(adSchema),
        defaultValues: {
            campaignName: "",
            imageUrls: [],
            ctaText: "Learn More",
            ctaLink: "",
            priority: 3,
            duration: "1_week",
            isAdultContent: false,
        }
    });

    const onDrop = async (acceptedFiles: File[]) => {
      setIsUploading(true);
      const currentImages = form.getValues("imageUrls") || [];
      const filesToUpload = acceptedFiles.slice(0, 3 - currentImages.length);

      const uploadPromises = filesToUpload.map(file => {
          const formData = new FormData();
          formData.append('file', file);
          // Assuming you have an upload action
          return import('@/app/organizer/events/create/cloudinary-actions').then(actions => actions.uploadImage(formData));
      });

      try {
        const results = await Promise.all(uploadPromises);
        const successfulUrls = results.filter(r => r.success).map(r => r.url!);
        form.setValue("imageUrls", [...currentImages, ...successfulUrls], { shouldValidate: true });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Some images failed to upload.'});
      } finally {
        setIsUploading(false);
      }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        maxSize: 6 * 1024 * 1024,
    });
    
    const imageUrls = form.watch('imageUrls');

    const removeImage = (index: number) => {
        const currentImages = form.getValues("imageUrls") || [];
        form.setValue("imageUrls", currentImages.filter((_, i) => i !== index), { shouldValidate: true });
    };

    function onSubmit(values: z.infer<typeof adSchema>) {
        startTransition(async () => {
            const result = await submitAdForReview(values);
            if (result.success) {
                 toast({
                    title: "Ad Submitted!",
                    description: "Your advertisement campaign has been submitted for review. You can track its status in your Ad Dashboard.",
                });
                form.reset();
            } else {
                 toast({ variant: 'destructive', title: 'Submission Failed', description: result.error});
            }
        })
    }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Advertise on <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">NaksYetu</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Reach a targeted audience of event-goers in Nakuru. Our platform offers various advertising solutions to help you sell more tickets and grow your brand.
            </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {adOptions.map(option => (
                <Card key={option.title}>
                    <CardHeader className="flex-row items-center gap-4">
                        <option.icon className="h-8 w-8 text-primary" />
                        <CardTitle>{option.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>

        <Card className="max-w-4xl mx-auto mt-16">
            <CardHeader>
                <CardTitle>Create Your Ad Campaign</CardTitle>
                <CardDescription>Fill out the form below to post your ad. Our team will review it before it goes live.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="animate-spin" /> : !user ? (
                     <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Log In to Continue</AlertTitle>
                        <AlertDescription>
                        You must be logged in to submit an ad campaign.
                        <Link href="/login" className="block mt-2">
                            <Button>Login or Sign Up</Button>
                        </Link>
                        </AlertDescription>
                    </Alert>
                ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="campaignName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Campaign Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Summer Fest Promotion" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="imageUrls"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Ad Images (up to 3)</FormLabel>
                                    <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary", isDragActive && "border-primary")}>
                                        <input {...getInputProps()} />
                                        {isUploading ? <Loader2 className="mx-auto h-12 w-12 animate-spin" /> : <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />}
                                        <p>Drag 'n' drop up to 3 images here, or click to select files</p>
                                    </div>
                                    {imageUrls.length > 0 && (
                                        <div className="mt-4 grid grid-cols-3 gap-4">
                                            {imageUrls.map((url, index) => (
                                                <div key={index} className="relative group aspect-video">
                                                    <Image src={url} alt={`Ad preview ${index + 1}`} fill className="object-cover rounded-md" />
                                                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeImage(index)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <FormMessage>{form.formState.errors.imageUrls?.message}</FormMessage>
                                </FormItem>
                            )}
                        />


                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="ctaText"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Button Text (CTA)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Buy Tickets" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ctaLink"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Button Link or Phone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com or +2547..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                             <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ad Duration</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="1_day">1 Day</SelectItem>
                                                <SelectItem value="3_days">3 Days</SelectItem>
                                                <SelectItem value="1_week">1 Week</SelectItem>
                                                <SelectItem value="2_weeks">2 Weeks</SelectItem>
                                                <SelectItem value="1_month">1 Month</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority (1-5)</FormLabel>
                                        <FormControl>
                                            <>
                                                <Slider
                                                    min={1}
                                                    max={5}
                                                    step={1}
                                                    defaultValue={[field.value]}
                                                    onValueChange={(value) => field.onChange(value[0])}
                                                />
                                                <p className="text-sm text-muted-foreground text-center">{field.value}</p>
                                            </>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                         <FormField
                            control={form.control}
                            name="isAdultContent"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                    Is this ad suitable for kids?
                                    </FormLabel>
                                    <FormDescription>
                                     No
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                </FormItem>
                            )}
                        />

                        <Button type="submit" size="lg" className="w-full" disabled={isPending || isUploading}>
                            {isPending && <Loader2 className="animate-spin mr-2" />}
                            Submit Ad for Review <ArrowRight className="ml-2" />
                        </Button>
                    </form>
                </Form>
                )}
            </CardContent>
            {user && (
                <CardFooter>
                     <Link href="/advertising/dashboard" className="w-full">
                        <Button variant="outline" className="w-full"><BarChart2 className="mr-2"/> View My Ad Dashboard</Button>
                    </Link>
                </CardFooter>
            )}
        </Card>
    </div>
  );
}
