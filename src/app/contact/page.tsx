
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getSiteContent } from "@/app/admin/content/actions";
import { Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | Mov33',
  description: 'Get in touch with the Mov33 team. Find our contact details or submit a support ticket for direct assistance.',
};

export default async function ContactPage() {
  const { data: content, error } = await getSiteContent();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Get in Touch</h1>
        <p className="text-lg text-muted-foreground mt-2">
          We're here to help. Reach out to us with any questions or inquiries.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {content?.contact?.phone && (
          <Card>
            <CardHeader className="items-center">
              <Phone className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Phone</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <a href={`tel:${content.contact.phone}`} className="text-muted-foreground hover:text-primary">{content.contact.phone}</a>
            </CardContent>
          </Card>
        )}
        {content?.contact?.email && (
          <Card>
            <CardHeader className="items-center">
              <Mail className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Email</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <a href={`mailto:${content.contact.email}`} className="text-muted-foreground hover:text-primary">{content.contact.email}</a>
            </CardContent>
          </Card>
        )}
        {content?.contact?.location && (
          <Card>
            <CardHeader className="items-center">
              <MapPin className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Office</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Link href={content.contact.mapsLink || '#'} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                {content.contact.location}
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

       <Card className="mt-12">
        <CardHeader>
          <CardTitle>Send us a Message</CardTitle>
          <CardDescription>For direct inquiries, please use our support page.</CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-center text-muted-foreground py-8">
                The best way to reach us is by visiting our <Link href="/support" className="text-primary underline">Support Center</Link>.
           </p>
        </CardContent>
      </Card>
    </div>
  );
}
