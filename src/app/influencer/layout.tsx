
"use client";

import Link from "next/link";
import { usePathname, notFound } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, LayoutDashboard, Megaphone, DollarSign, User, Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/icons/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/layout/NotificationCenter";


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
    <>
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
            <div className="flex-1 flex items-center gap-2">
                 <Link href="/" className="flex items-center space-x-2">
                      <Logo />
                      <span className="font-bold">NaksYetu</span>
                  </Link>
                  <span className="text-muted-foreground">/</span>
                  <h1 className="text-xl font-semibold">Influencer Portal</h1>
            </div>
            <div className="flex items-center space-x-2">
                {user && <NotificationCenter />}
                <ThemeToggle />
                {user && (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                        <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </div>
      </header>
    <div className="container mx-auto py-8">
        <div className="flex justify-center mb-8">
            <Tabs defaultValue={pathname} className="w-auto">
                <TabsList className="p-1.5 h-auto rounded-full bg-background border shadow-md">
                    {influencerNavLinks.map((link) => {
                        const canAccess = isProfileComplete || link.href === '/influencer/profile';
                        return (
                             <Link key={link.href} href={canAccess ? link.href : '#'} legacyBehavior passHref>
                                <TabsTrigger 
                                    value={link.href}
                                    disabled={!canAccess}
                                    className={cn(
                                        "rounded-full px-3 py-1.5 flex items-center gap-2 transition-all duration-300",
                                        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
                                        "data-[state=inactive]:text-muted-foreground",
                                        pathname.startsWith(link.href) ? 'w-auto' : 'w-10 justify-center'
                                    )}
                                >
                                    <link.icon className="h-5 w-5 flex-shrink-0" />
                                    <span className={cn(
                                        "overflow-hidden transition-all duration-300",
                                        pathname.startsWith(link.href) ? 'max-w-xs' : 'max-w-0'
                                    )}>
                                        {link.label}
                                    </span>
                                </TabsTrigger>
                            </Link>
                        )
                    })}
                </TabsList>
            </Tabs>
        </div>
        
        <main>
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
            <div className={cn(!isProfileComplete && !isProfilePage && "opacity-50 pointer-events-none")}>
                {children}
            </div>
        </main>
    </div>
    </>
  );
}
