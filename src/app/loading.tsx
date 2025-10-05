
'use client';

import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/icons/Logo";

const genericFacts = [
  "The world's largest concert was held in Moscow in 1997, with over 3.5 million attendees.",
  "The term 'DJ' stands for 'Disc Jockey'.",
  "The most expensive concert ticket was for a private show by the Eagles, costing over $6 million.",
  "The longest concert by a single artist lasted for 27 hours, 3 minutes, and 44 seconds.",
  "Early versions of tickets were often clay tokens or pieces of bone.",
  "The first-ever online ticket was sold in 1994."
];

const loadingMessages = [
    "Fetching the fun...",
    "Lining up the events...",
    "Polishing the gems...",
    "Tuning the guitars...",
    "Warming up the engines..."
]

export default function Loading() {
  const [fact, setFact] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Select a random fact and message on the client side to avoid hydration mismatch
    setFact(genericFacts[Math.floor(Math.random() * genericFacts.length)]);
    setMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo variant="long" />
        <div className="flex items-center gap-4 text-lg text-muted-foreground">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
             <p>{message || 'Loading...'}</p>
        </div>
        
        <Card className="w-80 border-dashed">
            <CardHeader>
                <CardTitle className="text-center text-lg">Did You Know?</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground">
                    {fact || 'Loading an interesting fact...'}
                </p>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
