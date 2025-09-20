
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import type { AuditLog } from "@/lib/types";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { ChatBubble } from "./_components/ChatBubble";


export default function AdminSecurityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              ...data,
              timestamp: (data.timestamp as Timestamp)?.toDate() || new Date()
          } as AuditLog;
      });
      setLogs(fetchedLogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
        <ChatBubble />

        <Card>
        <CardHeader>
            <CardTitle>Security & Audit Logs</CardTitle>
            <CardDescription>A real-time stream of important system events and administrative actions.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Admin</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell title={format(log.timestamp, 'PPpp')}>
                                    {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                                </TableCell>
                                <TableCell>{log.adminName}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{log.action.replace(/_/g, ' ')}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs capitalize">{log.targetType}</span>
                                        <span className="font-mono text-xs text-muted-foreground">{log.targetId}</span>
                                    </div>
                                </TableCell>
                                 <TableCell>
                                    <pre className="text-xs bg-muted p-2 rounded-md font-mono">{JSON.stringify(log.details, null, 2)}</pre>
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



