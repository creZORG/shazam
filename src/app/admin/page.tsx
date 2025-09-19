

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, Ticket, DollarSign } from "lucide-react";
import { getAdminDashboardData } from "./actions";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "./_components/RevenueChart";

async function AdminDashboardPage() {
    const { data, error } = await getAdminDashboardData();

    if (error || !data) {
        return <p className="text-destructive">Error: {error || "Could not load dashboard data."}</p>
    }

    const { totalUsers, totalRevenue, totalEvents, recentUsers, recentOrders, salesChartData } = data;
    
    const stats = [
        { title: "Total Revenue", value: `Ksh ${totalRevenue.toLocaleString()}`, icon: DollarSign },
        { title: "Total Users", value: totalUsers.toLocaleString(), icon: Users },
        { title: "Total Events", value: totalEvents.toLocaleString(), icon: Ticket },
    ];

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map(stat => (
                <Card key={stat.title}>
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
        
        <div className="grid lg:grid-cols-5 gap-8">
            <Card className="lg:col-span-3">
                <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>A look at total sales across the platform.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <RevenueChart data={salesChartData} />
                </CardContent>
            </Card>
             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>The latest transactions on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Event</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.userName}</TableCell>
                                    <TableCell>Ksh {order.total.toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-muted-foreground truncate max-w-[100px]">{order.listingType}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Newest Users</CardTitle>
                <CardDescription>A list of the latest users to join the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                             <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentUsers.map(user => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium flex items-center gap-2">
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.profilePicture} />
                                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {user.name}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell className="capitalize">{user.role}</TableCell>
                                <TableCell>{format(new Date(user.createdAt), 'PP')}</TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/admin/users/${user.uid}`}>
                                        <Button variant="outline" size="sm">Manage</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

    </div>
  );
}

export default AdminDashboardPage;
