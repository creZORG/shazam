
'use client';

import { notFound, useRouter } from 'next/navigation';
import { getTransactionDetails, updateTicketStatus } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, User, Ticket, Calendar, AlertTriangle, Briefcase, BarChart, Bookmark, Eye, HandCoins, Mail, Send, Loader2, Ban, CheckCircle, TicketX } from 'lucide-react';
import type { Ticket as TicketType, Transaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function DetailItem({ label, value }: { label: string, value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-start text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold text-right">{value}</span>
        </div>
    )
}

function TicketActions({ ticket, onStatusChange }: { ticket: TicketType & { id: string }, onStatusChange: () => void }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const isVoidable = ticket.status === 'valid' || ticket.status === 'used';
    const newStatus = isVoidable ? 'invalid' : 'valid';

    const handleUpdate = () => {
        startTransition(async () => {
            const result = await updateTicketStatus(ticket.id as string, newStatus);
            if (result.success) {
                toast({ title: 'Ticket Status Updated' });
                onStatusChange();
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
            }
        });
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant={isVoidable ? "destructive" : "default"} size="sm" disabled={isPending}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isVoidable ? <TicketX className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will mark the ticket as <span className="font-bold">{newStatus}</span> and send an email notification to the user. This action can be reversed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUpdate}>Yes, update status</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


export default function TransactionDetailPage({ params }: { params: { id: string } }) {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchDetails = () => {
        getTransactionDetails(params.id).then(result => {
            if (result.success) {
                setDetails(result.data);
            } else {
                notFound();
            }
            setLoading(false);
        });
    }

    useEffect(() => {
        fetchDetails();
    }, [params.id]);

    if (loading) {
        return <div className="flex items-center justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!details) {
        notFound();
    }

    const { transaction, order, user, listing, tickets } = details;
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
                 <Badge variant={statusVariant} className="text-base capitalize">
                    {transaction.status}
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
                    
                    {tickets && tickets.length > 0 && (
                        <Card>
                             <CardHeader><CardTitle>Tickets Generated</CardTitle></CardHeader>
                             <CardContent>
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Attendee</TableHead>
                                            <TableHead>Ticket Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tickets.map((ticket: TicketType & { id: string }) => (
                                            <TableRow key={ticket.id}>
                                                <TableCell>{ticket.userName}</TableCell>
                                                <TableCell>{ticket.ticketType}</TableCell>
                                                <TableCell><Badge variant={ticket.status === 'valid' ? 'default' : 'secondary'} className="capitalize">{ticket.status}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <TicketActions ticket={ticket} onStatusChange={fetchDetails} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                 </Table>
                             </CardContent>
                        </Card>
                    )}

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
                </div>
            </div>
        </div>
    )
}
