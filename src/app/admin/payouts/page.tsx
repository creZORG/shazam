
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, Loader2, FileText, AlertTriangle } from "lucide-react";
import { useState, useEffect, useTransition } from 'react';
import { getPayoutRequests, updatePayoutStatus } from './actions';
import type { PayoutRequestWithUser } from './actions';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

type PayoutStatus = 'pending' | 'accepted' | 'rejected' | 'partially_accepted';

const statusConfig: Record<PayoutStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
    pending: { variant: 'secondary', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Pending' },
    accepted: { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Accepted' },
    rejected: { variant: 'destructive', className: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Rejected' },
    partially_accepted: { variant: 'outline', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Partial'},
};

function StatusBadge({ status }: { status: PayoutStatus }) {
    const config = statusConfig[status] || { variant: 'outline', className: '', label: status };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
}

function PayoutActions({ request }: { request: PayoutRequestWithUser }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [rejectionReason, setRejectionReason] = useState('');

    const handleAction = (status: 'accepted' | 'rejected') => {
        if (status === 'rejected' && !rejectionReason) {
            toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a reason for rejection.' });
            return;
        }

        startTransition(async () => {
            const result = await updatePayoutStatus(request.id, status, rejectionReason);
            if (result.success) {
                toast({ title: 'Success', description: `Payout request has been ${status}.` });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }

    if (request.status !== 'pending') return null;

    return (
        <div className="flex gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="sm" variant="default" disabled={isPending}>
                        <Check className="mr-2" />Approve
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Payout Approval</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to approve a payout of Ksh {request.amountRequested.toLocaleString()} to {request.userName} ({request.payoutDetails.mpesaNumber}). This action should only be taken after the M-Pesa transaction has been successfully completed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('accepted')}>
                            {isPending ? <Loader2 className="animate-spin" /> : "Confirm Approval"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
                 <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={isPending}>
                        <X className="mr-2" />Reject
                    </Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Payout Request</AlertDialogTitle>
                        <AlertDialogDescription>Please provide a reason for rejecting this payout. This will be visible to the user.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Input placeholder="e.g., Bank details incorrect" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('rejected')}>
                             {isPending ? <Loader2 className="animate-spin" /> : "Confirm Rejection"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default function AdminPayoutsPage() {
    const [payouts, setPayouts] = useState<PayoutRequestWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        getPayoutRequests().then(result => {
            if (result.success && result.data) {
                setPayouts(result.data);
            } else {
                setError(result.error || 'Failed to load data.');
            }
            setLoading(false);
        });
    }, []);

    const renderTable = (data: PayoutRequestWithUser[]) => {
        if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>
        if (error) return <p className="text-center text-destructive py-12">{error}</p>
        if (data.length === 0) return <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-4"><FileText className="h-12 w-12" /><p>No requests in this category.</p></div>

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>M-Pesa Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(req => (
                        <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.userName}</TableCell>
                            <TableCell>Ksh {req.amountRequested.toLocaleString()}</TableCell>
                            <TableCell>{req.payoutDetails.mpesaNumber}</TableCell>
                            <TableCell>{format(new Date(req.requestedAt as string), 'PPp')}</TableCell>
                            <TableCell><StatusBadge status={req.status as PayoutStatus} /></TableCell>
                            <TableCell className="text-right">
                                <PayoutActions request={req} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }
    
    const pending = payouts.filter(p => p.status === 'pending');
    const history = payouts.filter(p => p.status !== 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Payouts</CardTitle>
        <CardDescription>Review and process payout requests from organizers and influencers.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending"><Clock className="mr-2" />Pending ({pending.length})</TabsTrigger>
                <TabsTrigger value="history"><FileText className="mr-2" />History ({history.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4">
                {renderTable(pending)}
            </TabsContent>
            <TabsContent value="history" className="mt-4">
                {renderTable(history)}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
