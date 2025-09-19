
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllNonAttendeeUsers, generateInviteLink, getPublishedEventsForSelect } from "./actions";
import { UsersTable } from "./_components/UsersTable";
import { UserSearch } from "./_components/UserSearch";
import { useEffect, useState, useCallback, useTransition } from "react";
import type { FirebaseUser, UserRole, Event } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Copy, Users, Briefcase, Percent, Shield, Ticket, Code, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type UserWithId = FirebaseUser & { id: string };
const STAFF_ROLES: UserRole[] = ['organizer', 'influencer', 'verifier', 'admin', 'club', 'developer'];

const roleLabels: Record<UserRole, string> = {
    'super-admin': 'Super Admins',
    'admin': 'Admins',
    'organizer': 'Organizers',
    'influencer': 'Influencers',
    'verifier': 'Verifiers',
    'club': 'Clubs',
    'attendee': 'Attendees',
    'developer': 'Developers',
};

const inviteSchema = z.object({
    email: z.string().email('Invalid email address.').optional().or(z.literal('')),
    role: z.enum(STAFF_ROLES),
    eventId: z.string().optional(),
});

function InviteUserForm() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [events, setEvents] = useState<{ id: string, name: string }[]>([]);
    const [inviteLink, setInviteLink] = useState<string | null>(null);

    const form = useForm<z.infer<typeof inviteSchema>>({
        resolver: zodResolver(inviteSchema),
        defaultValues: { email: '', role: 'organizer' }
    });

    const selectedRole = form.watch('role');

    useEffect(() => {
        if (selectedRole === 'verifier') {
            getPublishedEventsForSelect().then(result => {
                if(result.success && result.data) {
                    setEvents(result.data);
                }
            })
        }
    }, [selectedRole]);


    const onSubmit = (values: z.infer<typeof inviteSchema>) => {
        startTransition(async () => {
            const result = await generateInviteLink({ ...values, sendEmail: !!values.email });
            if(result.success && result.inviteLink) {
                setInviteLink(result.inviteLink);
                toast({ title: 'Invitation Link Generated!', description: `You can now share the link.`});
                if (values.email) {
                    toast({ title: "Invite Email Sent!", description: `An invitation has been sent to ${values.email}.`})
                }
                form.reset();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }
    
    const handleCopyLink = () => {
        if(inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            toast({ title: "Link Copied!"});
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invite New User</CardTitle>
                <CardDescription>Generate a unique invitation short link for a new user to join NaksYetu with a specific role.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <FormField control={form.control} name="email" render={({field}) => (
                             <FormItem><FormLabel>Email (optional)</FormLabel><FormControl><Input placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="role" render={({field}) => (
                             <FormItem><FormLabel>Assign Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{STAFF_ROLES.filter(r => r !== 'super-admin').map(role => <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        
                        {selectedRole === 'verifier' && (
                             <FormField control={form.control} name="eventId" render={({field}) => (
                                <FormItem><FormLabel>Assign to Event (Optional)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Global Verifier" /></SelectTrigger></FormControl><SelectContent>{events.map(event => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                        )}

                        <div className={selectedRole === 'verifier' ? 'lg:col-span-3' : ''}>
                             <Button type="submit" disabled={isPending} className="w-full">{isPending ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2"/>}Generate Invite Link</Button>
                        </div>
                    </form>
                </Form>
                 {inviteLink && (
                    <Alert className="mt-6">
                        <AlertTitle>Share this Invitation Link</AlertTitle>
                        <AlertDescription className="flex items-center justify-between gap-4">
                            <Input value={inviteLink} readOnly className="flex-grow" />
                            <Button variant="outline" size="icon" onClick={handleCopyLink}><Copy className="h-4 w-4"/></Button>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

export default function AdminUsersPage() {
  const [usersByRole, setUsersByRole] = useState<Record<string, UserWithId[]> | null>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllNonAttendeeUsers().then((nonAttendeeResult) => {
      if (nonAttendeeResult.error) {
        setError(nonAttendeeResult.error);
      } else {
        setUsersByRole(nonAttendeeResult.data || {});
      }
      setLoading(false);
    });
  }, []);

  const roleTabs = [
      { role: 'organizer', icon: Briefcase },
      { role: 'influencer', icon: Percent },
      { role: 'club', icon: Building2 },
      { role: 'admin', icon: Shield },
      { role: 'verifier', icon: Users },
      { role: 'developer', icon: Code },
  ];

  return (
    <div className="space-y-8">
        <InviteUserForm />
        <Card>
            <CardHeader>
                <CardTitle>Manage Users</CardTitle>
                <CardDescription>View, edit, or suspend staff and partner accounts.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="browse" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="browse">Browse by Role</TabsTrigger>
                        <TabsTrigger value="search">Search by Username</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="browse" className="space-y-4 pt-4">
                        <Tabs defaultValue="organizer">
                             <TabsList>
                                {roleTabs.map(tab => (
                                    <TabsTrigger key={tab.role} value={tab.role}>
                                        <tab.icon className="mr-2" />
                                        {roleLabels[tab.role as UserRole]}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : error ? <p className="text-destructive text-center p-12">{error}</p> :
                            roleTabs.map(tab => (
                                 <TabsContent key={tab.role} value={tab.role}>
                                    <UsersTable users={usersByRole?.[tab.role] || []} />
                                 </TabsContent>
                            ))}
                        </Tabs>
                    </TabsContent>
                    
                    <TabsContent value="search">
                        <UserSearch />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}
