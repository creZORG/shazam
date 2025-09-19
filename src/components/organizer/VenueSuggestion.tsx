
"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lightbulb, Loader2 } from "lucide-react";
import { getVenueSuggestion } from "@/app/organizer/events/create/actions";
import type { VenueSuggestionOutput } from "@/ai/flows/venue-suggestion.flow";

export function VenueSuggestion() {
  const [attendeeCount, setAttendeeCount] = useState("");
  const [suggestion, setSuggestion] = useState<VenueSuggestionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuggestion(null);
    setError(null);

    const result = await getVenueSuggestion({ attendeeCount: Number(attendeeCount) });

    if (result.success && result.data) {
      setSuggestion(result.data);
    } else {
      setError(result.error || "An unknown error occurred.");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4 h-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="attendees" className="font-semibold flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-primary" />Need help choosing a venue?</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the expected number of attendees and our AI will suggest a suitable venue in Nakuru.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="attendees"
            type="number"
            placeholder="e.g., 400"
            value={attendeeCount}
            onChange={(e) => setAttendeeCount(e.target.value)}
            className="w-full sm:w-auto flex-grow"
            required
            min="1"
          />
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-gradient-to-r from-primary/80 to-accent/80 text-white">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suggesting...
              </>
            ) : (
              "Suggest Venue"
            )}
          </Button>
        </div>
      </form>

      {suggestion && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Venue Suggestion: {suggestion.venueName}</AlertTitle>
          <AlertDescription>{suggestion.reason}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
