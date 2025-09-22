
'use client';

import { notFound, useRouter } from 'next/navigation';
import { getUserById, updateUserRole, updateUserStatus, getUserActivity } from './actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, CheckCircle, Edit, Shield, Slash, User, XCircle, BarChart, Bookmark, Eye, HandCoins, Ticket, Briefcase, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FirebaseUser, Order, UserEvent, UserRole } from '@/lib/types';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

const roleOptions: UserRole[] = ['attendee', 'organizer', 'influencer', 'club', 'verifier', 'admin', 'super-admin', 'developer'];

function UserActions({ user, onStatusChange }: { user: FirebaseUser & { id: string }, onStatusChange: (newStatus: 'active' | 'suspended') => void }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleStatusUpdate = (newStatus: 'active' | 'suspended') => {
        startTransition(async () => {
            const result = await updateUserStatus(user.id, newStatus);
            if(result.success) {
                toast({ title: 'Status Updated', description: `${user.name}'s account has been ${newStatus}.`});
                onStatusChange(newStatus);
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
            }
        });
    };

    return (
        <div className="flex gap-4">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={user.status === 'suspended' || isPending}>
                        {isPending && user.status === 'active' ? <Loader2 className="mr-2 animate-spin"/> : <Slash className="mr-2" />}
                         Suspend Account
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to suspend this account?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will prevent the user from logging in and accessing any part of the platform. This action can be reversed.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleStatusUpdate('suspended')}>
                        Yes, Suspend
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="default" disabled={user.status === 'active' || isPending}>
                        {isPending && user.status === 'suspended' ? <Loader2 className="mr-2 animate-spin"/> : <CheckCircle className="mr-2" />}
                        Reactivate Account
                    </Button>
                </AlertDialogTrigger>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to reactivate this account?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will restore the user's access to the platform.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleStatusUpdate('active')}>
                       Yes, Reactivate
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function RoleManager({ user, onRoleChange }: { user: FirebaseUser & { id: string }, onRoleChange: (newRole: UserRole) => void }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);

    const handleRoleUpdate = () => {
        startTransition(async () => {
            const result = await updateUserRole(user.id, selectedRole);
            if (result.success) {
                toast({ title: 'Role Updated', description: `${user.name}'s role has been set to ${selectedRole}.`});
                onRoleChange(selectedRole);
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
            }
        });
    }

    return (
        <div className="flex items-end gap-2">
            <div className="flex-grow">
                 <label htmlFor="role-select" className="text-sm font-medium">Role</label>
                <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                    <SelectTrigger id="role-select">
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        {roleOptions.map(role => (
                            <SelectItem key={role} value={role} className="capitalize">{role.replace('-', ' ')}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleRoleUpdate} disabled={isPending || selectedRole === user.role}>
                {isPending && <Loader2 className="mr-2 animate-spin"/>}
                Update Role
            </Button>
        </div>
    )
}

function UserActivityFeed({ interactions }: { interactions: UserEvent[] }) {

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
        case 'click_event': return `Viewed event`;
        case 'hover_event': return `Hovered over event for ${item.durationMs}ms`;
        case 'bookmark_event': return `Bookmarked event`;
        case 'share_event': return `Shared event`;
        case 'start_checkout': return `Started checkout`;
        case 'abandon_checkout': return `Abandoned checkout`;
        default: return 'Performed an action';
    }
  }

  return (
    <ScrollArea className="h-96">
        <div className="space-y-6">
            {interactions.map((item, index) => {
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
                                For Event: <Link href={`/events/${item.eventId}`} className="hover:underline">{item.eventId}</Link>
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

function TransactionHistory({ orders }: { orders: Order[] }) {
    return (
        <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium truncate max-w-48">{order.listingId}</TableCell>
                            <TableCell>Ksh {order.total.toLocaleString()}</TableCell>
                            <TableCell><Badge variant={order.status === 'completed' ? 'default' : 'destructive'}>{order.status}</Badge></TableCell>
                            <TableCell>{format(new Date(order.createdAt as string), 'PPp')}</TableCell>
                            <TableCell className="text-right">
                                <Link href={`/admin/transactions/${order.id}`}>
                                    <Button variant="outline" size="sm">View</Button>
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    )
}

export default function UserManagementPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<(FirebaseUser & {id: string}) | null>(null);
  const [activity, setActivity] = useState<{ orders: Order[], interactions: UserEvent[] }>({ orders: [], interactions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUserById(params.id),
      getUserActivity(params.id)
    ]).then(([userResult, activityResult]) => {
      if (userResult.success && userResult.data) {
        setUser(userResult.data as FirebaseUser & { id: string });
      } else {
        notFound();
      }
      if (activityResult.success && activityResult.data) {
        setActivity(activityResult.data);
      }
      setLoading(false);
    });
  }, [params.id]);


  const statusConfig = {
      active: { icon: CheckCircle, color: 'text-green-500', label: 'Active' },
      suspended: { icon: XCircle, color: 'text-red-500', label: 'Suspended' },
      pending_review: { icon: Edit, color: 'text-blue-500', label: 'Pending Review' },
  };
  
  if (loading || !user) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const userStatus = user.status || 'active';
  const StatusIcon = statusConfig[userStatus].icon;


  return (
    <div className="space-y-8">
        <Link href="/admin/users" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2" /> Back to All Users
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                 <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={user.profilePicture} />
                                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl">{user.name}</CardTitle>
                                <CardDescription>{user.email}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">User ID</span>
                            <span className="font-mono text-xs">{user.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Joined</span>
                            <span>{user.createdAt ? format(new Date(user.createdAt), 'PP') : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Login</span>
                             <span>{user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Role</span>
                            <Badge variant="secondary" className="capitalize">{user.role.replace('-', ' ')}</Badge>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant="outline" className={`flex items-center gap-2 ${statusConfig[userStatus].color} border-current/30 bg-current/10`}>
                                <StatusIcon className="h-4 w-4" />
                                {statusConfig[userStatus].label}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Shield className="mr-2" /> Account Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <RoleManager user={user} onRoleChange={(newRole) => setUser(u => u ? { ...u, role: newRole } : null)} />
                        <UserActions user={user} onStatusChange={(newStatus) => setUser(u => u ? { ...u, status: newStatus } : null)} />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><User className="mr-2" /> User Activity</CardTitle>
                        <CardDescription>A chronological feed of this user's interactions with the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="activity" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="activity">General Activity</TabsTrigger>
                                <TabsTrigger value="transactions">Transaction History</TabsTrigger>
                            </TabsList>
                            <TabsContent value="activity" className="pt-4">
                                {activity.interactions.length > 0 ? (
                                    <UserActivityFeed interactions={activity.interactions} />
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No general activity recorded for this user yet.</p>
                                    </div>
                                )}
                            </TabsContent>
                            <TabsContent value="transactions" className="pt-4">
                                {activity.orders.length > 0 ? (
                                    <TransactionHistory orders={activity.orders} />
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No transactions recorded for this user yet.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                 </Card>
            </div>
        </div>

    </div>
  );
}
