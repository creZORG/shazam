
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function LinkAnalyticsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const linkId = params.linkId as string;
    const promocodeId = searchParams.get('promocodeId');

    return (
        <div className="space-y-8">
            <Link href="/admin/promotions" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2" /> Back to Promotions
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle>Analytics Placeholder</CardTitle>
                    <CardDescription>This is a placeholder to confirm the page is loading.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 font-mono text-sm">
                    <p><strong>Link ID:</strong> {linkId}</p>
                    <p><strong>Promocode ID:</strong> {promocodeId || 'None'}</p>
                </CardContent>
            </Card>

        </div>
    )
}
