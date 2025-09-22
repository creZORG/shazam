
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
        <Card className="max-w-4xl mx-auto prose dark:prose-invert">
            <CardHeader>
                <CardTitle>Advertising Policy</CardTitle>
                <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <section>
                    <h3>1. Introduction</h3>
                    <p>This Advertising Policy outlines the standards and rules for all advertisements submitted to the Mov33 platform. Our goal is to provide a safe, positive, and relevant experience for our users while enabling advertisers to reach their target audience effectively. All ads are subject to review and approval by Mov33.</p>
                </section>

                <section>
                    <h3>2. The Ad Review Process</h3>
                    <p>Before an ad goes live, it is reviewed by our team to ensure it complies with our policies. We typically review ads within 24-48 business hours. During the review, we check the ad's images, text, targeting, and the content of the landing page it links to.</p>
                </section>
                
                <section>
                    <h3>3. Prohibited Content</h3>
                    <p>Advertisements must not constitute, facilitate, or promote illegal products, services, or activities. Ads must not contain, promote, or be related to the following:</p>
                    <ul>
                        <li><strong>Illegal Activities:</strong> Ads that promote illegal drugs, substances, or any form of illegal activity.</li>
                        <li><strong>Hate Speech and Discrimination:</strong> Content that attacks or demeans a group based on race, ethnicity, national origin, religion, sex, gender, sexual orientation, disability, or medical condition.</li>
                        <li><strong>Misleading or False Claims:</strong> Ads must not contain deceptive, false, or misleading claims, including those about an event's nature, price, or venue. "Get rich quick" schemes are strictly prohibited.</li>
                        <li><strong>Weapons and Explosives:</strong> Promotion of weapons, ammunition, or explosives is not allowed.</li>
                        <li><strong>Adult Content:</strong> Ads must not contain nudity, depictions of people in explicit or suggestive positions, or content that is overly sexual. Ads for events in nightlife venues are permitted but must not be sexually explicit. You must correctly use the "Is Adult Content" toggle when submitting your ad.</li>
                        <li><strong>Intellectual Property Infringement:</strong> Ads must not violate the intellectual property rights of any third party, including copyright, trademark, or privacy rights.</li>
                    </ul>
                </section>

                <section>
                    <h3>4. Ad Quality and Formatting</h3>
                    <ul>
                        <li><strong>Image Quality:</strong> Images must be clear, high-resolution, and relevant to the advertised event or product. Images that are blurry, distorted, or contain excessive text are not allowed.</li>
                        <li><strong>Relevance:</strong> All ad components, including text, images, and the landing page, must be relevant and accurately represent the event being advertised.</li>
                        <li><strong>Functionality:</strong> The call-to-action link (CTA) must lead to a functional, mobile-friendly landing page.</li>
                    </ul>
                </section>

                <section>
                    <h3>5. Our Right to Reject Ads</h3>
                    <p>Mov33 reserves the sole right to determine whether an ad violates our policies. We may reject, remove, or request modifications to any ad at our discretion, at any time. If your ad is rejected, you will be notified with a reason, and you may have the opportunity to edit and resubmit it for review.</p>
                </section>

            </CardContent>
        </Card>
    </div>
  );
}
