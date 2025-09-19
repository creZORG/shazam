'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Handshake, Megaphone, Check, X, User, Mail, Calendar, LifeBuoy, Loader2, Send, BarChart2, Eye, ExternalLink } from "lucide-react";
import { getAdRequests, getPartnerRequests, approvePartnerRequest, denyPartnerRequest, getSupportTickets, updateSupportTicketStatus, replyToSupportTicket, updateAdStatus } from "./actions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { useEffect, useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PartnerRequest, AdSubmission, SupportTicket, SupportTicketReply } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

function PartnerRequestActionButton({ requestId, newRole, userId, actionType }: { requestId: string, newRole: string, userId: string, actionType: 'approve' | 'deny' }) {
    const [isPending, startTransition] = useTransition();

    const handleAction = async () => {
        startTransition(async () => {
            if (actionType === 'approve') {
                await approvePartnerRequest(requestId, userId, newRole);
            } else {
                await denyPartnerRequest(requestId);
            }
        });
    };

    return (
        <Button size="sm" variant={actionType === 'approve' ? 'default' : 'destructive'} onClick={handleAction} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 animate-spin" /> : actionType === 'approve' ? <Check className="mr-2" /> : <X className="mr-2" />}
            {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
        </Button>
    );
}

function AdRequestCard({ ad, onAction }: { ad: AdSubmission; onAction: (adId: string, status: 'approved' | 'rejected') => void; }) {
    const [isPending, startTransition] = useTransition();
    const {toast} = useToast();

    const handleStatusUpdate = (status: 'approved' | 'rejected') => {
        startTransition(async () => {
            const result = await updateAdStatus(ad.id, status);
            if (result.success) {
                toast({ title: `Ad ${status}!`});
                onAction(ad.id, status);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-start">
                 <div>
                    <CardTitle>{ad.campaignName}</CardTitle>
                    <CardDescription>Submitted on {format(new Date(ad.createdAt), 'PP')}</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleStatusUpdate('approved')} disabled={isPending}><Check className="mr-2"/>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('rejected')} disabled={isPending}><X className="mr-2"/>Reject</Button>
                </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1 grid grid-cols-2 gap-2">
                    {ad.imageUrls.map(url => <Image key={url} src={url} alt="Ad image" width={150} height={150} className="rounded-md object-cover" />)}
                </div>
                 <div className="md:col-span-2 space-y-3 text-sm">
                    <p><strong>CTA Text:</strong> <Badge variant="outline">{ad.ctaText}</Badge></p>
                    <p><strong>CTA Link:</strong> <a href={ad.ctaLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{ad.ctaLink} <ExternalLink className="h-4 w-4"/></a></p>
                    <p><strong>Priority:</strong> {ad.priority}</p>
                    <p><strong>Duration:</strong> {ad.duration.replace('_', ' ')}</p>
                    {ad.isAdultContent && <Badge variant="destructive">Adult Content</Badge>}
                </div>
            </CardContent>
        </Card>
    );
}

function ReplyForm({ ticket, onReplySent }: { ticket: SupportTicket, onReplySent: (newReply: SupportTicketReply) => void }) {
    const [reply, setReply] = useState('');
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleReply = () => {
        if (!reply.trim()) return;

        startTransition(async () => {
            const result = await replyToSupportTicket({
                ticketId: ticket.id,
                message: reply,
                userEmail: ticket.email
            });

            if (result.success && result.data) {
                onReplySent(result.data);
                setReply('');
                toast({ title: "Reply Sent!", description: "Your reply has been emailed to the user." });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

    return (
        <div className="mt-4 space-y-2">
            <Textarea 
                placeholder="Write your reply..."
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={4}
            />
            <Button onClick={handleReply} disabled={isPending || !reply.trim()} className="w-full">
                {isPending && <Loader2 className="mr-2 animate-spin" />}
                <Send className="mr-2" /> Send Reply
            </Button>
        </div>
    )
}

function ViewTicketDialog({ ticket, onStatusChange, onReplySent }: { ticket: SupportTicket, onStatusChange: (ticketId: string, status: 'closed' | 'open') => void, onReplySent: (ticketId: string, newReply: SupportTicketReply) => void }) {
    const [isClosing, startClosingTransition] = useTransition();
    const [isOpening, startOpeningTransition] = useTransition();

    const handleStatusUpdate = (status: 'open' | 'closed') => {
        const transition = status === 'closed' ? startClosingTransition : startOpeningTransition;
        transition(async () => {
            const result = await updateSupportTicketStatus(ticket.id, status);
            if (result.success) {
                onStatusChange(ticket.id, status);
            }
        });
    };

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{ticket.subject}</DialogTitle>
                <DialogDescription>
                    From: {ticket.name} ({ticket.email}) | Status: <Badge variant={ticket.status === 'closed' ? 'secondary' : 'default'} className="capitalize">{ticket.status}</Badge>
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-64 border rounded-md p-4 bg-muted/50">
                <div className="space-y-4">
                    {/* Original Message */}
                     <div className="flex flex-col items-start gap-2">
                        <div className="rounded-lg bg-background p-3">
                            <p className="text-sm">{ticket.message}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{ticket.name} - {format(new Date(ticket.createdAt), 'PPp')}</p>
                    </div>
                    {/* Replies */}
                    {ticket.replies?.map(reply => (
                         <div key={reply.createdAt} className="flex flex-col items-end gap-2">
                            <div className="rounded-lg bg-primary text-primary-foreground p-3">
                                <p className="text-sm">{reply.message}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{reply.authorName} - {format(new Date(reply.createdAt), 'PPp')}</p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
             <ReplyForm ticket={ticket} onReplySent={(newReply) => onReplySent(ticket.id, newReply)} />
             <DialogFooter>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                {ticket.status === 'open' ? (
                     <Button variant="secondary" onClick={() => handleStatusUpdate('closed')} disabled={isClosing}>
                        {isClosing && <Loader2 className="mr-2 animate-spin" />} Mark as Closed
                    </Button>
                ) : (
                    <Button variant="secondary" onClick={() => handleStatusUpdate('open')} disabled={isOpening}>
                        {isOpening && <Loader2 className="mr-2 animate-spin" />} Re-open Ticket
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    );
}

function AdminRequestsPageContent() {
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>([]);
  const [adRequests, setAdRequests] = useState<AdSubmission[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
        getPartnerRequests(),
        getAdRequests(),
        getSupportTickets()
    ]).then(([partnerRes, adRes, supportRes]) => {
        if(partnerRes.success && partnerRes.data) setPartnerRequests(partnerRes.data);
        if(adRes.success && adRes.data) setAdRequests(adRes.data);
        if(supportRes.success && supportRes.data) setSupportTickets(supportRes.data);
        setLoading(false);
    })
  }

  useEffect(() => {
    fetchData();
  }, []);
  
  const handleTicketStatusChange = (ticketId: string, newStatus: 'closed' | 'open') => {
      setSupportTickets(currentTickets => currentTickets.map(t => t.id === ticketId ? {...t, status: newStatus} : t));
  }
  
  const handleReplySent = (ticketId: string, newReply: SupportTicketReply) => {
    setSupportTickets(currentTickets => currentTickets.map(t => {
        if (t.id === ticketId) {
            return {
                ...t,
                replies: [...(t.replies || []), newReply]
            }
        }
        return t;
    }));
  };

  const handleAdAction = (adId: string, newStatus: 'approved' | 'rejected') => {
      setAdRequests(currentAds => {
          return currentAds.map(ad => 
              ad.id === adId ? { ...ad, status: newStatus } : ad
          );
      });
  };
  
  const pendingAds = adRequests.filter(ad => ad.status === 'pending');
  const pastAds = adRequests.filter(ad => ad.status !== 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Requests</CardTitle>
        <CardDescription>Review and approve incoming requests from users and advertisers.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="partner" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="partner">
                <Handshake className="mr-2" />
                Partner ({partnerRequests?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="ads">
                <Megaphone className="mr-2" />
                Ads ({pendingAds?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="support">
                <LifeBuoy className="mr-2" />
                Support ({supportTickets?.filter(t => t.status === 'open').length || 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="partner" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Partner Requests</CardTitle>
                    <CardDescription>Approve or deny requests from users to become organizers or influencers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? <Loader2 className="animate-spin" /> : partnerRequests && partnerRequests.length > 0 ? (
                        partnerRequests.map(req => (
                            <div key={req.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={req.user.profilePicture} />
                                        <AvatarFallback>{req.user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{req.user.name}</p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {req.user.email}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Requested on {format(new Date(req.createdAt), 'PP')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant="secondary" className="text-base">Role: <span className="font-bold ml-1 capitalize">{req.requestedRole}</span></Badge>
                                    <div className="flex gap-2">
                                        <PartnerRequestActionButton requestId={req.id} newRole={req.requestedRole} userId={req.userId} actionType="approve" />
                                        <PartnerRequestActionButton requestId={req.id} newRole={req.requestedRole} userId={req.userId} actionType="deny" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-12">No pending partner requests.</p>
                    )}
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ads" className="mt-4 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Pending Ad Submissions</CardTitle>
                    <CardDescription>Review, approve, or reject ad campaigns submitted by advertisers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? <Loader2 className="animate-spin" /> : pendingAds.length > 0 ? (
                        pendingAds.map(ad => <AdRequestCard key={ad.id} ad={ad} onAction={handleAdAction} />)
                    ) : (
                        <p className="text-center text-muted-foreground py-12">No pending ad submissions.</p>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Live & Past Campaigns</CardTitle>
                    <CardDescription>Performance overview of all approved or rejected ad campaigns.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <Loader2 className="animate-spin" /> : pastAds.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Status</TableHead><TableHead>Impressions</TableHead><TableHead>Clicks</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {pastAds.map(ad => (
                                    <TableRow key={ad.id}>
                                        <TableCell className="font-medium">{ad.campaignName}</TableCell>
                                        <TableCell><Badge variant={ad.status === 'approved' ? 'default' : 'destructive'} className="capitalize">{ad.status}</Badge></TableCell>
                                        <TableCell>{ad.impressions || 0}</TableCell>
                                        <TableCell>{ad.clicks || 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-12">No historical ad data.</p>
                    )}
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="support" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Support Tickets</CardTitle>
                    <CardDescription>Address inquiries from the help center.</CardDescription>
                </CardHeader>
                <CardContent>
                   {loading ? <Loader2 className="animate-spin" /> : supportTickets.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>From</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {supportTickets.map(ticket => (
                                    <TableRow key={ticket.id} className={ticket.status === 'closed' ? 'opacity-60' : ''}>
                                        <TableCell>
                                            <div className="font-medium">{ticket.name}</div>
                                            <div className="text-xs text-muted-foreground">{ticket.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{ticket.subject}</p>
                                        </TableCell>
                                        <TableCell>{format(new Date(ticket.createdAt), 'PP')}</TableCell>
                                        <TableCell><Badge variant={ticket.status === 'closed' ? 'secondary' : 'default'} className="capitalize">{ticket.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm">View</Button>
                                                </DialogTrigger>
                                                <ViewTicketDialog ticket={ticket} onStatusChange={handleTicketStatusChange} onReplySent={handleReplySent} />
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                   ) : (
                        <p className="text-center text-muted-foreground py-12">No support tickets found.</p>
                   )}
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AdminRequestsPageContent;
