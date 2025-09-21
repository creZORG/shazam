
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, Loader2, FileText, AlertTriangle, Eye, Settings, Banknote } from "lucide-react";
import { useState, useEffect, useTransition } from 'react';
import { getPayoutRequests, updatePayoutStatus } from './actions';
import type { PayoutRequestWithUser } from './actions';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

function ProcessPayoutDialog({ request, onActionComplete }: { request: PayoutRequestWithUser, onActionComplete: () => void }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);

    const [amountDisbursed, setAmountDisbursed] = useState(request.amountRequested.toString());
    const [processorMessage, setProcessorMessage] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    const handleAction = () => {
        startTransition(async () => {
            let result;
            if (action === 'approve') {
                if (!amountDisbursed || !processorMessage) {
                    toast({ variant: 'destructive', title: 'Missing Info', description: 'Amount and confirmation code are required.'});
                    return;
                }
                result = await updatePayoutStatus({
                    requestId: request.id,
                    status: 'accepted',
                    amountDisbursed: Number(amountDisbursed),
                    processorMessage: processorMessage
                });
            } else if (action === 'reject') {
                if (!rejectionReason) {
                    toast({ variant: 'destructive', title: 'Missing Info', description: 'Rejection reason is required.'});
                    return;
                }
                result = await updatePayoutStatus({
                    requestId: request.id,
                    status: 'rejected',
                    rejectionReason: rejectionReason
                });
            } else {
                return;
            }

            if (result.success) {
                toast({ title: 'Success', description: `Payout request has been ${action === 'approve' ? 'approved' : 'rejected'}.` });
                onActionComplete();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Process Payout for {request.userName}</DialogTitle>
                <DialogDescription>Review earnings audit and confirm the action.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Request Details</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-2">
                             <p><strong>Amount Requested:</strong> Ksh {request.amountRequested.toLocaleString()}</p>
                             <p><strong>Recipient:</strong> {request.payoutDetails.fullName}</p>
                             <p><strong>M-Pesa Number:</strong> {request.payoutDetails.mpesaNumber}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Earnings Audit</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Source</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {request.earningsAudit.map(audit => (
                                        <TableRow key={audit.sourceId}>
                                            <TableCell className="text-xs">{audit.sourceName}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">Ksh {audit.amount.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                 <div className="space-y-4">
                    <Tabs value={action || ''} onValueChange={(value) => setAction(value as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="approve">Approve</TabsTrigger>
                            <TabsTrigger value="reject">Reject</TabsTrigger>
                        </TabsList>
                        <TabsContent value="approve" className="space-y-4 pt-4">
                             <div className="space-y-2">
                                <Label htmlFor="amount-disbursed">Amount Disbursed</Label>
                                <Input id="amount-disbursed" type="number" value={amountDisbursed} onChange={e => setAmountDisbursed(e.target.value)} />
                             </div>
                              <div className="space-y-2">
                                <Label htmlFor="confirmation-code">Confirmation Code</Label>
                                <Input id="confirmation-code" placeholder="e.g., QBC123XYZ" value={processorMessage} onChange={e => setProcessorMessage(e.target.value)} />
                             </div>
                             <Button onClick={handleAction} disabled={isPending} className="w-full">
                                {isPending ? <Loader2 className="animate-spin" /> : <Check />} Approve Payout
                             </Button>
                        </TabsContent>
                        <TabsContent value="reject" className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                                <Textarea id="rejection-reason" placeholder="e.g., Incorrect payment details." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                             </div>
                             <Button onClick={handleAction} variant="destructive" disabled={isPending} className="w-full">
                                 {isPending ? <Loader2 className="animate-spin" /> : <X />} Reject Payout
                             </Button>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
             <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    )
}

export default function AdminPayoutsPage() {
    const [payouts, setPayouts] = useState<PayoutRequestWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPayouts = () => {
        setLoading(true);
        getPayoutRequests().then(result => {
            if (result.success && result.data) {
                setPayouts(result.data);
            } else {
                setError(result.error || 'Failed to load data.');
            }
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchPayouts();
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
                                {req.status === 'pending' && (
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm">Process</Button>
                                        </DialogTrigger>
                                        <ProcessPayoutDialog request={req} onActionComplete={fetchPayouts} />
                                    </Dialog>
                                )}
                                {req.status !== 'pending' && <p className="text-xs text-muted-foreground">Processed</p>}
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
