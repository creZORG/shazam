
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RefundPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
        <Card className="max-w-4xl mx-auto prose dark:prose-invert">
            <CardHeader>
                <CardTitle>Refund Policy</CardTitle>
                <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <section>
                    <h3>1. General Policy: All Sales Are Final</h3>
                    <p>When you purchase a ticket on NaksYetu, you are supporting an event organizer. Because NaksYetu passes funds directly to these organizers, we maintain a strict **no-refund policy**. All sales are considered final once a transaction is completed.</p>
                    <p>We encourage you to double-check your order details, including the event date, time, and ticket quantity, before completing your purchase.</p>
                </section>

                <section>
                    <h3>2. Exception: Event Cancellations</h3>
                    <p>The only exception to our no-refund policy is in the case of a complete event cancellation by the organizer.</p>
                    <ul>
                        <li>If an event is canceled, we will work with the organizer to issue refunds to all ticket holders.</li>
                        <li>Refunds will be processed automatically to the original M-Pesa number used for the purchase.</li>
                        <li>Please allow 5-10 business days for the refund to reflect in your account after a cancellation has been officially announced.</li>
                    </ul>
                </section>
                
                 <section>
                    <h3>3. Event Postponements or Rescheduling</h3>
                    <p>If an event is postponed or rescheduled, your original ticket will automatically be valid for the new date. We do not offer refunds for postponed events. It is the organizer's responsibility to communicate any date changes. We will do our best to notify you via email if such changes occur.</p>
                </section>
                
                <section>
                    <h3>4. Non-Refundable Fees</h3>
                    <p>Please note that any platform fees or transaction processing fees charged at the time of purchase are **non-refundable**, even in the event of a cancellation.</p>
                </section>

                <section>
                    <h3>5. Contacting Us</h3>
                    <p>If you have questions about a refund for a canceled event, please contact our support team through the <a href="/support">Help Center</a>. For questions about the event itself, please contact the organizer directly.</p>
                </section>
            </CardContent>
        </Card>
    </div>
  );
}
