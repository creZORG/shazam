
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Smartphone, CheckCircle, XCircle } from "lucide-react";

export default function VerifierGuidePage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Ticket Verification Guide</h1>
            <p className="text-lg text-muted-foreground">
                Follow these simple steps to ensure a smooth check-in process at your event.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Smartphone /> 1. Select Your Event</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>From the dashboard, you will see a list of "Upcoming Events" you are assigned to. Click the **"Start Scanning"** button for the event you are currently checking attendees into.</p>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><QrCode /> 2. Scan the QR Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>Once you're on the scanning page, your device's camera will activate.</p>
                     <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>Position the attendee's QR code (from their phone or a printout) within the camera frame.</li>
                        <li>The system will automatically detect and process the code.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckCircle className="text-green-500" /> 3. Interpret the Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>The result of each scan will appear instantly in the "Recent Scans" log.</p>
                     <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                        <li><strong className="text-green-500">SUCCESS:</strong> A green "Ticket successfully validated!" message will appear. The attendee is clear to enter. The log will show their name and ticket type.</li>
                        <li><strong className="text-red-500">FAILURE:</strong> A red message will appear with the reason for the failure (e.g., "Ticket already used," "Ticket not found," or "Ticket is for another event"). The attendee should not be allowed entry.</li>
                    </ul>
                    <p>The "Recent Scans" feed updates in real-time, showing you a history of your scans during the session.</p>
                </CardContent>
            </Card>
        </div>
    );
}
