
'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, AlertTriangle, FileText, BadgeHelp, Eye } from 'lucide-react';
import { searchTransactions } from './actions';
import type { Transaction, Order } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type SearchableTransaction = Transaction & { order?: Order };
type SearchType = 'email' | 'phone' | 'receipt';

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
    completed: { variant: 'default', className: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Completed' },
    pending: { variant: 'secondary', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Pending' },
    failed: { variant: 'destructive', className: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Failed' },
};

function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || { variant: 'outline', className: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: status };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
}

export default function AdminTransactionsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<SearchType>('receipt');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
    const [results, setResults] = useState<SearchableTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (debouncedSearchTerm) {
            setIsLoading(true);
            setError(null);
            searchTransactions(debouncedSearchTerm, searchType).then(res => {
                if (res.success && res.data) {
                    setResults(res.data);
                } else {
                    setError(res.error || 'An error occurred');
                    setResults([]);
                }
                setIsLoading(false);
            });
        } else {
            setResults([]);
        }
    }, [debouncedSearchTerm, searchType]);

    const getPlaceholder = () => {
        switch (searchType) {
            case 'email': return 'e.g., user@example.com';
            case 'phone': return 'e.g., 254712345678';
            case 'receipt': return 'e.g., SABCDEFGHI';
        }
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Transactions</CardTitle>
        <CardDescription>Find specific transactions by M-Pesa receipt, phone number, or customer email.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-8">
             <div className="relative flex-grow">
                <Input
                    placeholder={getPlaceholder()}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                />
                 {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
             </div>
            <Select onValueChange={(value: SearchType) => setSearchType(value)} defaultValue={searchType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="receipt">M-Pesa Receipt</SelectItem>
                    <SelectItem value="phone">Phone Number</SelectItem>
                    <SelectItem value="email">Customer Email</SelectItem>
                </SelectContent>
            </Select>
        </div>

        {error && (
             <div className="text-center py-12 text-destructive flex flex-col items-center justify-center gap-2">
                <AlertTriangle className="h-8 w-8" />
                <p className="font-semibold">An error occurred</p>
                <p>{error}</p>
            </div>
        )}

        {!isLoading && !error && results.length === 0 && (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-4">
                 {debouncedSearchTerm ? <FileText className="h-12 w-12" /> : <BadgeHelp className="h-12 w-12" />}
                <p>{debouncedSearchTerm ? 'No transactions found for your search.' : 'Enter a search term to begin.'}</p>
            </div>
        )}

        {results.length > 0 && (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>M-Pesa Code</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.map(tx => (
                        <TableRow key={tx.id}>
                            <TableCell className="font-mono">{tx.mpesaConfirmationCode || 'N/A'}</TableCell>
                            <TableCell>Ksh {tx.amount.toLocaleString()}</TableCell>
                            <TableCell>
                                <div className="font-medium">{tx.order?.userName || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{tx.order?.userEmail}</div>
                            </TableCell>
                            <TableCell>{format(new Date(tx.createdAt as any), 'PPp')}</TableCell>
                             <TableCell><StatusBadge status={tx.status} /></TableCell>
                            <TableCell className="text-right">
                                {tx.id && (
                                    <Link href={`/admin/transactions/${tx.id}`}>
                                        <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" />View</Button>
                                    </Link>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )}

      </CardContent>
    </Card>
  );
}
