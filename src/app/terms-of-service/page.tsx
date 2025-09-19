
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
        <Card className="max-w-4xl mx-auto prose dark:prose-invert">
            <CardHeader>
                <CardTitle>Terms of Service</CardTitle>
                <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <section>
                    <h3>1. Agreement to Terms</h3>
                    <p>Welcome to NaksYetu ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the NaksYetu website, mobile applications, and services (collectively, the "Platform"). By accessing or using our Platform, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use the Platform.</p>
                    <p>We may amend these Terms at any time by posting the amended terms on our site. We may or may not post notices on the homepage when such changes occur.</p>
                </section>

                <section>
                    <h3>2. The Platform</h3>
                    <p>NaksYetu provides an online platform that connects event organizers, tour operators, and clubs ("Partners") with users seeking to discover and book tickets for events, tours, and nightlife experiences ("Users" or "Attendees"). We also operate an online shop for official NaksYetu merchandise. We are not the creator, organizer, or owner of the events listed on the Platform, except for those explicitly hosted by NaksYetu. We provide the Platform, which allows Partners to manage their listings and ticket sales and allows users to purchase merchandise.</p>
                </section>

                <section>
                    <h3>3. Accounts and Registration</h3>
                    <ul>
                        <li><strong>Account Creation:</strong> You must be at least 18 years of age to create an account. When you register, you agree to provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.</li>
                        <li><strong>Account Security:</strong> You are responsible for safeguarding the password that you use to access the Platform and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</li>
                        <li><strong>Account Roles:</strong> The Platform supports various user roles, including Attendee, Organizer, Influencer, and Club. Specific roles may require additional information and are subject to approval and our Partner Terms of Service.</li>
                    </ul>
                </section>

                <section>
                    <h3>4. Purchases and Payments</h3>
                    <h4>4.1 Ticket Sales</h4>
                    <ul>
                        <li><strong>Ticket Sales:</strong> All ticket purchases are a transaction between the Attendee and the respective Partner. NaksYetu facilitates this transaction as the Partner's limited payment collection agent.</li>
                        <li><strong>Pricing and Fees:</strong> Prices for tickets are set by the Partners. NaksYetu may add service fees, processing fees, and any applicable taxes to the ticket price, which will be displayed to you before you complete your purchase. All prices are in Kenyan Shillings (Ksh).</li>
                        <li><strong>Payment:</strong> We use third-party payment processors (e.g., M-Pesa) to handle transactions. By making a purchase, you agree to be bound by the terms of service of our payment processors. We are not responsible for any errors by the payment processor.</li>
                        <li><strong>Refunds:</strong> All ticket sales are final. Refunds are only issued in the event of a full event cancellation by the Organizer, as detailed in our <a href="/refund-policy">Refund Policy</a>. Platform fees and processing fees are non-refundable.</li>
                    </ul>

                    <h4>4.2 Merchandise (Shop) Sales</h4>
                    <ul>
                        <li><strong>Product Information:</strong> We strive to display product information, including colors and sizes, as accurately as possible. However, we cannot guarantee that your device's display will accurately reflect the actual product.</li>
                        <li><strong>Payment:</strong> All merchandise sales are final upon completion of payment.</li>
                        <li><strong>Order Fulfillment:</strong> All merchandise purchased through the NaksYetu shop is for **PICKUP ONLY**. We do not offer shipping or delivery services.</li>
                        <li><strong>Pickup Process:</strong> To collect your merchandise, you must present your official order confirmation (containing your unique confirmation code) to a designated NaksYetu staff member at any official NaksYetu-hosted event or a pre-communicated pickup point.</li>
                        <li><strong>Refunds:</strong> All merchandise sales are final and non-refundable.</li>
                    </ul>
                </section>

                 <section>
                    <h3>5. User Conduct and Content</h3>
                    <ul>
                        <li><strong>Prohibited Conduct:</strong> You agree not to use the Platform to: (a) violate any local, national, or international law; (b) infringe upon or violate our intellectual property rights or the intellectual property rights of others; (c) harass, abuse, insult, harm, defame, or discriminate; (d) submit false or misleading information; (e) upload or transmit viruses or any other type of malicious code.</li>
                        <li><strong>User Content:</strong> If you post content to the Platform, such as event reviews or ratings, you grant us a non-exclusive, royalty-free, perpetual, and worldwide license to use, reproduce, modify, and display such content in connection with the Platform. You are solely responsible for the content you post.</li>
                    </ul>
                </section>

                <section>
                    <h3>6. Partners (Organizers, Influencers, Clubs)</h3>
                    <p>Users who register as Organizers, Influencers, or Clubs ("Partners") are subject to our separate <a href="/partners-tos">Partner Terms of Service</a>, which are incorporated by reference into these Terms. The Partner Terms govern the use of our platform for creating events, promoting listings, and other partner-specific activities.</p>
                </section>

                <section>
                    <h3>7. Intellectual Property</h3>
                    <p>The Platform and its original content (excluding content provided by users and Partners), features, and functionality are and will remain the exclusive property of NaksYetu and its licensors. The NaksYetu name, logo, and all related marks are trademarks of NaksYetu. You must not use such marks without our prior written permission.</p>
                </section>

                <section>
                    <h3>8. Termination</h3>
                    <p>We may terminate or suspend your account and bar access to the Platform immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms. If you wish to terminate your account, you may simply discontinue using the Platform.</p>
                </section>
                
                <section>
                    <h3>9. Disclaimers and Limitation of Liability</h3>
                    <p>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE." NAKSYETU MAKES NO WARRANTIES, EXPRESSED OR IMPLIED, REGARDING THE OPERATION OF THE PLATFORM OR THE INFORMATION, CONTENT, OR MATERIALS INCLUDED. YOUR USE OF THE PLATFORM IS AT YOUR SOLE RISK.</p>
                    <p>TO THE FULLEST EXTENT PERMITTED BY LAW, NAKSYETU, ITS DIRECTORS, EMPLOYEES, PARTNERS, AND AGENTS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE PLATFORM AND YOUR USE THEREOF.</p>
                     <p>IN NO EVENT SHALL NAKSYETU BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (I) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE PLATFORM; (II) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE PLATFORM; (III) ANY CONTENT OBTAINED FROM THE PLATFORM; AND (IV) UNAUTHORIZED ACCESS, USE OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.</p>
                </section>

                <section>
                    <h3>10. Governing Law</h3>
                    <p>These Terms shall be governed and construed in accordance with the laws of Kenya, without regard to its conflict of law provisions.</p>
                </section>

                 <section>
                    <h3>11. Contact Us</h3>
                    <p>If you have any questions about these Terms, please contact us through our <a href="/support">Help Center</a>.</p>
                </section>
            </CardContent>
        </Card>
    </div>
  );
}
