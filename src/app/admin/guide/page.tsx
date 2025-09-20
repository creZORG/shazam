
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lightbulb, List, Users, Shield, CreditCard, ShoppingBag, DollarSign, FileText, Handshake, FileImage, Megaphone, MessageSquare, BarChart, Settings, Code } from "lucide-react";

export default function AdminGuidePage() {
    const sections = [
        {
            icon: List,
            title: "Listings Management",
            description: "Oversee all user-submitted content.",
            items: [
                "Events & Tours: Review, approve, reject, or take down live listings. You can also view detailed analytics for any listing.",
                "Clubs: Manage all club accounts, including suspending or reactivating them as needed."
            ]
        },
        {
            icon: CreditCard,
            title: "Transactions",
            description: "Monitor all financial activity.",
            items: [
                "Search and view details for every transaction made on the platform, including M-Pesa confirmation codes and order summaries."
            ]
        },
        {
            icon: ShoppingBag,
            title: "Shop Management",
            description: "Control your merchandise store.",
            items: [
                "Add new products, edit existing ones, manage stock levels, and set pricing for your online shop."
            ]
        },
         {
            icon: Handshake,
            title: "Requests & Payouts",
            description: "Handle user role changes and financial disbursements.",
            items: [
                "Requests: Approve or deny requests from users who want to become Organizers, Influencers, or Club partners. This is also where you review ad submissions.",
                "Payouts (Super Admin): Approve or deny payout requests from influencers and organizers.",
                "Support Tickets: Address user inquiries submitted through the Help Center."
            ]
        },
        {
            icon: FileImage,
            title: "Site & Content Management",
            description: "Control the public-facing content of the website.",
            items: [
                "Site Content: Manage homepage sections, carousel images, posters, team members, blog posts, and job opportunities.",
                "Promotions: Create and track campaign links for marketing efforts.",
                "Communication: Send system-wide banner notifications to specific user roles."
            ]
        },
        {
            icon: Users,
            title: "User Management",
            description: "Oversee all platform users.",
            items: [
                "Users (Super Admin): Manage all user accounts, update roles, and handle account status changes (suspend/reactivate).",
                "Generate invitation links to onboard new staff members with specific roles."
            ]
        },
        {
            icon: BarChart,
            title: "Analytics & Reports",
            description: "Gain insights into platform performance.",
            items: [
                "Analytics: View advanced charts on user growth, revenue by category, top promocodes, and more.",
                "Reports: Generate and download CSV reports for financial data, event performance, and user lists."
            ]
        },
        {
            icon: Shield,
            title: "Security & Settings",
            description: "Configure system-wide rules and monitor activity.",
            items: [
                "Security & Audit: View a real-time stream of all significant admin actions and use the AI assistant for data queries.",
                "System Settings (Super Admin): Configure global settings like transaction fees, influencer commissions, and site logos."
            ]
        },
         {
            icon: Code,
            title: "Developer Portal",
            description: "Access tools for monitoring and debugging the application.",
            items: [
                "View real-time error logs, crash analytics, and system performance metrics."
            ]
        }
    ]

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Admin Portal Guide</h1>
            <p className="text-lg text-muted-foreground">
                Welcome to the command center. Here's a quick overview of what you can do.
            </p>

            <div className="space-y-6">
                {sections.map(section => (
                    <Card key={section.title}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <section.icon className="h-6 w-6 text-primary" /> 
                                {section.title}
                            </CardTitle>
                            <CardDescription>{section.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                                {section.items.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>

             <Card className="border-primary/50 bg-primary/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb /> Pro-Tip: Use the Admin AI</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The "Security & Audit" page features a powerful AI assistant chat bubble. You can ask it questions like <span className="font-semibold text-primary/80">"Show me all failed transactions from yesterday"</span> or <span className="font-semibold text-primary/80">"What was Mark's last activity?"</span> to get quick insights without manually searching through tables.</p>
                </CardContent>
            </Card>
        </div>
    );
}
