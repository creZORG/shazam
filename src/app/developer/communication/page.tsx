
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { UserRole, StaffNote } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition, useEffect } from "react";
import { sendStaffNote, getSentNotes } from "./actions";
import { Loader2, Send, Info, AlertTriangle, Users, Clock, Eye } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";

type SentNote = StaffNote & {
    readByDetails: {
        userName: string;
        readAt: string;
    }[];
}

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

function SentNotesHistory() {
    const [notes, setNotes] = useState<SentNote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSentNotes().then(result => {
            if (result.success && result.data) {
                setNotes(result.data);
            }
            setLoading(false);
        });
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sent Notes History</CardTitle>
                <CardDescription>A log of all staff communications you have sent.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="animate-spin" /> : (
                    <Accordion type="single" collapsible className="w-full">
                        {notes.map(note => (
                             <AccordionItem key={note.id} value={note.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-semibold line-clamp-1">{note.message}</p>
                                            <p className="text-sm text-muted-foreground">{format(new Date(note.createdAt), 'PPp')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="flex items-center gap-1"><Users className="h-3 w-3" />{note.roles.length}</Badge>
                                            <Badge variant="outline" className="flex items-center gap-1"><Eye className="h-3 w-3" />{note.readByDetails.length}</Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <p><strong>Message:</strong> {note.message}</p>
                                    <p><strong>Target Roles:</strong> {note.roles.join(', ')}</p>
                                    <h4 className="font-semibold pt-2">Read Receipts:</h4>
                                    {note.readByDetails.length > 0 ? (
                                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                                            {note.readByDetails.map(reader => (
                                                <li key={reader.userName+reader.readAt}>
                                                    {reader.userName} - {formatDistanceToNow(new Date(reader.readAt), { addSuffix: true })}
                                                </li>
                                            ))}
                                        </ul>
                                    ): <p className="text-sm text-muted-foreground">No one has read this note yet.</p>}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}

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

            <SentNotesHistory />
        </div>
    )
}
