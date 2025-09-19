'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting venues based on the expected number of attendees.
 *
 * @function suggestVenue - The main function to trigger the venue suggestion flow.
 * @typedef {VenueSuggestionInput} VenueSuggestionInput - The input type for the suggestVenue function, defining the expected number of attendees.
 * @typedef {VenueSuggestionOutput} VenueSuggestionOutput - The output type for the suggestVenue function, providing a suggested venue name and reason.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VenueSuggestionInputSchema = z.object({
  attendeeCount: z
    .number()
    .describe('The expected number of attendees for the event.'),
});
export type VenueSuggestionInput = z.infer<typeof VenueSuggestionInputSchema>;

const VenueSuggestionOutputSchema = z.object({
  venueName: z.string().describe('The suggested venue name.'),
  reason: z.string().describe('The reason for suggesting this venue.'),
});
export type VenueSuggestionOutput = z.infer<typeof VenueSuggestionOutputSchema>;

export async function suggestVenue(input: VenueSuggestionInput): Promise<VenueSuggestionOutput> {
  return suggestVenueFlow(input);
}

const venueSuggestionPrompt = ai.definePrompt({
  name: 'venueSuggestionPrompt',
  input: {schema: VenueSuggestionInputSchema},
  output: {schema: VenueSuggestionOutputSchema},
  prompt: `You are an event planning assistant specializing in venues in Nakuru subcounties.

  Based on the expected number of attendees, suggest a suitable venue in Nakuru.

  Consider the following:
  - Capacity of the venue
  - Ambiance of the venue
  - Suitability for different types of events

  Provide the venue name and a brief reason for your suggestion, referencing the number of attendees ({{{attendeeCount}}}).

  Venues available include:
  - Nakuru Athletic Club: Capacity 500-2000
  - Sarova Woodlands Hotel & Spa: Capacity 10-300
  - Lake Nakuru National Park: Capacity 100-5000
  - Merica Hotel: Capacity 50-500
`,
});

const suggestVenueFlow = ai.defineFlow(
  {
    name: 'suggestVenueFlow',
    inputSchema: VenueSuggestionInputSchema,
    outputSchema: VenueSuggestionOutputSchema,
  },
  async input => {
    const {output} = await venueSuggestionPrompt(input);
    return output!;
  }
);
