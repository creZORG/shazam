
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { getFinancialReport, getEventPerformanceReport, getUserReport } from "./actions";

function downloadCSV(data: any[], filename: string) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            let cell = row[header];
            if (typeof cell === 'string' && cell.includes(',')) {
                return `"${cell}"`;
            }
            return cell;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export default function AdminReportsPage() {
    const [loadingReport, setLoadingReport] = useState<string | null>(null);

    const handleGenerate = async (reportType: 'financial' | 'events' | 'users') => {
        setLoadingReport(reportType);
        let result;
        let filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;

        try {
            switch(reportType) {
                case 'financial':
                    result = await getFinancialReport();
                    break;
                case 'events':
                    result = await getEventPerformanceReport();
                    break;
                case 'users':
                    result = await getUserReport();
                    break;
            }

            if (result.success && result.data) {
                downloadCSV(result.data, filename);
            } else {
                alert(`Failed to generate report: ${result.error}`);
            }
        } catch (error: any) {
            alert(`An error occurred: ${error.message}`);
        } finally {
            setLoadingReport(null);
        }
    }

  const reports = [
    { type: 'financial', title: 'Financial Report', description: 'Download a CSV of all completed orders, including amounts, fees, and user details.' },
    { type: 'events', title: 'Event Performance Report', description: 'Get a summary of each event, including total revenue and tickets sold.' },
    { type: 'users', title: 'User List', description: 'Export a complete list of all registered users with their roles and join dates.' },
  ];

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Generate Reports</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map(report => (
                 <Card key={report.type}>
                    <CardHeader>
                        <CardTitle>{report.title}</CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => handleGenerate(report.type as any)} disabled={loadingReport === report.type}>
                            {loadingReport === report.type ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            Download CSV
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    </div>
  );
}
