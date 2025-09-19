

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, MousePointerClick, Ticket, Banknote } from "lucide-react";
import Link from "next/link";
import { getInfluencerStats } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function InfluencerOverviewPage() {
  const { data: stats, error } = await getInfluencerStats();

  const statCards = [
    { title: "Total Earnings", value: `Ksh ${stats?.totalEarnings.toLocaleString() || 0}`, icon: DollarSign },
    { title: "Tickets Sold", value: stats?.ticketsSold.toLocaleString() || 0, icon: Ticket },
    { title: "Available For Payout", value: `Ksh ${stats?.availableForPayout.toLocaleString() || 0}`, icon: Banknote, primary: true },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Overview</h1>
        <Link href="/influencer/campaigns">
            <Button>View Campaigns</Button>
        </Link>
      </div>

       {error && !error.includes('authenticated') && (
            <Alert variant="destructive" className="mb-8">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Could not load stats</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
       )}

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className={stat.primary ? "border-primary" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>A quick look at your most recent campaign assignments.</CardDescription>
        </CardHeader>
        <CardContent>
           {stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event/Tour</TableHead>
                  <TableHead>Your Code</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Uses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentCampaigns.map(campaign => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.listingName}</TableCell>
                    <TableCell><Badge variant="secondary">{campaign.code}</Badge></TableCell>
                    <TableCell>{campaign.commissionType === 'percentage' ? `${campaign.commissionValue}%` : `Ksh ${campaign.commissionValue}`}</TableCell>
                    <TableCell>{campaign.usageCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-12">You haven't been assigned to any campaigns yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
