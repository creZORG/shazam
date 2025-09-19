
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CookiePolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
        <Card className="max-w-4xl mx-auto prose dark:prose-invert">
            <CardHeader>
                <CardTitle>Cookie Policy</CardTitle>
                <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <section>
                    <h3>1. What Are Cookies?</h3>
                    <p>Cookies are small text files stored on your device (computer, tablet, mobile phone) when you visit certain websites. They are used to 'remember' you and your preferences, either for a single visit (through a "session cookie") or for multiple repeat visits (using a "persistent cookie").</p>
                </section>

                <section>
                    <h3>2. How We Use Cookies</h3>
                    <p>We use cookies for a few essential purposes to ensure our platform functions correctly. Our use of cookies is limited and focused on providing you with a seamless experience.</p>
                    <ul>
                        <li>
                            <strong>Strictly Necessary Cookies:</strong> These cookies are essential for you to browse the website and use its features, such as accessing secure areas of the site. Without these cookies, services like logging into your account cannot be provided.
                        </li>
                    </ul>
                </section>
                
                <section>
                    <h3>3. Specific Cookies We Use</h3>
                    <ul>
                        <li>
                            <strong>Session Cookie (`session`):</strong> This is the primary cookie our platform uses. It is a strictly necessary cookie used to securely identify you after you log in. It allows us to know who is logged in and maintain your authentication state as you navigate through different pages, especially protected routes like your profile, organizer dashboard, or admin portal. This cookie is essential for the security and functionality of your account.
                        </li>
                        <li>
                            <strong>Affiliate Tracking (`nak_affiliate_coupon`):</strong> We use local storage (which functions similarly to a persistent cookie) to temporarily store affiliate or coupon information if you arrive on our site through a special link. This allows us to apply discounts correctly at checkout and credit our influencer partners. This data is stored for 24 hours.
                        </li>
                    </ul>
                </section>

                <section>
                    <h3>4. Third-Party Cookies</h3>
                    <p>Currently, NaksYetu does not use third-party cookies for advertising or extensive analytics. Our cookie usage is limited to the first-party, essential functions described above.</p>
                </section>
                
                <section>
                    <h3>5. Your Choices</h3>
                    <p>Because we only use strictly necessary cookies, we do not provide an option to opt-out of them, as doing so would break essential site functionality like logging in. You can use your browser settings to block or delete cookies, but if you do, some parts of our Platform may not work correctly.</p>
                </section>
            </CardContent>
        </Card>
    </div>
  );
}
