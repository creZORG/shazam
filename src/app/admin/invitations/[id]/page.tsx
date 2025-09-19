
'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { getInvitationDetails, voidInvitation } from './actions';
import type { Invitation, UserEvent, AuditLog, PromocodeClick } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Mail, Shield, Calendar, Clock, CheckCircle, XCircle, MousePointerClick, Globe, Ban } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type InvitationWithActivity = Invitation & { activity?: PromocodeClick[] };

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm py-2 border-b">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

export default function InvitationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const id = params.id as string;
    const [invitation, setInvitation] = useState<InvitationWithActivity | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (id) {
            getInvitationDetails(id).then(result => {
                if (result.success && result.data) {
                    setInvitation(result.data);
                } else {
                    notFound();
                }
                setLoading(false);
            });
        }
    }, [id]);

    const handleVoidInvite = () => {
        startTransition(async () => {
            const result = await voidInvitation(id);
            if (result.success) {
                toast({ title: "Invitation Voided", description: "This invitation link is no longer valid." });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: "Error", description: result.error });
            }
        });
    }

    if (loading || !invitation) {
        return <div className="flex justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
    }

    const statusConfig = {
        pending: { icon: Clock, color: 'text-blue-500', label: 'Pending' },
        accepted: { icon: CheckCircle, color: 'text-green-500', label: 'Accepted' },
        void: { icon: XCircle, color: 'text-red-500', label: 'Void' },
    };

    const StatusIcon = statusConfig[invitation.status]?.icon || Clock;
    const totalClicks = invitation.activity?.length || 0;

    return (
        <div className="space-y-8">
            <Link href="/admin/users?tab=invites" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to User Management
            </Link>

            <div>
                <h1 className="text-3xl font-bold">Invitation Details</h1>
                <p className="text-muted-foreground font-mono text-xs">{invitation.id}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Clicks" value={totalClicks} icon={MousePointerClick} />
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invitation Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <DetailItem label="Status" value={
                                <Badge variant={invitation.status === 'pending' ? 'secondary' : invitation.status === 'void' ? 'destructive' : 'default'} className="capitalize">
                                    <StatusIcon className="mr-2" />
                                    {invitation.status}
                                </Badge>
                            } />
                            <DetailItem label="Invited Email" value={invitation.email || 'Generic (any email)'} />
                            <DetailItem label="Assigned Role" value={<span className="capitalize font-bold">{invitation.role}</span>} />
                            <DetailItem label="For Event" value={invitation.listingName || 'All Events'} />
                            <DetailItem label="Created" value={format(new Date(invitation.createdAt), 'PPp')} />
                            <DetailItem label="Expires" value={format(new Date(invitation.expiresAt), 'PPp')} />
                        </CardContent>
                    </Card>

                    {invitation.status === 'accepted' && invitation.acceptedBy && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Accepted By</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={(invitation.acceptedBy as any).photoURL} />
                                    <AvatarFallback>{(invitation.acceptedBy as any).name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold">{(invitation.acceptedBy as any).name}</p>
                                    <p className="text-sm text-muted-foreground">{(invitation.acceptedBy as any).email}</p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/admin/users/${(invitation.acceptedBy as any).uid}`} className="w-full">
                                    <Button variant="outline" className="w-full">View User Profile</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    )}

                    {invitation.status === 'pending' && (
                        <Card>
                            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                            <CardContent>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full" disabled={isPending}>
                                            {isPending ? <Loader2 className="animate-spin" /> : <Ban className="mr-2" />}
                                            Void Invitation
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently invalidate this invitation link. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleVoidInvite}>Confirm Void</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    )}
                </div>
                
                 <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>A log of all clicks on this invitation link.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {invitation.activity && invitation.activity.length > 0 ? (
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>IP Address</TableHead>
                                            <TableHead>Device/Browser</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invitation.activity.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell title={format(new Date(log.timestamp), 'PPpp')}>
                                                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{log.userAgent}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                 </Table>
                             ) : (
                                <p className="text-center py-20 text-muted-foreground">
                                    No link clicks recorded yet.
                                </p>
                             )}
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
    );
}
