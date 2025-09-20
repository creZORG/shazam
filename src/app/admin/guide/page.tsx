
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lightbulb, List, Users, Shield } from "lucide-react";

export default function AdminGuidePage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Admin Portal Guide</h1>
            <p className="text-lg text-muted-foreground">
                Welcome to the command center. Here's a quick overview of what you can do.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><List /> Listings Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>The "Listings" section is where you control all events, tours, and club profiles on the platform.</p>
                    <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li><strong>Events & Tours:</strong> Review submissions from organizers, approve, reject, or take down live listings. You can also view detailed analytics for any listing.</li>
                        <li><strong>Clubs:</strong> Manage all club accounts. You can suspend or reactivate accounts as needed.</li>
                    </ul>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> User & Request Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li><strong>Users:</strong> As a Super Admin, you can manage all user accounts, update roles, and handle account status changes.</li>
                        <li><strong>Requests:</strong> Approve or deny requests from users who want to become Organizers, Influencers, or Club partners. This is also where you approve or reject ad submissions.</li>
                        <li><strong>Support Tickets:</strong> Address user inquiries submitted through the Help Center.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield /> Security & Audit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>This is your go-to for monitoring platform activity.</p>
                    <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li><strong>Audit Logs:</strong> View a real-time stream of all significant actions performed by admins and organizers.</li>
                        <li><strong>Admin AI:</strong> Use the AI chat bubble to ask natural language questions about any data on the platform, from user activity to financial reports.</li>
                    </ul>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb /> Pro-Tip</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The "Security & Audit" page features a powerful AI assistant. You can ask it questions like "Show me all failed transactions from yesterday" or "What was Mark's last activity?" to get quick insights without manually searching through tables.</p>
                </CardContent>
            </Card>
        </div>
    );
}
