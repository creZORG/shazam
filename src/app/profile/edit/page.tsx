

'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile, isUsernameAvailable } from "./actions";
import { Loader2, UploadCloud, User, CheckCircle, XCircle, Twitter, Instagram, Linkedin, Facebook } from "lucide-react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { uploadImage } from "@/app/organizer/events/create/cloudinary-actions";
import { cn } from "@/lib/utils";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/navigation";

const TikTokIcon = (props: any) => (
  <svg {...props} viewBox="0 0 2859 3333" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd">
    <path d="M2081 0c55 473 319 755 778 785v532c-266 26-499-61-770-225v995c0 1264-1378 1659-1932 753-356-583-138-1606 1004-1647v561c-87 14-180 36-265 65-254 86-398 247-358 531 77 544 1075 705 992-358V1h551z"/>
  </svg>
);


const profileSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, { message: "Must be a valid phone number, e.g., 0712345678" }),
  profilePicture: z.string().optional(),
   socials: z.object({
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      facebook: z.string().optional(),
      linkedin: z.string().optional(),
  }).optional(),
});


export default function EditProfilePage() {
    const { user, dbUser, loading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
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
                fullName: dbUser.fullName || dbUser.name || '',
                username: dbUser.name || '',
                phone: dbUser.phone || '',
                profilePicture: dbUser.profilePicture || '',
                socials: dbUser.socials || { twitter: '', instagram: '', tiktok: '', facebook: '', linkedin: ''},
            });
        }
    }, [dbUser, form]);

    const onSubmit = async (values: z.infer<typeof profileSchema>) => {
        if (!user) return;
        if (usernameStatus === 'taken') {
            form.setError('username', { type: 'manual', message: 'This username is already taken.' });
            return;
        }

        setIsSubmitting(true);
        const result = await updateUserProfile(user.uid, values);
        if (result.success) {
            toast({ title: "Profile Updated Successfully!" });
            router.push('/profile');
        } else {
            toast({ variant: "destructive", title: "Update Failed", description: result.error });
        }
        setIsSubmitting(false);
    };

    const profilePictureUrl = form.watch('profilePicture');

    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10"/></div>
    }
    
  return (
    <div className="container mx-auto p-4 md:p-8">
       <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Your Profile</CardTitle>
          <CardDescription>Manage your public presence and payment details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
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
                                <FormLabel>Full Name</FormLabel>
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
                                <FormLabel>Username</FormLabel>
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
