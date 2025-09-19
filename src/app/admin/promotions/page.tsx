
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useTransition } from "react";
import { getPromocodesByOrganizer } from "@/app/organizer/promocodes/actions";
import { getGeneralTrackingLinks } from "./actions";
import type { Promocode, TrackingLink } from "@/lib/types";
import { Link as LinkIcon, PlusCircle, Copy, Eye, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import Link from 'next/link';

function AllPromotionsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [promocodes, setPromocodes] = useState<Promocode[]>([]);
    const [generalLinks, setGeneralLinks] = useState<TrackingLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [host, setHost] = useState('');
    const [protocol, setProtocol] = useState('');

     useEffect(() => {
        if (typeof window !== 'undefined') {
            setHost(window.location.host);
            setProtocol(window.location.protocol);
        }
    }, []);

    useEffect(() => {
        if(user?.uid) {
            setLoading(true);
            Promise.all([
                getPromocodesByOrganizer(user.uid),
                getGeneralTrackingLinks()
            ]).then(([promocodesRes, generalLinksRes]) => {
                if (promocodesRes.success && promocodesRes.data) {
                    setPromocodes(promocodesRes.data);
                }
                 if (generalLinksRes.success && generalLinksRes.data) {
                    setGeneralLinks(generalLinksRes.data);
                }
                setLoading(false);
            })
        }
    }, [user?.uid]);

    const handleCopyLink = (shortId: string) => {
        const fullLink = `${protocol}//${host}/l/${shortId}`;
        navigator.clipboard.writeText(fullLink);
        toast({ title: 'Link Copied!' });
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin" /></div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Campaign Tracking Links</CardTitle>
                <CardDescription>An overview of all general and promocode-specific tracking links you have created.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 <div>
                    <h3 className="font-semibold mb-2">General Links (No Promocode)</h3>
                     <Card>
                        <CardContent className="p-0">
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Link Name</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Clicks</TableHead>
                                        <TableHead>Purchases</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {generalLinks.map(link => (
                                        <TableRow key={link.id}>
                                            <TableCell className="font-medium">{link.name}</TableCell>
                                            <TableCell className="text-muted-foreground truncate max-w-xs"><a href={link.longUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{link.longUrl}</a></TableCell>
                                            <TableCell>{link.clicks}</TableCell>
                                            <TableCell>{link.purchases}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Link href={`/admin/promotions/${link.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                                                    </Link>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(link.shortId)}><Copy className="h-4 w-4"/></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                           {generalLinks.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No general tracking links created yet.</p>}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    )
}


export default function AdminPromotionsPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Promotional Tools</h1>
                <Link href="/admin/promotions/create">
                    <Button><PlusCircle className="mr-2"/> Create New Link</Button>
                </Link>
            </div>
            <AllPromotionsPage />
        </div>
    )
}
