
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Briefcase, Percent, Award, Ticket, User, Mail, PartyPopper, Building, Loader2, AlertCircle, FileClock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { requestPartnerRole, getPartnerRequests } from './actions';
import type { UserRole, PartnerRequest } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

const roles = [
    { 
        key: 'organizer',
        title: 'Become an Organizer',
        description: 'Bring your events to life on NaksYetu.',
        icon: Briefcase,
        features: [
            { text: 'Create and manage your own event pages.', icon: Briefcase },
            { text: 'Sell tickets directly through our platform.', icon: Ticket },
            { text: 'Access detailed sales and attendance analytics.', icon: Award },
        ]
    },
    { 
        key: 'influencer',
        title: 'Become an Influencer',
        description: 'Promote events and earn commissions.',
        icon: Percent,
        features: [
            { text: 'Promote events and earn commissions.', icon: Percent },
            { text: 'Get unique affiliate links and coupon codes.', icon: User },
            { text: 'Track your performance and earnings.', icon: Award },
        ]
    },
    { 
        key: 'club',
        title: 'Become a Club Partner',
        description: 'List your nightlife events and parties.',
        icon: PartyPopper,
        features: [
            { text: 'Feature your club nights and special events.', icon: PartyPopper },
            { text: 'Update your event details in real-time.', icon: Building },
            { text: 'Reach a dedicated audience of party-goers.', icon: Award },
        ]
    },
]

export default function PartnerWithUsPage() {
  const { user, dbUser, loading } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<UserRole | null>(null);

  const fetchRequests = () => {
    if (user) {
        getPartnerRequests().then(result => {
            if (result.success && result.data) {
                setRequests(result.data);
            }
        });
    }
  }

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleRequest = async (role: UserRole) => {
    setIsSubmitting(role);
    const result = await requestPartnerRole(role);

    if (result.success) {
        toast({
            title: "Request Submitted!",
            description: "We've received your request. You'll get an email once it's been reviewed."
        });
        fetchRequests();
    } else {
         toast({
            variant: "destructive",
            title: "Request Failed",
            description: result.error
        });
    }
    setIsSubmitting(null);
  }
  
  if (loading) {
      return (
          <div className="container mx-auto px-4 py-12 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          </div>
      );
  }

  if (!user) {
    return (
        <div className="container mx-auto px-4 py-12 text-center">
            <h2 className="text-2xl font-bold">Please Log In</h2>
            <p className="text-muted-foreground mt-2">You need to be logged in to partner with us.</p>
            <Link href="/login">
                <Button className="mt-4">Log In or Sign Up</Button>
            </Link>
        </div>
    )
  }
  
  const isPartner = dbUser && ['organizer', 'influencer', 'club'].includes(dbUser.role);
  const pendingRequest = requests.find(req => req.status === 'pending');
  const pastRequests = requests.filter(req => req.status !== 'pending');


  if (isPartner) {
     const dashboardLink = `/${dbUser?.role}`;
     return (
         <div className="container mx-auto px-4 py-12 text-center">
             <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <CardTitle className="text-3xl">You're Already a Partner!</CardTitle>
                    <CardDescription>
                      You are registered as a <span className="font-bold capitalize text-primary">{dbUser?.role}</span>. Manage your activities from your dashboard.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                     <Link href={dashboardLink}>
                        <Button>Go to My Dashboard</Button>
                    </Link>
                 </CardContent>
            </Card>
        </div>
     )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Partner with NaksYetu</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-4">
                Join our growing community of event organizers, influencers, and clubs. Choose the path that's right for you and start making an impact.
            </p>
        </div>

        {pendingRequest ? (
            <Card className="max-w-2xl mx-auto bg-blue-500/10 border-blue-500/30">
                <CardHeader>
                    <FileClock className="h-12 w-12 text-blue-400 mx-auto" />
                    <CardTitle className="text-center">Your Request is Pending</CardTitle>
                    <CardDescription className="text-center">
                        Our team is currently reviewing your application to become a <span className="font-bold text-foreground capitalize">{pendingRequest.requestedRole}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                     <p className="text-sm">Submitted {formatDistanceToNow(new Date(pendingRequest.createdAt), {addSuffix: true})}</p>
                </CardContent>
            </Card>
        ) : (
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {roles.map(role => (
                    <Card key={role.key} className="flex flex-col">
                        <CardHeader>
                           <div className="h-8 w-8 mb-2 flex items-center justify-center">
                                <role.icon className="h-8 w-8 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-orange-500" />
                           </div>
                            <CardTitle>{role.title}</CardTitle>
                            <CardDescription>{role.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-grow">
                            {role.features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <feature.icon className="h-5 w-5 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-orange-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-muted-foreground text-sm">{feature.text}</p>
                                </div>
                            ))}
                        </CardContent>
                        <CardContent>
                            {role.key === 'influencer' ? (
                                <Link href="/profile/edit" className="w-full">
                                    <Button className="w-full">Complete Your Profile</Button>
                                </Link>
                            ) : (
                                <Button onClick={() => handleRequest(role.key as UserRole)} className="w-full" disabled={!!isSubmitting}>
                                    {isSubmitting === role.key ? <Loader2 className="animate-spin mr-2" /> : <Mail className="mr-2" />}
                                    Request Role
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}

        {pastRequests.length > 0 && (
            <Card className="max-w-2xl mx-auto mt-16">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileClock /> Your Past Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pastRequests.map(req => (
                        <div key={req.id} className="p-3 border rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold">Role Request: <span className="capitalize text-primary">{req.requestedRole}</span></p>
                                <p className="text-xs text-muted-foreground">Submitted {formatDistanceToNow(new Date(req.createdAt), {addSuffix: true})}</p>
                            </div>
                            <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'}>
                                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}
    </div>
  );
}
