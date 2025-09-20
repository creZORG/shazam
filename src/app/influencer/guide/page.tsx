
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lightbulb, Megaphone, DollarSign, User, Link as LinkIcon } from "lucide-react";
import Link from 'next/link';

export default function InfluencerGuidePage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Influencer Guide</h1>
            <p className="text-lg text-muted-foreground">
                Welcome to the Influencer Portal! Here's how to get started and maximize your earnings.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> 1. Complete Your Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>Your profile is your public face to organizers. A complete and professional profile is key to getting campaign invitations.</p>
                    <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>Go to the <Link href="/influencer/profile" className="font-semibold text-primary underline">Profile</Link> tab.</li>
                        <li>Fill out your **Full Name**, **M-Pesa Phone Number**, and upload a clear **Profile Picture**.</li>
                        <li>Add your social media links so organizers can see your work.</li>
                        <li>Choose your privacy settings for what is shown on your public influencer card.</li>
                    </ul>
                     <p className="font-semibold">This step is mandatory before you can accept campaigns or receive payouts.</p>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Megaphone /> 2. Accept & Manage Campaigns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>Organizers will assign campaigns to you. These will appear in your "Campaigns" tab under the "Pending" section.</p>
                     <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>Review the event details and your commission rate.</li>
                        <li>Click "Accept Agreement" to activate the campaign. Your unique promocode and tracking links will become available.</li>
                        <li>Click "Manage Campaign" on any active campaign to create new tracking links.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LinkIcon /> 3. Use Your Tracking Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>Your unique tracking links are the most important tool you have. When someone clicks your link and buys a ticket, you earn a commission. Your promocode is automatically applied when they use your link.</p>
                     <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>From the "Manage Campaign" page, you can create multiple tracking links for a single campaign.</li>
                        <li>**Best Practice:** Create a separate link for each place you post. For example, create one named "IG Story", another "Twitter Post", and another "FB Group".</li>
                        <li>This allows you to see exactly where your sales are coming from by viewing the click and purchase counts for each link.</li>
                        <li>Share these links widely on your social media platforms!</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign /> 4. Track Earnings & Get Paid</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>Monitor your performance and manage your earnings from the "Overview" and "Payouts" tabs.</p>
                     <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>The "Overview" tab shows your all-time earnings, tickets sold, and available payout balance.</li>
                        <li>When you're ready to cash out, go to the "Payouts" tab and click "Request Payout".</li>
                        <li>Funds will be sent to the M-Pesa number on your profile within 24-48 hours of approval.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
