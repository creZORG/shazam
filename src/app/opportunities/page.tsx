
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Briefcase, Handshake, Users } from "lucide-react";
import { getOpportunities } from "../admin/content/actions";
import Link from "next/link";
import type { Opportunity } from "@/lib/types";

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
    const icons: Record<Opportunity['type'], React.ElementType> = {
        Job: Briefcase,
        Partnership: Handshake,
        Volunteer: Users,
    }
    const Icon = icons[opportunity.type];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle>{opportunity.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 pt-1">
                            <Icon className="h-4 w-4 text-primary" /> {opportunity.type}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">{opportunity.description}</p>
                 <Link href={opportunity.ctaLink} target="_blank" rel="noopener noreferrer">
                    <Button>
                        Learn More
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}

export default async function OpportunitiesPage() {
  const { data: opportunities, error } = await getOpportunities();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Partner with NaksYetu</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          We provide a comprehensive suite of services to make your event a success. Whether you're an organizer looking for skilled professionals or an individual looking for an opportunity, we have something for you.
        </p>
      </div>
      
       <div className="max-w-4xl mx-auto mt-12">
        {error ? (
            <p className="text-center text-destructive">{error}</p>
        ) : opportunities && opportunities.length > 0 ? (
            <div className="space-y-8">
                {opportunities.map(opp => <OpportunityCard key={opp.id} opportunity={opp} />)}
            </div>
        ) : (
             <p className="text-center text-muted-foreground py-12">No open opportunities at the moment. Check back soon!</p>
        )}
      </div>

       <div className="text-center mt-16">
        <h2 className="text-3xl font-bold">Can't find what you're looking for?</h2>
        <p className="text-muted-foreground mt-2">Contact us today to discuss other partnership possibilities.</p>
        <Link href="/contact">
            <Button size="lg" className="mt-6">
            Contact Us
            </Button>
        </Link>
      </div>
    </div>
  );
}
