

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Ticket, Info, Tag, CalendarClock, CheckCircle } from 'lucide-react';
import type { Event, TicketDefinition } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TicketQuantities {
  [ticketName: string]: number;
}

function TicketCard({ event, ticket, quantity, onQuantityChange }: { event: Event, ticket: TicketDefinition; quantity: number; onQuantityChange: (newQuantity: number) => void; }) {
  const hasDiscount = ticket.discountQuantity && ticket.discountPercentage;
  const isDiscountActive = hasDiscount && quantity >= ticket.discountQuantity!;
  
  const now = new Date();
  const eventDate = new Date(event.date);
  const salesStart = ticket.salesStart ? new Date(ticket.salesStart) : now;
  const salesEnd = ticket.salesEnd ? new Date(ticket.salesEnd) : eventDate;

  const isSaleActive = now >= salesStart && now < salesEnd;
  const isSaleUpcoming = now < salesStart;
  const isSaleEnded = now >= salesEnd;
  const isDisabled = !isSaleActive;
  
  const originalPrice = Number(ticket.price);
  const discountedPrice = isDiscountActive ? originalPrice * (1 - ticket.discountPercentage! / 100) : originalPrice;

  return (
    <div className={cn("bg-muted/50 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden", isDisabled && "opacity-60")}>
        {/* Ticket shape cutouts */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background hidden md:block"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-background hidden md:block"></div>

      <div className="flex-grow">
        <h4 className="font-semibold">{ticket.name}</h4>
        <div className="flex items-baseline gap-2">
            {isDiscountActive && (
              <p className="text-sm text-muted-foreground line-through">Ksh {originalPrice.toLocaleString()}</p>
            )}
            <p className={cn("text-sm font-semibold", isDiscountActive ? "text-primary" : "text-muted-foreground")}>
              Ksh {discountedPrice.toLocaleString()}
            </p>
        </div>

        {ticket.description && <p className="text-xs text-muted-foreground mt-1">{ticket.description}</p>}
        {hasDiscount && (
          <div className={cn("flex items-center gap-1 text-xs mt-1 font-semibold", isDiscountActive ? "text-green-500" : "text-primary")}>
            {isDiscountActive ? <CheckCircle className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
            <span>{isDiscountActive ? 'Discount Unlocked!' : `Buy ${ticket.discountQuantity} or more, get ${ticket.discountPercentage}% off!`}</span>
          </div>
        )}
        {ticket.salesStart && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 font-medium">
            <CalendarClock className="h-3 w-3" />
            <span>Sales: {format(salesStart, 'PP')} - {format(salesEnd, 'PP')}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 self-end md:self-center">
         <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onQuantityChange(Math.max(0, quantity - 1))} disabled={isDisabled}>
            <Minus className="h-4 w-4" />
        </Button>
        <span className="font-bold w-6 text-center">{quantity}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onQuantityChange(Math.min(ticket.quantity, quantity + 1))} disabled={isDisabled}>
            <Plus className="h-4 w-4" />
        </Button>
      </div>
       {isSaleUpcoming && <p className="text-xs text-center md:text-right text-blue-500 font-semibold w-full mt-2 md:mt-0 md:absolute md:right-4 md:bottom-2">Sales start {format(salesStart, 'PP')}</p>}
       {isSaleEnded && <p className="text-xs text-center md:text-right text-red-500 font-semibold w-full mt-2 md:mt-0 md:absolute md:right-4 md:bottom-2">Sales have ended</p>}
    </div>
  );
}


export function TicketSelection({ event }: { event: Event }) {
    const [ticketQuantities, setTicketQuantities] = useState<TicketQuantities>(
        event.tickets?.reduce((acc, ticket) => ({ ...acc, [ticket.name]: 0 }), {}) || {}
    );
    
    const handleQuantityChange = (ticketName: string, newQuantity: number) => {
        setTicketQuantities(prev => ({ ...prev, [ticketName]: newQuantity }));
    };

    const { total, hasSelection, checkoutUrl } = useMemo(() => {
        let currentTotal = 0;
        let selectionMade = false;
        const selectedTickets: TicketQuantities = {};

        for (const ticketName in ticketQuantities) {
            const quantity = ticketQuantities[ticketName];
            if(quantity > 0) {
                selectionMade = true;
                selectedTickets[ticketName] = quantity;
                const ticket = event.tickets?.find(t => t.name === ticketName);
                if (ticket) {
                    let ticketPrice = ticket.price;
                    if (ticket.discountQuantity && ticket.discountPercentage && quantity >= ticket.discountQuantity) {
                        ticketPrice = ticketPrice * (1 - ticket.discountPercentage / 100);
                    }
                    currentTotal += quantity * Number(ticketPrice);
                }
            }
        }
        
        const url = `/checkout?eventId=${event.id}&tickets=${encodeURIComponent(JSON.stringify(selectedTickets))}`;
        
        return { total: currentTotal, hasSelection: selectionMade, checkoutUrl: url };
    }, [ticketQuantities, event.tickets, event.id]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Tickets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.tickets && event.tickets.length > 0 ? (
          event.tickets.map(ticket => (
            <TicketCard 
                key={ticket.name}
                event={event} 
                ticket={ticket} 
                quantity={ticketQuantities[ticket.name] || 0}
                onQuantityChange={(newQuantity) => handleQuantityChange(ticket.name, newQuantity)}
            />
          ))
        ) : (
          <p className="text-muted-foreground text-center py-4">No tickets available for this event.</p>
        )}
      </CardContent>
      {event.tickets && event.tickets.length > 0 && (
        <CardFooter className="flex-col items-stretch space-y-4 pt-4">
            <Separator />
            
            <div className="flex items-center justify-between">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Ksh {total.toLocaleString()}</span>
            </div>

            <div className="p-2 bg-muted/50 rounded-md text-xs text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>You can apply discount codes on the checkout page.</span>
            </div>
            
            <Link href={checkoutUrl} className="w-full">
                <Button size="lg" className="w-full bg-gradient-to-r from-primary to-accent text-white" disabled={!hasSelection}>
                    <Ticket className="mr-2 h-5 w-5" />
                    Buy Now
                </Button>
            </Link>
        </CardFooter>
      )}
    </Card>
  );
}

    
