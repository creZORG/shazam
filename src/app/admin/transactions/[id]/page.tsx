
'use client';

import { notFound, useRouter } from 'next/navigation';
import { getTransactionDetails, resendTicketEmail } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, User, Ticket, Calendar, AlertTriangle, Briefcase, BarChart, Bookmark, Eye, HandCoins, Mail, Send, Loader2 } from 'lucide-react';
import type { UserEvent, Event, Tour, Ticket as TicketType, Transaction } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

function DetailItem({ label, value }: { label: string, value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-start text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-right">{value}</span>
        </div>
    )
}

function UserActivityFeed({ activity }: { activity: UserEvent[] }) {
  const interactionIcons: Record<UserEvent['action'], React.ElementType> = {
    click_event: Eye,
    hover_event: BarChart,
    bookmark_event: Bookmark,
    share_event: Briefcase,
    start_checkout: HandCoins,
    abandon_checkout: Ticket,
  };

  const getInteractionText = (item: UserEvent) => {
    switch (item.action) {
        case 'click_event': return `Viewed event: ${item.eventId}`;
        case 'hover_event': return `Hovered over event ${item.eventId} for ${item.durationMs}ms`;
        case 'bookmark_event': return `Bookmarked event: ${item.eventId}`;
        case 'share_event': return `Shared event: ${item.eventId}`;
        case 'start_checkout': return `Started checkout for event: ${item.eventId}`;
        case 'abandon_checkout': return `Abandoned checkout for event: ${item.eventId}`;
        default: return 'Performed an action';
    }
  }

  if (activity.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No pre-transaction activity recorded.</p>
  }

  return (
    <ScrollArea className="h-64">
        <div className="space-y-6">
            {activity.map((item, index) => {
                const Icon = interactionIcons[item.action as UserEvent['action']];
                const timestamp = new Date(item.timestamp);
                return (
                    <div key={index} className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-grow">
                             <p className="font-medium text-sm">
                                {getInteractionText(item)}
                             </p>
                             <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(timestamp, { addSuffix: true })}
                             </p>
                        </div>
                    </div>
                )
            })}
        </div>
    </ScrollArea>
  )
}

function ResendEmailCard({ order, listingName }: { order: any; listingName: string; }) {
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);
    const [email, setEmail] = useState(order.userEmail);

    const handleResend = async () => {
        setIsSending(true);
        const result = await resendTicketEmail({ orderId: order.id, to: email, eventName: listingName });
        if (result.success) {
            toast({ title: "Email Sent!", description: `The ticket email has been sent to ${email}.` });
        } else {
            toast({ variant: 'destructive', title: 'Failed to Send', description: result.error });
        }
        setIsSending(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail/> Ticket Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Resend the ticket confirmation email to the customer. You can change the email address if needed.</p>
                <div className="flex gap-2">
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Recipient email" />
                    <Button onClick={handleResend} disabled={isSending}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TransactionDetailPage({ params }: { params: { id: string } }) {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getTransactionDetails(params.id).then(result => {
            if (result.success) {
                setDetails(result.data);
            } else {
                notFound();
            }
            setLoading(false);
        });
    }, [params.id]);

    if (loading) {
        return <div className="flex items-center justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!details) {
        notFound();
    }

    const { transaction, order, user, listing, tickets, userActivity } = details;
    const statusVariant = transaction.status === 'completed' ? 'default' : transaction.status === 'pending' ? 'secondary' : 'destructive';

    return (
        <div className="space-y-8">
            <Link href="/admin/transactions" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2" /> Back to Transactions
            </Link>
            
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">Transaction Details</h1>
                    <p className="text-muted-foreground font-mono">{transaction.id}</p>
                </div>
                 <Badge variant={statusVariant} className="text-base">
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                 </Badge>
            </div>

            {transaction.status === 'failed' && (
                 <Card className="border-destructive bg-destructive/10">
                    <CardHeader className="flex-row items-center gap-4">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <div>
                            <CardTitle className="text-destructive">Transaction Failed</CardTitle>
                            <CardDescription className="text-destructive/80">Reason: {transaction.failReason || 'Unknown error from provider.'}</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid gap-8">
                    <Card>
                        <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <DetailItem label="Amount" value={`Ksh ${transaction.amount.toLocaleString()}`} />
                            <DetailItem label="Method" value={transaction.method} />
                            <DetailItem label="M-Pesa Code" value={<span className="font-mono">{transaction.mpesaConfirmationCode || 'N/A'}</span>} />
                            <DetailItem label="Transaction Date" value={format(new Date(transaction.createdAt as any), 'PPpp')} />
                             <DetailItem label="Checkout Request ID" value={<span className="font-mono">{transaction.mpesaCheckoutRequestId || 'N/A'}</span>} />
                             <DetailItem label="Retry Count" value={transaction.retryCount} />
                        </CardContent>
                    </Card>
                    
                    {transaction.status === 'completed' && (
                         <Card>
                            <CardHeader><CardTitle>Tickets Purchased</CardTitle></CardHeader>
                            <CardContent>
                                {order.tickets && order.tickets.length > 0 ? (
                                    <ul className="space-y-2">
                                        {order.tickets.map((ticket: any, index: number) => (
                                            <li key={index} className="flex justify-between items-center text-sm p-2 bg-muted rounded-md">
                                                <p className="font-medium">{ticket.quantity}x {ticket.name}</p>
                                                <p>@ Ksh {ticket.price.toLocaleString()}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-center text-muted-foreground py-4">No tickets were generated for this order (e.g., booking-only payment).</p>
                                )}
                            </CardContent>
                        </Card>
                    )}


                     <Card>
                        <CardHeader><CardTitle>User's Journey</CardTitle><CardDescription>A timeline of the user's actions before this transaction was initiated.</CardDescription></CardHeader>
                        <CardContent>
                            <UserActivityFeed activity={userActivity} />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card>
                        <CardHeader className="flex-row items-center gap-4">
                            <User className="h-8 w-8 text-muted-foreground"/>
                            <div>
                                <CardTitle>Customer</CardTitle>
                                <CardDescription>{user?.email || 'N/A'}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                           <DetailItem label="Name" value={user?.name || 'Guest User'} />
                           <DetailItem label="Phone" value={order.userPhone} />
                           <DetailItem label="User ID" value={user ? <Link href={`/admin/users/${user.uid}`} className="font-mono text-xs hover:underline">{user.uid}</Link> : 'N/A'} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center gap-4">
                            <Ticket className="h-8 w-8 text-muted-foreground"/>
                            <div>
                                <CardTitle>Order Summary</CardTitle>
                                <CardDescription>Order ID: <span className="font-mono">{order.id.substring(0, 8)}...</span></CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <DetailItem label="Event" value={<Link href={`/${order.listingType}s/${listing.slug || listing.id}`} className="hover:underline">{listing.name}</Link>} />
                            {order.tickets.map((t: any, index: number) => (
                                <DetailItem key={index} label={`${t.quantity}x ${t.name}`} value={`Ksh ${t.price.toLocaleString()}`} />
                            ))}
                            <hr />
                            <DetailItem label="Subtotal" value={`Ksh ${order.subtotal.toLocaleString()}`} />
                            {order.discount > 0 && <DetailItem label="Discount" value={`-Ksh ${order.discount.toLocaleString()}`} />}
                            <DetailItem label="Fees" value={`Ksh ${(order.platformFee + order.processingFee).toLocaleString()}`} />
                             <DetailItem label="Total" value={`Ksh ${order.total.toLocaleString()}`} />
                        </CardContent>
                    </Card>

                    {transaction.status === 'completed' && <ResendEmailCard order={order} listingName={listing.name} />}
                </div>
            </div>
        </div>
    )
}
