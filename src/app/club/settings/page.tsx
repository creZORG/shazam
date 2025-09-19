
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { updateClubProfile } from "../actions";
import { uploadImage } from "@/app/organizer/events/create/cloudinary-actions";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { cn } from "@/lib/utils";


const clubSettingsSchema = z.object({
  clubName: z.string().min(3, "Club name must be at least 3 characters."),
  location: z.string().min(20, "Please provide a brief description of at least 20 characters."),
  photos: z.array(z.string()).optional(),
});

export default function ClubSettingsPage() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof clubSettingsSchema>>({
    resolver: zodResolver(clubSettingsSchema),
    defaultValues: {
      clubName: "",
      location: "",
      photos: [],
    },
  });

  useEffect(() => {
    if (dbUser) {
        form.reset({
            clubName: dbUser.organizerName || '',
            location: dbUser.about || '',
            photos: (dbUser as any).gallery || []
        })
    }
  }, [dbUser, form]);


  const onDrop = async (acceptedFiles: File[]) => {
    setIsUploading(true);
    const currentPhotos = form.getValues('photos') || [];
    
    const uploadPromises = acceptedFiles.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadImage(formData);
    });

    try {
      const results = await Promise.all(uploadPromises);
      const newImageUrls = results.filter(r => r.success).map(r => r.url!);
      form.setValue("photos", [...currentPhotos, ...newImageUrls]);
      toast({title: `${newImageUrls.length} image(s) uploaded!`});
    } catch (error) {
      console.error("Error uploading images:", error);
      toast({variant: 'destructive', title: 'Upload Failed', description: 'One or more images failed to upload.'});
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    multiple: true,
  });

  const removeImage = (url: string) => {
    const newImages = (form.getValues('photos') || []).filter((img) => img !== url);
    form.setValue("photos", newImages);
  };

  async function onSubmit(values: z.infer<typeof clubSettingsSchema>) {
    if (!user) return;
    setIsSubmitting(true);
    const result = await updateClubProfile(user.uid, values);
    if(result.success) {
        toast({title: "Settings Saved", description: "Your club profile has been updated."});
    } else {
        toast({variant: 'destructive', title: 'Error', description: result.error});
    }
    setIsSubmitting(false);
  }
  
  const uploadedImages = form.watch('photos') || [];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Club Settings</CardTitle>
          <CardDescription>Set up and manage your club profile. This information is visible to the public.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="clubName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Taida's Club" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About Your Club & Location</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Biashara Centre, Nakuru. Include a short bio and directions if possible. This will be shown in the 'About the Club' tab." {...field} />
                    </FormControl>
                     <FormDescription>
                        This information will be displayed on the "About the Club" tab on your public event pages.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Club Photos</FormLabel>
                <CardDescription className="mb-2">These images will be displayed in the "Gallery" tab on your public nightlife event pages.</CardDescription>
                <div
                  {...getRootProps()}
                  className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary", isDragActive && "border-primary")}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                  {isUploading ? (
                    <p>Uploading...</p>
                  ) : isDragActive ? (
                    <p>Drop the files here ...</p>
                  ) : (
                    <p>Drag 'n' drop some files here, or click to select files</p>
                  )}
                </div>
                {uploadedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {uploadedImages.map((url) => (
                      <div key={url} className="relative group aspect-square">
                        <Image
                          src={url}
                          alt="Club photo"
                          fill
                          className="rounded-md object-cover"
                        />
                         <button
                          type="button"
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 bg-background/70 rounded-full p-1 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </FormItem>

              <Button type="submit" disabled={isSubmitting || isUploading}>
                {(isSubmitting || isUploading) && <Loader2 className="mr-2 animate-spin"/>}
                Save Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
