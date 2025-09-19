
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { UserRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition } from "react";
import { sendStaffNote } from "./actions";
import { Loader2, Send, Info, AlertTriangle } from "lucide-react";

const staffRoles: { id: UserRole; label: string }[] = [
    { id: 'admin', label: 'Admins' },
    { id: 'organizer', label: 'Organizers' },
    { id: 'influencer', label: 'Influencers' },
    { id: 'verifier', label: 'Verifiers' },
    { id: 'club', label: 'Clubs' },
];

const staffNoteSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters.'),
  type: z.enum(['info', 'warning']),
  roles: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one role.",
  }),
});

export default function CommunicationPage() {
    const { toast } = useToast();
    const [isSending, startSending] = useTransition();
    
    const form = useForm<z.infer<typeof staffNoteSchema>>({
        resolver: zodResolver(staffNoteSchema),
        defaultValues: {
            message: '',
            type: 'info',
            roles: [],
        },
    });

    const onSubmit = (values: z.infer<typeof staffNoteSchema>) => {
        startSending(async () => {
            const result = await sendStaffNote({
                ...values,
                roles: values.roles as UserRole[],
            });

            if (result.success) {
                toast({ title: "Staff Note Sent!", description: "The message has been dispatched to the selected roles." });
                form.reset();
            } else {
                toast({ variant: 'destructive', title: "Failed to Send", description: result.error });
            }
        });
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Staff Communication</h1>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compose Note</CardTitle>
                            <CardDescription>Send a system-wide notification to specific staff roles. This will appear as a banner on their dashboards.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="message" render={({ field }) => (
                                <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="e.g., Heads up team, we'll be deploying an update..." rows={5} {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            
                            <div className="grid md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem className="space-y-3"><FormLabel>Note Type</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="info" /></FormControl>
                                                    <FormLabel className="font-normal flex items-center gap-2"><Info className="h-4 w-4 text-blue-500" /> Information</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="warning" /></FormControl>
                                                    <FormLabel className="font-normal flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500"/> Warning</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="roles" render={() => (
                                    <FormItem><FormLabel>Target Roles</FormLabel>
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            {staffRoles.map((item) => (
                                                <FormField key={item.id} control={form.control} name="roles" render={({ field }) => {
                                                    return (
                                                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(item.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                        ? field.onChange([...field.value, item.id])
                                                                        : field.onChange(field.value?.filter((value) => value !== item.id))
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{item.label}</FormLabel>
                                                        </FormItem>
                                                    )
                                                }}/>
                                            ))}
                                        </div>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSending} size="lg">
                                {isSending && <Loader2 className="animate-spin mr-2" />}
                                <Send className="mr-2" /> Send to Staff
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>
    )
}
