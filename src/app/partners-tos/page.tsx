
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PartnersTermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
        <Card className="max-w-4xl mx-auto prose dark:prose-invert">
            <CardHeader>
                <CardTitle>Partner Terms of Service</CardTitle>
                <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <section>
                    <h3>1. Introduction</h3>
                    <p>These Partner Terms of Service ("Partner Terms") govern your access to and use of the Mov33 platform as a Partner, which includes roles as an "Organizer," "Influencer," or "Club." These terms supplement our general Terms of Service. By applying for or using the platform as a Partner, you agree to these Partner Terms.</p>
                </section>

                <section>
                    <h3>2. Account Registration and Responsibilities</h3>
                    <ul>
                        <li><strong>Accuracy:</strong> You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</li>
                        <li><strong>Security:</strong> You are responsible for safeguarding your password and for all activities that occur under your account. You will notify Mov33 immediately of any unauthorized use of your account.</li>
                        <li><strong>Compliance:</strong> As a Partner, you agree to comply with all applicable laws, rules, and regulations, including those related to event management, advertising, data privacy, and consumer rights.</li>
                    </ul>
                </section>

                <section>
                    <h3>3. Organizer and Club Terms</h3>
                    <ul>
                        <li><strong>Listings:</strong> You are solely responsible for the accuracy of your event and tour listings, including dates, times, venues, descriptions, and pricing.</li>
                        <li><strong>Content:</strong> You grant Mov33 a worldwide, non-exclusive, royalty-free license to use, reproduce, and display the content (images, text, logos) you upload for the purpose of marketing and promoting your event on our platform and associated channels.</li>
                        <li><strong>Customer Service:</strong> You are responsible for handling attendee inquiries and complaints related to the event itself. Mov33 will handle inquiries related to the ticket purchasing process and platform use.</li>
                        <li><strong>Event Fulfillment:</strong> You are responsible for ensuring the event takes place as described in the listing. In case of cancellation or significant changes, you agree to coordinate with Mov33 to manage refunds according to our Refund Policy.</li>
                    </ul>
                </section>

                 <section>
                    <h3>4. Influencer Terms</h3>
                    <ul>
                        <li><strong>Promotion:</strong> You agree to promote assigned events or the Mov33 platform in a positive, lawful, and non-misleading manner on your agreed-upon social channels.</li>
                        <li><strong>Codes and Links:</strong> Unique promotional codes and tracking links provided by Mov33 are for your exclusive use. You may not sell, trade, or transfer them.</li>
                        <li><strong>Representation:</strong> You must not represent yourself as an employee or official representative of Mov33. You are an independent partner.</li>
                        <li><strong>Disclosure:</strong> You must comply with all applicable laws regarding endorsements, including clearly disclosing your partnership with Mov33 when promoting events (e.g., using #ad, #sponsored).</li>
                    </ul>
                </section>
                
                <section>
                    <h3>5. Payments, Fees, and Payouts</h3>
                    <ul>
                        <li><strong>Platform Fees:</strong> Mov33 charges a platform fee on all tickets sold through the platform. This fee is determined by the system settings and is deducted from the total ticket revenue.</li>
                        <li><strong>Organizer Payouts:</strong> Net revenue (total ticket sales minus platform fees, processing fees if applicable, and influencer commissions) will be made available for payout to Organizers after the event has successfully concluded.</li>
                        <li><strong>Influencer Commissions:</strong> Influencers earn a commission based on the terms set for each specific promotional code. Commissions are calculated on the net ticket price (after discounts) and are only earned on completed, non-refunded ticket sales.</li>
                        <li><strong>Payout Requests:</strong> Partners may request a payout of their available balance through their respective dashboards. Payouts are processed via M-Pesa to the phone number registered on the Partner's profile. Mov33 is not responsible for delays or failures caused by incorrect payment information provided by the Partner.</li>
                    </ul>
                </section>

                <section>
                    <h3>6. Data and Privacy</h3>
                    <p>As a Partner, you may receive access to certain data, such as sales reports and attendee lists for your events. You agree to handle this data in compliance with our Privacy Policy and all applicable data protection laws. You shall not sell, transfer, or use this data for any purpose other than the fulfillment and management of the specific event for which it was provided.</p>
                </section>

                <section>
                    <h3>7. Termination</h3>
                    <p>Mov33 reserves the right to suspend or terminate your Partner account at any time, without notice, for conduct that we believe violates these Partner Terms, our main Terms of Service, or is otherwise harmful to our platform or community. Upon termination, your right to use the Partner features will immediately cease, and any outstanding eligible payouts will be processed in the next payment cycle.</p>
                </section>
                
                 <section>
                    <h3>8. Disclaimers and Limitation of Liability</h3>
                    <p>The platform is provided "as is." Mov33 makes no warranties regarding the number of tickets you will sell or the amount of commission you will earn. Our liability to you for any cause whatsoever, and regardless of the form of the action, will at all times be limited to the amount of fees paid by you to us, if any, in the 12 months prior to the initial action giving rise to liability.</p>
                </section>

                 <section>
                    <h3>9. Changes to Terms</h3>
                    <p>Mov33 reserves the right to modify these Partner Terms at any time. We will provide notice of such changes by posting the updated terms on our site. Your continued use of the Partner features after such notice constitutes your acceptance of the new terms.</p>
                </section>

            </CardContent>
        </Card>
    </div>
  );
}
