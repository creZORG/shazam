
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, User, FileWarning, MessageSquareWarning, BarChart } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getCrashAnalytics } from "./actions";

type ErrorLog = {
    id: string;
    message: string;
    stack?: string;
    digest?: string;
    path: string;
    userAgent: string;
    timestamp: Date;
    userId?: string;
    userName?: string;
};

type AnalyticsData = {
    topPages: { path: string, count: number }[];
    topMessages: { message: string, count: number }[];
}

function StatCard({ title, data, dataKey, dataLabel, icon: Icon }: { title: string, data: any[], dataKey: string, dataLabel: string, icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> {title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {data.map((item, index) => (
                        <li key={index} className="flex justify-between items-center text-sm">
                            <span className="truncate pr-4">{item[dataKey]}</span>
                            <Badge variant="secondary">{item.count}</Badge>
                        </li>
                    ))}
                </ul>
                {data.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>}
            </CardContent>
        </Card>
    );
}

export default function DeveloperAnalyticsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch aggregate data once on load
    getCrashAnalytics().then(result => {
        if (result.success && result.data) {
            setAnalytics(result.data);
        }
    });

    // Set up real-time listener for the log stream
    const q = query(collection(db, "errorLogs"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              ...data,
              timestamp: (data.timestamp as Timestamp)?.toDate() || new Date()
          } as ErrorLog;
      });
      setLogs(fetchedLogs);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching error logs:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Crash & Error Analytics</h1>

        <div className="grid md:grid-cols-2 gap-8">
            {loading ? (
                <>
                    <Card><CardHeader><CardTitle>Top Error Pages</CardTitle></CardHeader><CardContent className="flex justify-center p-12"><Loader2 className="animate-spin" /></CardContent></Card>
                    <Card><CardHeader><CardTitle>Top Error Messages</CardTitle></CardHeader><CardContent className="flex justify-center p-12"><Loader2 className="animate-spin" /></CardContent></Card>
                </>
            ) : analytics && (
                <>
                    <StatCard title="Top Error Pages" data={analytics.topPages} dataKey="path" dataLabel="Page" icon={FileWarning} />
                    <StatCard title="Top Error Messages" data={analytics.topMessages} dataKey="message" dataLabel="Message" icon={MessageSquareWarning} />
                </>
            )}
        </div>

        <Card>
        <CardHeader>
            <CardTitle>Real-time Error Log</CardTitle>
            <CardDescription>A live stream of the most recent application errors.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No errors logged yet. Hooray!</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Error</TableHead>
                            <TableHead>Path</TableHead>
                            <TableHead>User</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell title={format(log.timestamp, 'PPpp')}>
                                    {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                                </TableCell>
                                <TableCell>
                                    <Accordion type="single" collapsible>
                                        <AccordionItem value="item-1" className="border-none">
                                            <AccordionTrigger className="p-0 hover:no-underline font-semibold">{log.message}</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="mt-2 p-2 bg-muted rounded-md text-xs font-mono">
                                                    <p><strong>Digest:</strong> {log.digest}</p>
                                                    <p className="mt-2 whitespace-pre-wrap"><strong>Stack:</strong><br />{log.stack || 'Not available'}</p>
                                                    <p className="mt-2"><strong>User Agent:</strong> {log.userAgent}</p>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </TableCell>
                                <TableCell><Badge variant="outline">{log.path}</Badge></TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        {log.userName || 'Anonymous'}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
        </Card>
    </div>
  );
}
