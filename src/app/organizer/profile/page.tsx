
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateOrganizerProfile } from "../actions";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
  organizerName: z.string().min(3, "Organization name must be at least 3 characters."),
  about: z.string().min(20, "Please provide a brief description of at least 20 characters."),
});

export default function OrganizerProfilePage() {
    const { user, dbUser } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            organizerName: "",
            about: ""
        },
    });

    useEffect(() => {
        if (dbUser) {
            form.reset({
                organizerName: dbUser.organizerName || '',
                about: dbUser.about || '',
            });
        }
    }, [dbUser, form]);

    const onSubmit = async (values: z.infer<typeof profileSchema>) => {
        if (!user) return;
        setIsSubmitting(true);
        const result = await updateOrganizerProfile(user.uid, values);
        if (result.success) {
            toast({ title: "Profile Updated Successfully!" });
        } else {
            toast({ variant: "destructive", title: "Update Failed", description: result.error });
        }
        setIsSubmitting(false);
    };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Organizer Profile</CardTitle>
          <CardDescription>
            This information will be displayed on your event pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                    control={form.control}
                    name="organizerName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Vibez Entertainment" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="about"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>About Your Organization</FormLabel>
                        <FormControl>
                            <Textarea rows={5} placeholder="What kind of events do you organize? Tell attendees about your brand." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
