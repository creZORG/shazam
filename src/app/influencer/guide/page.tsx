
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lightbulb, Megaphone, DollarSign, User } from "lucide-react";
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
                        <li>Go to the "Profile" tab.</li>
                        <li>Fill out your **Full Name**, **M-Pesa Phone Number**, and upload a clear **Profile Picture**.</li>
                        <li>Add your social media links so organizers can see your work.</li>
                        <li>Choose your privacy settings for what is shown on your public influencer card.</li>
                    </ul>
                     <p className="font-semibold">This step is mandatory before you can accept campaigns or receive payouts.</p>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Megaphone /> 2. Accept Campaigns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>Organizers will assign campaigns to you. These will appear in your "Campaigns" tab under the "Pending" section.</p>
                     <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>Review the event details and your commission rate.</li>
                        <li>Click "Accept Agreement" to activate the campaign. Your unique promocode and tracking links will become available.</li>
                        <li>Share your unique links on your social platforms. When someone clicks your link and buys a ticket, you earn a commission!</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign /> 3. Track Earnings & Get Paid</CardTitle>
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
