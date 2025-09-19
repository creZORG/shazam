
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Ticket, LifeBuoy, FileText } from "lucide-react";
import { submitSupportTicket, getUserSupportTickets } from "./actions";
import { useAuth } from "@/hooks/use-auth";
import type { SupportTicket } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const supportSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address."),
  subject: z.string().min(5, "Subject must be at least 5 characters."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

const faqItems = [
    {
        role: "General",
        qas: [
            { q: "How do I purchase a ticket?", a: "To purchase a ticket, navigate to the event you're interested in, select the number and type of tickets you want, and proceed to checkout. You will be prompted to pay via M-Pesa." },
            { q: "Where can I find my purchased tickets?", a: "After a successful purchase, your tickets are sent to your email. You can also view them in your Profile page under the 'My Tickets' tab if you were logged in during purchase, or from the link on the ticket center page." },
        ]
    },
    {
        role: "Organizer",
        qas: [
            { q: "How do I create an event?", a: "Once your Organizer account is approved, navigate to your Organizer Dashboard. From there, you can click on 'Create New Listing' to start the event creation process." },
            { q: "How do I get paid for my ticket sales?", a: "Payouts are processed after your event has successfully concluded. You can request a payout from your dashboard, and funds will be sent to your registered M-Pesa number." },
        ]
    },
    {
        role: "Influencer",
        qas: [
            { q: "How do I get a promo code for an event?", a: "Event organizers can assign you to their campaigns. Once assigned, the campaign will appear in your Influencer Dashboard with your unique code and tracking link." },
            { q: "How are my commissions calculated?", a: "Commissions are calculated based on the agreement set by the event organizer. It can be a fixed amount per ticket or a percentage of the revenue generated through your code. You can track your earnings in your dashboard." },
        ]
    },
    {
        role: "Club",
        qas: [
            { q: "How do I post a nightlife event?", a: "From your Club Dashboard, go to 'Create Event' and fill out the details about your nightly event, including music policy, special appearances, and entrance fees." },
        ]
    }
]

function TicketHistory() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUserSupportTickets().then(result => {
            if (result.success && result.data) {
                setTickets(result.data);
            }
            setLoading(false);
        })
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="animate-spin" /> : tickets.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">You haven't submitted any support tickets.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.map(ticket => (
                                <TableRow key={ticket.id}>
                                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                                    <TableCell>{format(new Date(ticket.createdAt), 'PP')}</TableCell>
                                    <TableCell><Badge variant={ticket.status === 'closed' ? 'secondary' : 'default'} className="capitalize">{ticket.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}

export default function SupportPage() {
  const { toast } = useToast();
  const { user, dbUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof supportSchema>>({
    resolver: zodResolver(supportSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  useEffect(() => {
    if (user) {
        form.reset({
            name: user.displayName || '',
            email: user.email || '',
        })
    }
  }, [user, form]);


  const onSubmit = async (values: z.infer<typeof supportSchema>) => {
    setIsSubmitting(true);
    const result = await submitSupportTicket(values);
    if (result.success) {
      toast({
        title: "Ticket Submitted!",
        description: "Our support team will get back to you shortly.",
      });
      form.reset();
    } else {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: result.error,
      });
    }
    setIsSubmitting(false);
  };


  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12 space-y-12">
      <div className="text-center">
        <LifeBuoy className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-4xl font-bold mt-4">Help Center</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Find answers to common questions or submit a ticket for direct assistance. We're here to help!
        </p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="General">
                <div className="flex justify-center mb-4">
                    <TabsList className="p-1.5 h-auto rounded-full bg-muted border">
                        {faqItems.map(section => (
                             <TabsTrigger key={section.role} value={section.role} className="rounded-full px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                                {section.role}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                {faqItems.map(section => (
                    <TabsContent key={section.role} value={section.role}>
                        <div className="space-y-4 pt-4">
                            {section.qas.map(qa => (
                                <div key={qa.q}>
                                    <h4 className="font-semibold">{qa.q}</h4>
                                    <p className="text-muted-foreground">{qa.a}</p>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </CardContent>
      </Card>
      
      {user && <TicketHistory />}

      <Card>
        <CardHeader>
          <CardTitle>Still need help? Send us a message</CardTitle>
          <CardDescription>
            For specific issues, fill out the form below and our team will get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="e.g., Issue with my ticket" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Please describe your issue in detail..." rows={6} {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                Submit Ticket
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
