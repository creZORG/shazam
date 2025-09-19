
"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DoorOpen, MapPin, Music } from "lucide-react";
import type { NightlifeEvent } from "@/lib/types";
import { format } from "date-fns";

interface NightlifeCardProps {
  event: NightlifeEvent;
}

export function NightlifeCard({ event }: NightlifeCardProps) {
  const eventDate = new Date(event.date);

  return (
    <Link href={`/nightlife/${event.id}`} className="group">
      <Card className="overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 border-purple-500/20 hover:border-purple-500/50 bg-card/50 backdrop-blur-sm" >
        <div className="relative w-full aspect-[4/5]">
          <Image
            src={event.imageUrl}
            alt={event.eventName}
            data-ai-hint={event.imageHint}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
           <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 text-center shadow-lg w-16">
            <p className="text-xs font-bold uppercase text-pink-500">{format(eventDate, 'eee')}</p>
            <p className="text-2xl font-extrabold">{format(eventDate, 'd')}</p>
            <p className="text-xs font-bold uppercase text-muted-foreground">{format(eventDate, 'MMM')}</p>
        </div>

          <div className="absolute bottom-2 left-2 right-2 text-white p-2">
            <h3 className="font-bold text-xl truncate group-hover:text-purple-400" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
              {event.eventName}
            </h3>
          </div>
        </div>
        <CardContent className="p-4 flex flex-col flex-grow">
          <div className="text-sm text-muted-foreground space-y-2 flex-grow">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pink-400" />
              <span className="font-semibold text-foreground truncate">{event.clubName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-pink-400" />
              <span className="truncate">{event.musicPolicy.join(", ")}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
             <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                {event.entranceFee}
            </span>
            <div className="flex items-center text-sm font-medium text-pink-400">
              <DoorOpen className="w-4 h-4 mr-1" />
              <span>Details</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
