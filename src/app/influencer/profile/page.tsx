
'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateInfluencerProfile, isUsernameAvailable } from "../actions";
import { Loader2, UploadCloud, User, Twitter, Instagram, Linkedin, Facebook, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { uploadImage } from "@/app/organizer/events/create/cloudinary-actions";
import { cn } from "@/lib/utils";
import { useDebounce } from "use-debounce";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";

const TikTokIcon = (props: any) => (
  <svg {...props} viewBox="0 0 2859 3333" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd">
    <path d="M2081 0c55 473 319 755 778 785v532c-266 26-499-61-770-225v995c0 1264-1378 1659-1932 753-356-583-138-1606 1004-1647v561c-87 14-180 36-265 65-254 86-398 247-358 531 77 544 1075 705 992-358V1h551z"/>
  </svg>
);

const profileSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, { message: "Must be a valid M-Pesa phone number, e.g., 0712345678" }),
  profilePicture: z.string().optional(),
  socials: z.object({
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      facebook: z.string().optional(),
      linkedin: z.string().optional(),
  }).optional(),
  privacy: z.object({
      showStats: z.boolean().default(true),
      showCampaigns: z.boolean().default(true),
  }).optional(),
});


export default function InfluencerProfilePage() {
    const { user, dbUser, loading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProfileComplete, setIsProfileComplete] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullName: "",
            username: "",
            phone: "",
            profilePicture: "",
            socials: { twitter: '', instagram: '', tiktok: '', facebook: '', linkedin: ''},
            privacy: { showStats: true, showCampaigns: true }
        },
    });

    const [debouncedUsername] = useDebounce(form.watch('username'), 500);
    const originalUsername = dbUser?.name || '';

    useEffect(() => {
        if (debouncedUsername && debouncedUsername.toLowerCase() !== originalUsername.toLowerCase()) {
            setUsernameStatus('checking');
            isUsernameAvailable(debouncedUsername).then(isAvailable => {
                setUsernameStatus(isAvailable ? 'available' : 'taken');
                if (!isAvailable) {
                    form.setError('username', { type: 'manual', message: 'This username is already taken.' });
                } else {
                    form.clearErrors('username');
                }
            });
        } else {
            setUsernameStatus('idle');
             if(form.formState.errors.username?.message === 'This username is already taken.'){
                form.clearErrors('username');
            }
        }
    }, [debouncedUsername, originalUsername, form]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;

            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            
            const result = await uploadImage(formData);

            if (result.success && result.url) {
                form.setValue('profilePicture', result.url, { shouldValidate: true, shouldDirty: true });
            } else {
                toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
            }
            setIsUploading(false);
        },
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        maxSize: 4 * 1024 * 1024, // 4MB
        maxFiles: 1,
    });

    useEffect(() => {
        if (dbUser) {
            form.reset({
                fullName: dbUser.fullName || '',
                username: dbUser.name || '',
                phone: dbUser.phone || '',
                profilePicture: dbUser.profilePicture || '',
                socials: dbUser.socials || { twitter: '', instagram: '', tiktok: '', facebook: '', linkedin: ''},
                privacy: dbUser.privacy || { showStats: true, showCampaigns: true }
            });
            setIsProfileComplete(!!(dbUser.name && dbUser.phone && dbUser.profilePicture));
        }
    }, [dbUser, form]);
    
    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10"/></div>
    }

    const onSubmit = async (values: z.infer<typeof profileSchema>) => {
        if (!user) return;
        if (usernameStatus === 'taken') {
            form.setError('username', { type: 'manual', message: 'This username is already taken.' });
            return;
        }

        setIsSubmitting(true);
        const result = await updateInfluencerProfile(user.uid, values);
        if (result.success) {
            toast({ title: "Profile Updated Successfully!" });
            if (result.roleUpgraded) {
                toast({ title: "Congratulations!", description: "You are now an official NaksYetu Influencer."});
                router.push('/influencer');
            } else {
                 router.refresh();
            }
        } else {
            toast({ variant: "destructive", title: "Update Failed", description: result.error });
        }
        setIsSubmitting(false);
    };

    const profilePictureUrl = form.watch('profilePicture');
    
  return (
    <div className="container mx-auto p-4 md:p-8">
       <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Influencer Profile</CardTitle>
          <CardDescription>Manage your public presence and payment details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {!isProfileComplete && (
                <Alert variant="destructive">
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>Your profile is incomplete. Please fill out all fields to unlock campaigns and payouts.</AlertDescription>
                </Alert>
            )}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    <FormField
                        control={form.control}
                        name="profilePicture"
                        render={() => (
                            <FormItem>
                                <FormLabel>Profile Picture</FormLabel>
                                <div className="flex items-center gap-4">
                                     <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-dashed">
                                        {profilePictureUrl ? (
                                            <Image src={profilePictureUrl} alt="Profile" layout="fill" objectFit="cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground">
                                                <User className="h-10 w-10" />
                                            </div>
                                        )}
                                    </div>
                                    <div {...getRootProps()} className={cn("flex-grow border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary", isDragActive && "border-primary")}>
                                        <input {...getInputProps()} />
                                        {isUploading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />}
                                        <p className="text-xs mt-2 text-muted-foreground">{isUploading ? "Uploading..." : "Click or drag to upload a photo"}</p>
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name (as on ID)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Jane Wanjiku Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                     <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Custom Username</FormLabel>
                                 <div className="relative">
                                    <FormControl>
                                        <Input placeholder="e.g., NaxVibes" {...field} />
                                    </FormControl>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                        {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        {usernameStatus === 'available' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                        {usernameStatus === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
                                    </div>
                                </div>
                                <FormDescription>
                                    {usernameStatus === 'available' && <span className="text-green-500">Username is available!</span>}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>M-Pesa Phone Number</FormLabel>
                                <FormControl>
                                    <Input type="tel" placeholder="0712345678" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Social Links</CardTitle>
                            <CardDescription>Add links to your social media profiles. Enter the full URL.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="socials.twitter" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Twitter className="h-5 w-5"/><Input placeholder="https://twitter.com/username" {...field} /></div><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="socials.instagram" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Instagram className="h-5 w-5"/><Input placeholder="https://instagram.com/username" {...field} /></div><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="socials.tiktok" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><TikTokIcon className="h-5 w-5 fill-current"/><Input placeholder="https://tiktok.com/@username" {...field} /></div><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="socials.facebook" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Facebook className="h-5 w-5"/><Input placeholder="https://facebook.com/username" {...field} /></div><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="socials.linkedin" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Linkedin className="h-5 w-5"/><Input placeholder="https://linkedin.com/in/username" {...field} /></div><FormMessage /></FormItem>)}/>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Privacy Settings</CardTitle>
                            <CardDescription>Control what is shown on your public influencer profile.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <FormField
                                control={form.control}
                                name="privacy.showStats"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Show Sales Statistics</FormLabel>
                                            <FormDescription>Allow organizers to see your total revenue and tickets sold.</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="privacy.showCampaigns"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Show Past Campaigns</FormLabel>
                                            <FormDescription>Display events and tours you have previously promoted.</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Button type="submit" disabled={isSubmitting || isUploading}>
                        {(isSubmitting || isUploading) && <Loader2 className="mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
