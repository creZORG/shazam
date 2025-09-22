

'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getSettings, updateSettings } from "./actions";
import { useEffect, useState, useTransition } from "react";
import { Loader2, UploadCloud, Home, ImageIcon, Gift, Award } from "lucide-react";
import type { SiteSettings, FeatureCardContent, PartnerSectionContent } from "@/lib/types";
import { useDropzone } from "react-dropzone";
import { uploadImage } from "@/app/organizer/events/create/cloudinary-actions";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

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

const settingsSchema = z.object({
    platformFee: z.coerce.number().min(0, "Platform fee cannot be negative."),
    processingFee: z.coerce.number().min(0, "Processing fee cannot be negative."),
    processingFeePayer: z.enum(['customer', 'organizer']),
    influencerCut: z.coerce.number().min(0, "Influencer cut cannot be negative.").max(100, "Cannot exceed 100%."),
    requireStaffVerification: z.boolean().optional(),
    logoBriefUrl: z.string().url().optional(),
    logoLongUrl: z.string().url().optional(),
    enableHolidayTheme: z.boolean().optional(),
    loyaltyPointRate: z.coerce.number().positive("Value must be a positive number."),
    homepage: z.object({
      featureCards: z.array(featureCardSchema).optional(),
      partnerSection: partnerSectionSchema.optional(),
  }).optional()
});


function LogoUploader({ form, fieldName, label }: { form: any, fieldName: 'logoBriefUrl' | 'logoLongUrl', label: string }) {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    
    const onDrop = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await uploadImage(formData);

        if (result.success && result.url) {
            form.setValue(fieldName, result.url, { shouldValidate: true, shouldDirty: true });
        } else {
            toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
        }
        setIsUploading(false);
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.svg'] },
        maxFiles: 1,
    });
    
    const logoUrl = form.watch(fieldName);

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-md border-2 border-dashed flex items-center justify-center bg-muted">
                    {logoUrl ? <Image src={logoUrl} alt={`${label} preview`} layout="fill" objectFit="contain" className="p-1" /> : <p className="text-xs text-muted-foreground">Preview</p>}
                </div>
                 <div {...getRootProps()} className={cn("flex-grow border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary")}>
                    <input {...getInputProps()} />
                    {isUploading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />}
                    <p className="text-xs mt-2 text-muted-foreground">{isUploading ? "Uploading..." : "Click or drag to upload"}</p>
                </div>
            </div>
            <FormMessage>{(form.formState.errors[fieldName] as any)?.message}</FormMessage>
        </FormItem>
    );
}

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


export default function AdminSettingsPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    const defaultValues: z.infer<typeof settingsSchema> = {
        platformFee: 5,
        processingFee: 2.5,
        processingFeePayer: 'customer',
        influencerCut: 10,
        logoBriefUrl: "",
        logoLongUrl: "",
        enableHolidayTheme: false,
        loyaltyPointRate: 10,
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

    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        defaultValues,
    });
    
    const { fields: featureCardFields } = useFieldArray({
        control: form.control,
        name: "homepage.featureCards",
    });

    useEffect(() => {
        setIsLoading(true);
        getSettings().then(({ settings, error }) => {
            if (settings) {
                const mergedData = {
                  ...defaultValues,
                  ...settings,
                  homepage: {
                    ...defaultValues.homepage,
                    ...(settings.homepage || {}),
                  }
                };
                form.reset(mergedData);
            }
            if (error) {
                toast({ variant: 'destructive', title: "Error", description: "Could not load existing settings." });
            }
            setIsLoading(false);
        });
    }, [form, toast]);


    const handleSaveChanges = async (values: z.infer<typeof settingsSchema>) => {
        setIsLoading(true);
        const result = await updateSettings(values);
        if (result.success) {
             toast({
                title: "Settings Saved!",
                description: `Your changes have been saved successfully.`
            });
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
       setIsLoading(false);
    }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>Configure global settings for the Mov33 platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    
                    <div className="p-6 border rounded-lg space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold">Logo Management</h3>
                            <p className="text-sm text-muted-foreground">Upload your brand's logos. They will be used across the site.</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            <LogoUploader form={form} fieldName="logoBriefUrl" label="Icon Logo (Brief)" />
                            <LogoUploader form={form} fieldName="logoLongUrl" label="Full Logo (Long)" />
                        </div>
                    </div>

                    <div className="p-6 border rounded-lg space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold">Homepage Content</h3>
                            <p className="text-sm text-muted-foreground">Manage content for the main sections of the homepage.</p>
                        </div>
                        
                        <div className="space-y-6">
                            <h4 className="font-semibold text-lg">"What are you looking for?" Section</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {featureCardFields.map((item, index) => (
                                    <div key={item.id} className="p-4 border rounded-md space-y-2">
                                        <FormField control={form.control} name={`homepage.featureCards.${index}.imageUrl`} render={({ field }) => (
                                            <FormItem><FormLabel>Card {index + 1} Image</FormLabel>
                                                <ImageUploader onUpload={(url) => field.onChange(url)}>
                                                    {field.value ? <Image src={field.value} alt={`Card ${index + 1}`} fill className="object-cover rounded-md" /> : <ImageIcon />}
                                                </ImageUploader>
                                            <FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`homepage.featureCards.${index}.title`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Title" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name={`homepage.featureCards.${index}.description`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Description" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name={`homepage.featureCards.${index}.cta`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Button Text" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={form.control} name={`homepage.featureCards.${index}.href`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Link URL" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-lg">"Partner With Us" Section</h4>
                             <FormField control={form.control} name="homepage.partnerSection.imageUrl" render={({ field }) => (
                                <FormItem><FormLabel>Image</FormLabel>
                                    <ImageUploader onUpload={(url) => field.onChange(url)} className="max-w-md">
                                        {field.value ? <Image src={field.value} alt="Partner Section" fill className="object-cover rounded-md" /> : <ImageIcon />}
                                    </ImageUploader>
                                <FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="homepage.partnerSection.title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="homepage.partnerSection.description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="homepage.partnerSection.cta" render={({ field }) => (<FormItem><FormLabel>Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="homepage.partnerSection.href" render={({ field }) => (<FormItem><FormLabel>Link URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                    </div>


                    <div className="p-6 border rounded-lg space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold">Transaction Fees</h3>
                            <p className="text-sm text-muted-foreground">Set platform and transaction processing fees for all ticket sales.</p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="platformFee" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Platform Fee (%)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 5" {...field} /></FormControl>
                                    <FormDescription>The percentage your platform takes from each ticket sold.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="processingFee" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Processing Fee (%)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 2.5" {...field} /></FormControl>
                                    <FormDescription>The cost charged by the payment provider.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>

                        <FormField
                            control={form.control}
                            name="processingFeePayer"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Who pays the processing fee?</FormLabel>
                                    <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl><RadioGroupItem value="customer" /></FormControl>
                                            <Label className="font-normal">Customer (Added to total)</Label>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2">
                                            <FormControl><RadioGroupItem value="organizer" /></FormControl>
                                            <Label className="font-normal">Organizer (Deducted from payout)</Label>
                                        </FormItem>
                                    </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="p-6 border rounded-lg space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold">Influencer Fees</h3>
                            <p className="text-sm text-muted-foreground">Set the commission structure for your influencer program.</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="influencerCut" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Platform Cut from Influencer Commission (%)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                                    <FormDescription>The percentage your platform takes from an influencer's earnings.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </div>
                    
                    <div className="p-6 border rounded-lg space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold flex items-center gap-2"><Award /> Loyalty Program</h3>
                            <p className="text-sm text-muted-foreground">Configure the customer loyalty points system.</p>
                        </div>
                         <FormField control={form.control} name="loyaltyPointRate" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ksh Spent per Loyalty Point</FormLabel>
                                <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                                <FormDescription>The total amount a customer must spend to earn one point.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                     <div className="p-6 border rounded-lg space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold">Security & Theme</h3>
                            <p className="text-sm text-muted-foreground">Manage security and visual features.</p>
                        </div>
                        <FormField
                            control={form.control}
                            name="requireStaffVerification"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Require Staff Email Verification</FormLabel>
                                        <FormDescription>If enabled, staff members (organizers, verifiers, etc.) will need to verify their email with a one-time code upon login.</FormDescription>
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
                         <FormField
                            control={form.control}
                            name="enableHolidayTheme"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="flex items-center gap-2"><Gift /> Force Holiday Theme</FormLabel>
                                        <FormDescription>Manually enable or disable the festive holiday theme across the entire site, overriding the automatic date-based detection.</FormDescription>
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
                    </div>

                    <div className="p-6 border rounded-lg flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold">Maintenance Mode</h3>
                            <p className="text-sm text-muted-foreground">Temporarily take the site offline for updates.</p>
                        </div>
                        <Switch id="maintenance-mode" />
                    </div>
                    
                </CardContent>
            </Card>
            <Button type="submit" disabled={isLoading} className="mt-8">
                {isLoading && <Loader2 className="mr-2 animate-spin"/>}
                Save All Settings
            </Button>
        </form>
    </Form>
  );
}

    