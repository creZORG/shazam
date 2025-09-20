
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lightbulb, Ticket, Percent, CheckSquare, PlusCircle } from "lucide-react";
import Link from 'next/link';

export default function OrganizerGuidePage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Organizer Guide</h1>
            <p className="text-lg text-muted-foreground">
                Welcome to your dashboard! Here's a quick guide to help you get the most out of NaksYetu.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PlusCircle /> Creating a Listing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>To create a new event or tour, navigate to the "Create New" tab. The multi-step form will guide you through adding all the necessary details.</p>
                    <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>Fill in all required fields in each step to proceed to the next.</li>
                        <li>You can save your progress at any time by clicking "Save Draft".</li>
                        <li>Once you're ready, click "Submit for Review". Our team will review your submission and publish it if it meets our guidelines.</li>
                    </ul>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Percent /> Promocodes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>Boost your sales by creating custom promocodes. You can create general codes for your events or assign specific codes to influencers to track their performance.</p>
                     <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>Go to the "Promocodes" tab and click "Create New".</li>
                        <li>Select which event, tour, or all of your listings the code should apply to.</li>
                        <li>Define the discount (percentage or fixed amount) and set usage limits.</li>
                        <li>To work with an influencer, find them by their username and set their commission. They will be notified to accept the campaign.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckSquare /> Attendance & Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>Monitor your event's check-ins in real-time and manage ticket verification.</p>
                     <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>Visit the "Attendance" tab and select an event to see live stats on tickets sold vs. attendees checked in.</li>
                        <li>From the "My Listings" tab, you can click "Manage" on any event to access the verifier management tools.</li>
                        <li>You can scan tickets yourself by going to the <Link href="/verify" className="text-primary underline">Verification Portal</Link> or by inviting other users with a 'verifier' role to help.</li>
                    </ul>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb /> Pro-Tip</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Use the "Promocodes" feature to collaborate with influencers from our <Link href="/influencers" className="text-primary underline">Public Directory</Link>. Assigning a unique code to an influencer allows both you and them to track the revenue and tickets sold through their specific link, with commissions handled automatically.</p>
                </CardContent>
            </Card>
        </div>
    );
}
