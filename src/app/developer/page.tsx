
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertTriangle, AreaChart, Database, Activity, FileWarning, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, query, limit } from "firebase/firestore";

function SystemStatusCard() {
    const [counts, setCounts] = useState({ reads: 0, writes: 0, errors: 0 });

    useEffect(() => {
        // This is a simplified listener. A real-world app might use a more sophisticated
        // backend aggregation for performance, but this demonstrates the real-time concept.
        const auditUnsubscribe = onSnapshot(query(collection(db, "auditLogs"), limit(1)), (snapshot) => {
             if (snapshot.metadata.hasPendingWrites) return;
             setCounts(prev => ({ ...prev, writes: prev.writes + snapshot.size }));
        });
        
        const errorUnsubscribe = onSnapshot(query(collection(db, "errorLogs"), limit(1)), (snapshot) => {
             if (snapshot.metadata.hasPendingWrites) return;
            setCounts(prev => ({ ...prev, errors: prev.errors + snapshot.size }));
        });

        // Simulate reads for demonstration
        const interval = setInterval(() => {
            setCounts(prev => ({ ...prev, reads: prev.reads + Math.floor(Math.random() * 5) }));
        }, 3000);


        return () => {
            auditUnsubscribe();
            errorUnsubscribe();
            clearInterval(interval);
        };
    }, []);

    return (
         <Card>
            <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Overview of all system components and their status.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="p-4 bg-muted rounded-lg">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center"><CheckCircle className="mr-2 text-green-500" /> API Health</h3>
                    <p className="text-2xl font-bold">Online</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center"><Database className="mr-2" /> Firestore Writes</h3>
                    <p className="text-2xl font-bold">{counts.writes}</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center"><Activity className="mr-2" /> Firestore Reads</h3>
                    <p className="text-2xl font-bold">{counts.reads}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center"><FileWarning className="mr-2 text-red-500" /> Errors Logged</h3>
                    <p className="text-2xl font-bold">{counts.errors}</p>
                </div>
            </CardContent>
        </Card>
    );
}


export default function DeveloperDashboardPage() {
  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Developer Dashboard</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Application Health</CardTitle>
                    <AlertTriangle className="h-6 w-6 text-green-500" />
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">99.9% Uptime</p>
                    <p className="text-sm text-muted-foreground">No active issues reported.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>API Response Time</CardTitle>
                    <AreaChart className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">120ms</p>
                    <p className="text-sm text-muted-foreground">Average over the last hour.</p>
                </CardContent>
            </Card>
        </div>
        <SystemStatusCard />
    </div>
  );
}
