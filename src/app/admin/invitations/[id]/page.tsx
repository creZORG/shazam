
'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getInvitationDetails } from './actions';
import type { Invitation, UserEvent, AuditLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Mail, Shield, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    const id = params.id as string;
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [loading, setLoading] = useState(true);

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

    if (loading || !invitation) {
        return <div className="flex justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
    }

    const statusConfig = {
        pending: { icon: Clock, color: 'text-blue-500', label: 'Pending' },
        accepted: { icon: CheckCircle, color: 'text-green-500', label: 'Accepted' },
    };

    const StatusIcon = statusConfig[invitation.status].icon;

    return (
        <div className="space-y-8">
            <Link href="/admin/users" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to User Management
            </Link>

            <div>
                <h1 className="text-3xl font-bold">Invitation Details</h1>
                <p className="text-muted-foreground font-mono text-xs">{invitation.id}</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invitation Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <DetailItem label="Status" value={
                                <Badge variant={invitation.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
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
                                    <AvatarImage src={invitation.acceptedBy.photoURL} />
                                    <AvatarFallback>{invitation.acceptedBy.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold">{invitation.acceptedBy.name}</p>
                                    <p className="text-sm text-muted-foreground">{invitation.acceptedBy.email}</p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/admin/users/${invitation.acceptedBy.uid}`} className="w-full">
                                    <Button variant="outline" className="w-full">View User Profile</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    )}
                </div>
                
                 <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>A log of actions related to this invitation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <p className="text-center py-20 text-muted-foreground">
                                Activity tracking for invitations is coming soon.
                             </p>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
    );
}
