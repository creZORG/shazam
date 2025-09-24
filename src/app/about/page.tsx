
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Mov33 | The Heart of Nakuru's Entertainment",
  description: "Learn about Mov33's mission to connect people with unforgettable experiences across Nakuru, from concerts and tours to vibrant nightlife.",
};


export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold">About Mov33</CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2">
            The heart of Nakuru's culture and entertainment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-base text-muted-foreground leading-relaxed">
          <p>
            Mov33 is a vibrant platform dedicated to showcasing the best of what Nakuru has to offer. Our mission is to connect people with unforgettable experiences, from sold-out concerts and thrilling tours to the hottest nightlife spots in every subcounty.
          </p>
          <p>
            We believe in the power of community and the magic of shared moments. For event-goers, we are a trusted source for discovering and securing tickets to the most exciting events. For organizers, influencers, and club owners, we are a powerful partner, providing the tools and audience to ensure every event is a success.
          </p>
          
          <div className="p-6 bg-secondary/50 rounded-lg text-center">
            <h3 className="text-2xl font-bold text-foreground">Meet the Team</h3>
            <p className="mt-2">
              We are a passionate team of developers, designers, and event enthusiasts dedicated to building the ultimate platform for Nakuru's entertainment scene.
            </p>
            <Link href="/about/team" passHref>
                <Button className="mt-4">
                    Meet Our Team <ArrowRight className="ml-2" />
                </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
