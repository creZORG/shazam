
'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle, Printer, Loader2, AlertTriangle, UserCircle, Edit, UploadCloud, User, Info, Download, Gift } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import Image from 'next/image';
import { getTicketDetails } from '../profile/actions';
import type { Ticket, Event, Order } from '@/lib/types';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/app/organizer/events/create/cloudinary-actions';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";


type TicketWithEvent = Ticket & { event: Event, order: Order };

type TicketCustomization = {
  name: string;
  photoUrl?: string;
}

function redactEmail(email: string) {
    if (!email || email.indexOf('@') === -1) return '***';
    const [name, domain] = email.split('@');
    if (name.length <= 3) return `${name.substring(0, 1)}***@${domain}`;
    return `${name.substring(0, 3)}***@${domain}`;
}

function redactPhoneNumber(phone: string) {
    if (!phone || phone.length < 10) return '***';
    return `${phone.substring(0, 3)}****${phone.substring(phone.length - 3)}`;
}

function TicketDisplay({ ticket, customization }: { ticket: TicketWithEvent, customization: TicketCustomization }) {
    const { event, order } = ticket;
    const ticketPrice = event.tickets?.find(t => t.name === ticket.ticketType)?.price ?? 0;
    const qrCodeData = (ticketId: string) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketId)}`;

    return (
        <Card className="overflow-hidden shadow-lg border-2 bg-card relative break-inside-avoid">
             {/* Watermark */}
             <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                <div className="whitespace-nowrap text-[10px] font-black uppercase -rotate-45 text-primary/10 select-none">
                    {Array(100).fill("TICKETED BY MOV33").map((text, i) => (
                        <p key={i} className="mb-1">{text}</p>
                    ))}
                </div>
            </div>
            
            <div className="relative z-10">
                {/* Header */}
                <div className="p-4 flex justify-between items-center bg-card/80 backdrop-blur-sm">
                    <Logo variant="long" className="w-20 h-auto" />
                     <p className="text-xs text-muted-foreground">{format(new Date(ticket.createdAt), "PPp")}</p>
                </div>

                <div className="relative h-32 md:h-40 bg-muted">
                    <Image src={event.imageUrl} alt={event.name} layout="fill" objectFit="cover" />
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                <div className="flex flex-col md:flex-row">
                    <div className="flex-grow p-4 space-y-4">
                        <h2 className="text-2xl font-bold">{event.name} <span className="font-normal text-xl text-muted-foreground">by {event.organizerName}</span></h2>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex items-start gap-2"><span className="font-semibold">Date:</span>{format(new Date(event.date), 'eee, MMM d, yyyy')}</div>
                            <div className="flex items-start gap-2"><span className="font-semibold">Time:</span>{format(new Date(event.date), 'h:mm a')}</div>
                            <div className="flex items-start gap-2"><span className="font-semibold">Venue:</span>{event.venue}</div>
                            <div className="flex items-start gap-2"><span className="font-semibold">Type:</span>{ticket.ticketType}</div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            {customization.photoUrl ? (
                                <Image src={customization.photoUrl} alt="Attendee" width={40} height={40} className="rounded-full h-10 w-10 object-cover" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center"><UserCircle className="h-6 w-6 text-muted-foreground" /></div>
                            )}
                            <div>
                                <p className="text-xs text-muted-foreground">Attendee</p>
                                <p className="font-bold text-md">{customization.name}</p>
                            </div>
                        </div>

                        {order.freeMerch && (
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                <Gift className="h-6 w-6 text-green-500" />
                                <div>
                                    <p className="text-xs text-green-500">Free Merchandise Included</p>
                                    <p className="font-bold text-md">{order.freeMerch.productName}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="relative md:w-48 bg-muted/30 p-4 flex flex-col items-center justify-center md:border-l-2 md:border-dashed">
                        <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 rounded-full bg-background hidden md:block"></div>
                        <div className="p-1 bg-white rounded-lg shadow-md">
                            <Image src={qrCodeData(ticket.qrCode)} alt="Ticket QR Code" width={150} height={150}/>
                        </div>
                        <p className="font-mono text-[10px] tracking-wider pt-2">{ticket.qrCode}</p>
                        <div className="mt-2 text-center">
                            <p className="text-xs font-bold text-red-500">NON-TRANSFERABLE</p>
                            <p className="text-[10px] text-muted-foreground">Purchased by: {redactEmail(order.userEmail)} / {redactPhoneNumber(order.userPhone)}</p>
                            <p className="text-xs font-semibold">Price: Ksh {ticketPrice.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                 <CardFooter className="bg-card/50 p-2 flex items-center justify-between">
                    <p className='text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500'>Purchased from mov33.com</p>
                    <Logo variant='long' className="w-24 h-auto" />
                </CardFooter>
            </div>
        </Card>
    )
}


function TicketCustomizationDialog({ ticket, customization, onUpdate, children }: { ticket: TicketWithEvent, customization: TicketCustomization, onUpdate: (update: Partial<TicketCustomization>) => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await uploadImage(formData);

        if (result.success && result.url) {
            onUpdate({ photoUrl: result.url });
        } else {
            toast({ variant: 'destructive', title: 'Upload Failed', description: result.error });
        }
        setIsUploading(false);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
        maxFiles: 1,
    });

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Edit /> Customize Ticket: <span className="text-primary">{ticket.ticketType}</span></DialogTitle>
                    <DialogDescription>Changes made here are for display only and won't be saved to your profile.</DialogDescription>
                </DialogHeader>
                 <div className="grid md:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor={`attendeeName-${ticket.id}`}>Holder's Name</Label>
                        <Input id={`attendeeName-${ticket.id}`} value={customization.name} onChange={(e) => onUpdate({ name: e.target.value })} />
                    </div>
                     <div className="space-y-2">
                         <Label>Holder's Photo (Optional)</Label>
                         <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary", isDragActive && "border-primary")}>
                            <input {...getInputProps()} />
                            {isUploading ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground" />}
                            <p className="text-xs mt-1 text-muted-foreground">{isUploading ? 'Uploading...' : 'Click or drag file'}</p>
                        </div>
                     </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button>Done</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function TicketCenterComponent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [customizations, setCustomizations] = useState<TicketCustomization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const firstTicket = tickets[0];

  useEffect(() => {
    if (orderId) {
      setLoading(true);
      getTicketDetails(orderId).then(result => {
        if (result.success && result.data) {
          setTickets(result.data as TicketWithEvent[]);
          // Initialize customization state for each ticket
          setCustomizations(result.data.map(ticket => ({
              name: ticket.userName,
              photoUrl: ''
          })));
        } else {
          setError(result.error || "Could not load ticket information.");
        }
        setLoading(false);
      });
    } else {
        setError("No order ID provided.");
        setLoading(false);
    }
  }, [orderId]);

  const handleUpdateCustomization = (index: number, update: Partial<TicketCustomization>) => {
      setCustomizations(prev => {
          const newCustomizations = [...prev];
          newCustomizations[index] = { ...newCustomizations[index], ...update };
          return newCustomizations;
      });
  }

  const handlePrint = () => {
    window.print();
  }

  const handleDownload = useCallback((ticketId: string, ticketName: string) => {
    const element = document.getElementById(`ticket-to-print-${ticketId}`);
    if (element) {
        toPng(element)
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `${ticketName.replace(/\s+/g, '_')}-ticket.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
            });
    }
  }, []);
  
  if (loading) {
    return <div className="flex flex-col items-center justify-center min-h-[50vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4">Loading your tickets...</p></div>;
  }
  
  if (error) {
      return (
        <div className="container mx-auto max-w-2xl text-center py-20">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold mt-4">Could not load tickets</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
        </div>
      )
  }
  
  if (tickets.length === 0) {
     return <p className="text-center text-muted-foreground py-20">No tickets found for this order.</p>;
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12 print:py-0">
      <div className="text-center mb-8 print:hidden">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold">Your Tickets are Confirmed!</h1>
        <p className="text-muted-foreground mt-2">
          Thank you for your purchase. You can customize and print your tickets below. A copy has also been sent to your email.
        </p>
        <div className="flex justify-center mt-6">
             <Button size="lg" className="w-full sm:w-auto" onClick={handlePrint}>
                <Printer className="mr-2" />
                Print All Tickets (PDF)
            </Button>
        </div>
      </div>
      
        <div className="space-y-8 mt-8">
            {tickets.map((ticket, index) => (
                <div key={ticket.id || index}>
                    <div id={`ticket-to-print-${ticket.id}`} className="ticket-container">
                        <TicketDisplay
                            ticket={ticket}
                            customization={customizations[index] || { name: ticket.userName }}
                        />
                    </div>
                     <div className="flex justify-center gap-2 mt-4 print:hidden">
                        <TicketCustomizationDialog
                           ticket={ticket}
                           customization={customizations[index] || { name: ticket.userName }}
                           onUpdate={(update) => handleUpdateCustomization(index, update)}
                        >
                            <Button variant="outline"><Edit className="mr-2" />Customize</Button>
                        </TicketCustomizationDialog>
                         <Button variant="outline" onClick={() => handleDownload(ticket.id as string, ticket.ticketType)}>
                            <Download className="mr-2" />
                            Download PNG
                        </Button>
                    </div>
                </div>
            ))}
        </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .ticket-container, .ticket-container * {
            visibility: visible;
          }
          .ticket-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            page-break-after: always; /* Ensure each ticket is on a new page */
          }
        }
      `}</style>
    </div>
  );
}


export default function TicketCenterPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12" /></div>}>
            <TicketCenterComponent />
        </Suspense>
    )
}
