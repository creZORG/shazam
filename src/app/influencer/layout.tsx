
"use client";

import Link from "next/link";
import { usePathname, notFound } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, LayoutDashboard, Megaphone, DollarSign, User, Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerificationGate } from '@/components/auth/VerificationGate';
import { Button } from "@/components/ui/button";

const influencerNavLinks = [
  { href: "/influencer", label: "Overview", icon: LayoutDashboard },
  { href: "/influencer/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/influencer/payouts",label: "Payouts", icon: DollarSign },
  { href: "/influencer/guide", label: "Guide", icon: BookOpen },
  { href: "/influencer/profile", label: "Profile", icon: User },
];

export default function InfluencerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, dbUser, loading } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  
  useEffect(() => {
    if (!loading && dbUser) {
      const complete = !!(dbUser.name && dbUser.phone && dbUser.profilePicture);
      setIsProfileComplete(complete);
    }
  }, [dbUser, loading]);

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  if (!user || !dbUser || !['influencer', 'admin', 'super-admin'].includes(dbUser.role)) {
      notFound();
  }

  const isProfilePage = pathname === '/influencer/profile';

  return (
    <div className="flex flex-col min-h-screen">
      <div className="w-full sticky top-14 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
            <div className="relative w-full overflow-x-auto">
                <div className="flex items-center gap-2 py-2">
                    {influencerNavLinks.map(link => {
                        const isActive = pathname.startsWith(link.href);
                        const canAccess = isProfileComplete || link.href === '/influencer/profile' || link.href === '/influencer/guide';
                        return (
                            <Link key={link.href} href={canAccess ? link.href : '#'} legacyBehavior passHref>
                                <Button
                                    asChild
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className="flex items-center gap-1.5 flex-shrink-0"
                                    disabled={!canAccess}
                                >
                                  <a>
                                    <link.icon className="h-4 w-4" />
                                    <span>{link.label}</span>
                                  </a>
                                </Button>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
      
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {!isProfileComplete && !isProfilePage && (
          <div className="mb-8">
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Profile Incomplete</AlertTitle>
                  <AlertDescription>
                  Please complete your profile in the <Link href="/influencer/profile" className="font-semibold underline">Profile</Link> tab to access the rest of the portal.
                  </AlertDescription>
              </Alert>
          </div>
        )}
        <VerificationGate>
            <div className={cn(!isProfileComplete && !isProfilePage && "opacity-50 pointer-events-none")}>
                {children}
            </div>
        </VerificationGate>
      </main>
    </div>
  );
}
