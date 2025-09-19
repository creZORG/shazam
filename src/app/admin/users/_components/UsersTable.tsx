
'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FirebaseUser } from "@/lib/types";
import { format } from 'date-fns';
import Link from "next/link";
import { cn } from "@/lib/utils";

type UserWithId = FirebaseUser & { id: string };

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
    active: { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Active' },
    pending_review: { variant: 'secondary', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Pending' },
    suspended: { variant: 'destructive', className: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Suspended' },
};

function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || { variant: 'outline', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: status };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
}


export function UsersTable({ users }: { users: UserWithId[] }) {
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No users found in this category.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead className="hidden md:table-cell">Email</TableHead>
          <TableHead className="hidden lg:table-cell">Joined</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.profilePicture} alt={user.name} />
                  <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground md:hidden">{user.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">{user.email}</TableCell>
            <TableCell className="hidden lg:table-cell">
              {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
            </TableCell>
             <TableCell>
                <Badge variant="outline" className="capitalize">{user.role.replace('-', ' ')}</Badge>
            </TableCell>
            <TableCell>
                <StatusBadge status={user.status || 'active'} />
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/admin/users/${user.id}`}>
                <Button variant="outline" size="sm">Manage</Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
