
'use client';

import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { QrCode, TicketCheck, TicketX, Users, CheckCircle, XCircle, AlertTriangle, Loader2, VideoOff } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Html5Qrcode } from 'html5-qrcode';
import { validateTicket } from '../../actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import type { VerificationScan } from '@/lib/types';


type ScanResult = {
    id: string;
    status: 'success' | 'error';
    message: string;
    details?: { eventName: string, attendeeName: string, ticketType: string };
    timestamp: Date;
}

const QR_SCANNER_ELEMENT_ID = "qr-scanner-region";

function VerificationComponent() {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const { toast } = useToast();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const params = useParams();
  const eventId = params.eventId as string;

  useEffect(() => {
    if (!user || !eventId) return;

    const q = query(
        collection(db, 'verificationHistory'),
        where('verifierId', '==', user.uid),
        where('eventId', '==', eventId),
        orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => {
            const data = doc.data() as VerificationScan;
            return {
                id: doc.id,
                status: data.status,
                message: data.message,
                details: data.details,
                timestamp: (data.timestamp as Timestamp).toDate()
            } as ScanResult;
        });
        setScanHistory(history);
    });

    return () => unsubscribe();
  }, [user, eventId]);

  const stats = useMemo(() => ({
    totalScanned: scanHistory.length,
    valid: scanHistory.filter(s => s.status === 'success').length,
    invalid: scanHistory.filter(s => s.status === 'error').length,
  }), [scanHistory]);
  
  const handleScanResult = async (decodedText: string) => {
      stopScanning();
      
      const validationResult = await validateTicket(decodedText, eventId);

      toast({
          variant: validationResult.success ? 'default' : 'destructive',
          title: validationResult.success ? 'Scan Successful' : 'Scan Failed',
          description: validationResult.message,
          duration: 5000,
      });

      // Restart scanning after a short delay to prevent rapid duplicate scans
      setTimeout(() => {
        if (!html5QrCodeRef.current?.isScanning) {
           startScanning();
        }
      }, 3000);
  }

  const startScanning = () => {
    if (html5QrCodeRef.current && !html5QrCodeRef.current.isScanning) {
        setIsScanning(true);
        html5QrCodeRef.current.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText, decodedResult) => {
                handleScanResult(decodedText);
            },
            (errorMessage) => {
                // handle scan error, usually ignored.
            }
        ).catch((err) => {
            console.error("QR Code scanning failed to start.", err);
            toast({ variant: 'destructive', title: 'Scanner Error', description: 'Could not start the camera. Please check permissions.' });
            setIsScanning(false);
        });
    }
  }

  const stopScanning = () => {
    if (html5QrCodeRef.current?.isScanning) {
      html5QrCodeRef.current.stop().then(() => {
        setIsScanning(false);
      }).catch(err => console.error("Failed to stop scanner", err));
    }
  }

  useEffect(() => {
    if (!html5QrCodeRef.current) {
        try {
            html5QrCodeRef.current = new Html5Qrcode(QR_SCANNER_ELEMENT_ID, { experimentalFeatures: { useBarCodeDetectorIfSupported: true }});
        } catch (e) {
            console.error("Failed to initialize scanner", e)
        }
    }

    return () => {
        if (html5QrCodeRef.current?.isScanning) {
            html5QrCodeRef.current.stop();
        }
    };
  }, []);

  const resultIcons = {
      success: <CheckCircle className="h-5 w-5 text-green-500" />,
      error: <XCircle className="h-5 w-5 text-red-500" />,
      warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  }

  return (
    <div className="space-y-8">
       <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-around gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2"><QrCode className="h-4 w-4 text-muted-foreground" /><span className="font-semibold">{stats.totalScanned}</span> Scanned</div>
            <div className="flex items-center gap-2"><TicketCheck className="h-4 w-4 text-green-500" /><span className="font-semibold">{stats.valid}</span> Valid</div>
            <div className="flex items-center gap-2"><TicketX className="h-4 w-4 text-red-500" /><span className="font-semibold">{stats.invalid}</span> Invalid</div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="font-semibold">N/A</span> Remaining</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Scan Ticket</CardTitle>
                <CardDescription>Position the QR code within the frame to scan.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative aspect-square bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <div id={QR_SCANNER_ELEMENT_ID} className="w-full h-full" />
                    {!isScanning && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm text-center p-4">
                            <VideoOff className="h-16 w-16 mx-auto text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">Scanner is off. Press the button to start.</p>
                        </div>
                    )}
                </div>
                 <Button onClick={isScanning ? stopScanning : startScanning} className="w-full mt-4" size="lg">
                    {isScanning ? 'Stop Scanner' : 'Start Scanner'}
                </Button>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
                <CardDescription>A log of the most recent ticket scans for this event.</CardDescription>
            </CardHeader>
            <CardContent>
                {scanHistory.length === 0 ? (
                     <div className="text-center py-12">
                        <h3 className="text-lg font-semibold">No scans yet</h3>
                        <p className="text-muted-foreground mt-2">
                            Scanned tickets will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {scanHistory.map((scan, index) => (
                            <div key={index} className={cn("p-4 rounded-lg border flex items-start gap-4", {
                                'bg-green-500/10 border-green-500/20': scan.status === 'success',
                                'bg-red-500/10 border-red-500/20': scan.status === 'error',
                            })}>
                                {resultIcons[scan.status]}
                                <div className="flex-grow">
                                    <p className="font-semibold">{scan.message}</p>
                                    {scan.details && (
                                        <p className="text-sm text-muted-foreground">
                                            {scan.details.attendeeName} - {scan.details.ticketType} for {scan.details.eventName}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {format(scan.timestamp, 'pp')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12" /></div>}>
            <VerificationComponent />
        </Suspense>
    )
}
