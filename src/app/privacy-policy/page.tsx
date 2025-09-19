
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
        <Card className="max-w-4xl mx-auto prose dark:prose-invert">
            <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
                <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <section>
                    <h3>1. Introduction</h3>
                    <p>NaksYetu ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services (the "Platform").</p>
                </section>

                <section>
                    <h3>2. Information We Collect</h3>
                    <p>We may collect information about you in a variety of ways. The information we may collect on the Platform includes:</p>
                    <ul>
                        <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and telephone number, that you voluntarily give to us when you register for an account or purchase tickets.</li>
                        <li><strong>Financial Data:</strong> We do not store any payment card details. All payments are processed by M-Pesa. We may store transaction identifiers and summaries for order processing.</li>
                        <li><strong>Data from Social Networks:</strong> If you register or log in using a social media account (e.g., Google), we may access basic information from your social media profile, such as your name, email, and profile picture, in accordance with the authorization procedures of the social media platform.</li>
                        <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Platform, such as your IP address, browser type, operating system, access times, and the pages you have viewed directly before and after accessing the Platform.</li>
                        <li><strong>User Event Data:</strong> We log interactions with our platform, such as clicks on events, bookmarks, and shares, to improve our service and provide analytics to organizers.</li>
                    </ul>
                </section>
                
                <section>
                    <h3>3. Use of Your Information</h3>
                    <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Platform to:</p>
                    <ul>
                        <li>Create and manage your account.</li>
                        <li>Process your transactions and deliver tickets to you.</li>
                        <li>Email you regarding your account or order.</li>
                        <li>Monitor and analyze usage and trends to improve your experience with the Platform.</li>
                        <li>Provide and deliver the services you request, and send you related information, including confirmations and receipts.</li>
                        <li>Respond to your comments, questions, and requests and provide customer service.</li>
                        <li>Notify you about changes to our services.</li>
                    </ul>
                </section>

                <section>
                    <h3>4. Disclosure of Your Information</h3>
                    <p>We do not share your personal information with third parties except as described in this Privacy Policy. We may share information about you in the following situations:</p>
                    <ul>
                        <li><strong>With Event Organizers:</strong> When you purchase a ticket, we may share your name and ticket information with the event organizer for the purpose of admission and event management.</li>
                        <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law.</li>
                        <li><strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
                    </ul>
                </section>
                
                <section>
                    <h3>5. Security of Your Information</h3>
                    <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>
                </section>

                <section>
                    <h3>6. Policy for Children</h3>
                    <p>We do not knowingly solicit information from or market to children under the age of 13. If you become aware of any data we have collected from children under age 13, please contact us using the contact information provided below.</p>
                </section>
            </CardContent>
        </Card>
    </div>
  );
}
