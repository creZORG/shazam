
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOrganizerPayoutHistory, getOrganizerPayoutStats, requestOrganizerPayout } from "./actions";
import { AlertCircle, FileText, Loader2, DollarSign, Wallet, Banknote, HelpCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState, useTransition } from "react";
import type { PayoutRequest } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useOtpVerification } from '@/hooks/use-otp-verification';
import { Separator } from "@/components/ui/separator";

type PayoutStatus = PayoutRequest['status'];

const statusConfig: Record<PayoutStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
    pending: { variant: 'secondary', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Pending' },
    accepted: { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Accepted' },
    partially_accepted: { variant: 'default', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Partial' },
    rejected: { variant: 'destructive', className: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Rejected' },
};

function StatusBadge({ status }: { status: PayoutStatus }) {
    const config = statusConfig[status] || { variant: 'outline', className: '', label: status };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
}

function PayoutRequestModal({ availableBalance, fullName, mpesaNumber }: { availableBalance: number, fullName: string, mpesaNumber: string }) {
    const { toast } = useToast();
    const { requestVerification } = useOtpVerification();
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleRequest = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid amount', description: 'Please enter a valid amount to withdraw.'});
            return;
        }
        if (numAmount > availableBalance) {
             toast({ variant: 'destructive', title: 'Insufficient funds', description: `You can only withdraw up to Ksh ${availableBalance}.`});
            return;
        }
        
        if (!user?.email) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'User email not found.' });
            return;
        }
        
        const isVerified = await requestVerification(user.email);
        if (!isVerified) {
            toast({ variant: 'destructive', title: 'Verification Cancelled', description: 'Payout request was not submitted.'});
            return;
        }

        startTransition(async () => {
            const result = await requestOrganizerPayout(numAmount);
            if (result.success) {
                toast({ title: 'Request Sent!', description: 'Your payout request has been submitted for review.'});
            } else {
                 toast({ variant: 'destructive', title: 'Request Failed', description: result.error});
            }
        });
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Request a Payout</DialogTitle>
                <DialogDescription>
                    Your funds will be sent to the M-Pesa number on your profile within 24-48 hours of approval.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="p-4 border rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground">Confirm your payout details:</p>
                    <p><strong>Full Name:</strong> {fullName}</p>
                    <p><strong>M-Pesa Number:</strong> {mpesaNumber}</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="amount">Amount to Withdraw (Ksh)</Label>
                    <Input id="amount" type="number" placeholder={`e.g. 5000`} value={amount} onChange={e => setAmount(e.target.value)} max={availableBalance} />
                    <p className="text-xs text-muted-foreground">Available for Payout: Ksh {availableBalance.toLocaleString()}</p>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost" disabled={isPending}>Cancel</Button></DialogClose>
                <Button onClick={handleRequest} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 animate-spin" />}
                    Submit Request
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}


export default function OrganizerPayoutsPage() {
    const { dbUser, user, loading: authLoading } = useAuth();
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            setLoading(true);
            Promise.all([getOrganizerPayoutHistory(), getOrganizerPayoutStats()]).then(([payoutsResult, statsResult]) => {
                let errors: string[] = [];
                if (payoutsResult.success && payoutsResult.data) {
                    setPayouts(payoutsResult.data);
                } else if (payoutsResult.error) {
                    errors.push(payoutsResult.error);
                }
                if (statsResult.success && statsResult.data) {
                    setStats(statsResult.data);
                } else if (statsResult.error) {
                    errors.push(statsResult.error);
                }

                if(errors.length > 0) {
                    setError(errors.join(' '));
                }

            }).finally(() => setLoading(false));
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Payouts</h1>
            <Dialog>
                <DialogTrigger asChild>
                    <Button disabled={authLoading || !stats || stats.availableForPayout <= 0}>Request Payout</Button>
                </DialogTrigger>
                {stats && dbUser && <PayoutRequestModal availableBalance={stats.availableForPayout} fullName={dbUser.organizerName || dbUser.name || ''} mpesaNumber={dbUser.phone || ''} />}
            </Dialog>
        </div>

        {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Data</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">Ksh {loading ? <Loader2 className="animate-spin" /> : (stats?.netRevenue || 0).toLocaleString()}</div><p className="text-xs text-muted-foreground">After all fees and payouts.</p></CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">Ksh {loading ? <Loader2 className="animate-spin" /> : (stats?.pendingAmount || 0).toLocaleString()}</div></CardContent>
            </Card>
            <Card className="border-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available for Withdrawal</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-primary">Ksh {loading ? <Loader2 className="animate-spin" /> : (stats?.availableForPayout || 0).toLocaleString()}</div></CardContent>
            </Card>
        </div>
        
        <Card className="bg-muted/30">
            <CardHeader><CardTitle>Earnings Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center"><p>Gross Revenue from Ticket Sales:</p><p className="font-medium">Ksh {(stats?.totalRevenue || 0).toLocaleString()}</p></div>
                <div className="flex justify-between items-center"><p className="text-muted-foreground">(-) Platform Fees:</p><p className="font-medium text-muted-foreground">- Ksh {(stats?.naksyetuFee || 0).toLocaleString()}</p></div>
                <div className="flex justify-between items-center"><p className="text-muted-foreground">(-) Influencer Commissions Paid:</p><p className="font-medium text-muted-foreground">- Ksh {(stats?.influencerPayouts || 0).toLocaleString()}</p></div>
                {stats?.processingFee > 0 && <div className="flex justify-between items-center"><p className="text-muted-foreground">(-) Payment Processing Fees:</p><p className="font-medium text-muted-foreground">- Ksh {(stats?.processingFee || 0).toLocaleString()}</p></div>}
                <Separator className="my-2" />
                <div className="flex justify-between items-center text-base"><p className="font-semibold">Net Earnings:</p><p className="font-semibold">Ksh {(stats?.netRevenue || 0).toLocaleString()}</p></div>
                 <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground"><HelpCircle className="h-4 w-4"/><span>This breakdown is based on all completed sales for your listings.</span></div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Payout History</CardTitle></CardHeader>
            <CardContent className="relative w-full overflow-auto">
            {loading ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : !error && payouts.length > 0 ? (
                 <Table>
                    <TableHeader><TableRow><TableHead>Date Requested</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Processed</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                            <TableCell>{format(new Date(payout.requestedAt as string), 'PPp')}</TableCell>
                            <TableCell>Ksh {payout.amountRequested.toLocaleString()}</TableCell>
                            <TableCell><StatusBadge status={payout.status} /></TableCell>
                            <TableCell className="text-right">{payout.processedAt ? formatDistanceToNow(new Date(payout.processedAt), { addSuffix: true}) : 'N/A'}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mt-4">No payout history</h3>
                    <p className="text-muted-foreground mt-2">
                    When you receive a payout, it will appear here.
                    </p>
                </div>
            )}
            </CardContent>
            {payouts && payouts.length > 0 && (
                <CardFooter>
                    <p className="text-xs text-muted-foreground">
                        All payouts are processed via M-Pesa.
                    </p>
                </CardFooter>
            )}
        </Card>
    </div>
  );
}
