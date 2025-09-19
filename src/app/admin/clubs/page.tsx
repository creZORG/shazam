
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getClubUsers } from "./actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import type { FirebaseUser } from "@/lib/types";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Slash, CheckCircle } from "lucide-react";
import { updateUserStatus } from "@/app/admin/users/[id]/actions";
import { useToast } from "@/hooks/use-toast";
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

type UserWithId = FirebaseUser & { id: string };

function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
        active: { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Active' },
        pending_review: { variant: 'secondary', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Pending' },
        suspended: { variant: 'destructive', className: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Suspended' },
    };
    const config = statusConfig[status] || { variant: 'outline', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: status };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
}

function ClubActions({ club, onStatusChange }: { club: UserWithId; onStatusChange: (userId: string, newStatus: 'active' | 'suspended') => void; }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const currentStatus = club.status || 'active';

    const handleStatusUpdate = (newStatus: 'active' | 'suspended') => {
        startTransition(async () => {
            const result = await updateUserStatus(club.id, newStatus);
            if (result.success) {
                toast({ title: "Status Updated", description: `${club.name}'s account has been ${newStatus}.`});
                onStatusChange(club.id, newStatus);
            } else {
                toast({ variant: 'destructive', title: "Update Failed", description: result.error });
            }
        });
    };

    return (
        <div className="flex gap-2 justify-end">
             <Link href={`/admin/users/${club.id}`}>
                <Button variant="outline" size="sm">Manage</Button>
            </Link>
             {currentStatus === 'active' ? (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin" /> : <Slash />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Suspend {club.name}?</AlertDialogTitle><AlertDialogDescription>This will prevent the user from logging in and accessing their club dashboard.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleStatusUpdate('suspended')} asChild>
                                <Button variant="destructive">Suspend</Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="default" size="sm" disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                         </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                         <AlertDialogHeader><AlertDialogTitle>Reactivate {club.name}?</AlertDialogTitle><AlertDialogDescription>This will restore the user's access to the platform.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleStatusUpdate('active')}>Reactivate</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}

export default function AdminClubsPage() {
    const [clubs, setClubs] = useState<UserWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchClubs = () => {
        setLoading(true);
        getClubUsers().then(result => {
            if (result.success && result.data) {
                setClubs(result.data as UserWithId[]);
            } else {
                setError(result.error || 'An unknown error occurred.');
            }
            setLoading(false);
        });
    }

    useEffect(() => {
        fetchClubs();
    }, []);

    const handleStatusChange = (userId: string, newStatus: 'active' | 'suspended') => {
        setClubs(currentClubs => currentClubs.map(c => c.id === userId ? { ...c, status: newStatus } : c));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Clubs</CardTitle>
                <CardDescription>Oversee all club accounts on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                ) : error ? (
                    <div className="text-center py-12 text-destructive"><p>{error}</p></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Club Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clubs.map(club => (
                                <TableRow key={club.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={club.profilePicture} />
                                            <AvatarFallback>{club.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {club.organizerName || club.name}
                                    </TableCell>
                                    <TableCell>{club.email}</TableCell>
                                    <TableCell>{club.createdAt ? format(new Date(club.createdAt), 'PP') : 'N/A'}</TableCell>
                                    <TableCell><StatusBadge status={club.status || 'active'} /></TableCell>
                                    <TableCell>
                                        <ClubActions club={club} onStatusChange={handleStatusChange} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                 {!loading && clubs && clubs.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No club accounts found.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}
