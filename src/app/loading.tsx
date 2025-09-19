
'use client';

import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/icons/Logo";

const nakuruFacts = [
  "Lake Nakuru is famous for its vast flocks of flamingos that line its shores.",
  "The name 'Nakuru' means 'Place of the Dust Devil' in the Maasai language.",
  "Menengai Crater, one of the world's largest volcanic calderas, is located in Nakuru.",
  "Nakuru was granted city status in 2021, making it Kenya's fourth city.",
  "The prehistoric site of Hyrax Hill, a museum and archaeological site, is located in Nakuru.",
  "Nakuru is the capital of Nakuru County and a key agricultural hub in Kenya."
];

const loadingMessages = [
    "Fetching the fun...",
    "Lining up the events...",
    "Polishing the gems of Nakuru...",
    "Tuning the guitars...",
    "Warming up the engines..."
]

export default function Loading() {
  const [fact, setFact] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Select a random fact and message on the client side to avoid hydration mismatch
    setFact(nakuruFacts[Math.floor(Math.random() * nakuruFacts.length)]);
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
