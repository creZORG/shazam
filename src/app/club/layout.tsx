
"use client";

import Link from "next/link";
import { usePathname, useRouter, notFound } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Settings, PartyPopper, PlusCircle, AlertCircle } from "lucide-react";
import { Logo } from "@/components/icons/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { VerificationGate } from '@/components/auth/VerificationGate';


const clubNavLinks = [
  { href: "/club", label: "My Events", icon: PartyPopper },
  { href: "/club/events/create", label: "Create Event", icon: PlusCircle },
  { href: "/club/settings", label: "Settings", icon: Settings },
];

export default function ClubLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, dbUser, loading } = useAuth();
  
  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  if (!user || !dbUser || !['club', 'admin', 'super-admin'].includes(dbUser.role)) {
      notFound();
  }
  
  const isSettingsPage = pathname === '/club/settings';
  const profileIncomplete = !loading && dbUser ? !(dbUser.organizerName && dbUser.about) : false;

   useEffect(() => {
    if (!loading && profileIncomplete && !isSettingsPage) {
        router.replace('/club/settings');
    }
  }, [loading, profileIncomplete, isSettingsPage, router]);


  return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
              <div className="flex-1 flex items-center gap-2">
                   <Link href="/" className="flex items-center space-x-2">
                        <Logo />
                        <span className="font-bold">NaksYetu</span>
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <h1 className="text-xl font-semibold">Club Dashboard</h1>
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

        <main className="flex-1">
          {loading ? (
             <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-4 text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="container mx-auto py-8">
                <div className="flex justify-center mb-8">
                    <Tabs defaultValue={pathname} className="w-auto">
                        <TabsList className="p-1.5 h-auto rounded-full bg-background border shadow-md">
                            {clubNavLinks.map((link) => {
                                const isDisabled = profileIncomplete && link.href !== '/club/settings';
                                return (
                                    <Link key={link.href} href={isDisabled ? '#' : link.href} legacyBehavior passHref>
                                        <TabsTrigger 
                                            value={link.href}
                                            disabled={isDisabled}
                                            className={cn(
                                                "rounded-full px-3 py-1.5 flex items-center gap-2 transition-all duration-300",
                                                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
                                                "data-[state=inactive]:text-muted-foreground",
                                                pathname === link.href ? 'w-auto' : 'w-10 justify-center'
                                            )}
                                        >
                                            <link.icon className="h-5 w-5 flex-shrink-0" />
                                            <span className={cn(
                                                "overflow-hidden transition-all duration-300",
                                                pathname === link.href ? 'max-w-xs' : 'max-w-0'
                                            )}>
                                                {link.label}
                                            </span>
                                        </TabsTrigger>
                                    </Link>
                                );
                            })}
                        </TabsList>
                    </Tabs>
                </div>
                
                 {profileIncomplete && !isSettingsPage && (
                     <Alert variant="destructive" className="max-w-xl mx-auto mt-12">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Profile Incomplete</AlertTitle>
                        <AlertDescription>
                         You must complete your club profile before you can access the dashboard. Please fill out all required fields in the settings page.
                        </AlertDescription>
                    </Alert>
                )}
                
                <VerificationGate>
                    <div className={cn(profileIncomplete && !isSettingsPage && "blur-sm pointer-events-none")}>
                        {children}
                    </div>
                </VerificationGate>
            </div>
          )}
        </main>
      </div>
  );
}
