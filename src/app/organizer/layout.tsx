"use client";

import Link from "next/link";
import { usePathname, notFound } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateOrganizerProfile } from "./actions";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PlusCircle, Ticket, UserCircle, Loader2, Percent, BarChart2, CheckSquare, BookOpen, DollarSign } from "lucide-react";
import { Logo } from "@/components/icons/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { VerificationGate } from '@/components/auth/VerificationGate';

const topNavLinks = [
  { href: "/organizer/promocodes", label: "Promocodes", icon: Percent },
  { href: "/organizer/payouts", label: "Payouts", icon: DollarSign },
  { href: "/organizer/guide", label: "Guide", icon: BookOpen },
  { href: "/organizer/profile", label: "Profile", icon: UserCircle },
];

const bottomNavLinks = [
  { href: "/organizer", label: "Overview", icon: LayoutDashboard },
  { href: "/organizer/listings", label: "My Listings", icon: Ticket },
  { href: "/organizer/events/create", label: "Create New", icon: PlusCircle },
  { href: "/organizer/attendance", label: "Attendance", icon: CheckSquare },
];


const profileSchema = z.object({
  organizerName: z.string().min(3, "Organization name must be at least 3 characters."),
  about: z.string().min(20, "Please provide a brief description of at least 20 characters."),
});

function ProfileSetupModal({ open, user }: { open: boolean; user: any }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { organizerName: "", about: "" }
  });

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    setIsSubmitting(true);
    const result = await updateOrganizerProfile(user.uid, values);
    if (result.success) {
      toast({ title: "Profile Updated!", description: "You can now access the organizer dashboard." });
      window.location.reload(); // Reload to re-trigger auth checks
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error });
    }
    setIsSubmitting(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete Your Organizer Profile</AlertDialogTitle>
          <AlertDialogDescription>
            Before you can create events, please tell us a bit about your organization.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="organizerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Vibez Entertainment" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About Your Organization</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What kind of events do you organize?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AlertDialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                Save and Continue
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}


export default function OrganizerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, dbUser, loading } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  useEffect(() => {
    if (!loading && dbUser && dbUser.role === 'organizer') {
      const isProfileComplete = dbUser.organizerName && dbUser.about;
      if (!isProfileComplete) {
        setShowProfileModal(true);
      }
    }
  }, [dbUser, loading]);
  
  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  if (!user || !dbUser || !['organizer', 'admin', 'super-admin'].includes(dbUser.role)) {
      notFound();
  }

  const isProfilePage = pathname === '/organizer/profile';

  return (
    <div className="flex flex-col min-h-screen">
      {showProfileModal && user && <ProfileSetupModal open={showProfileModal} user={user} />}
      
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Logo />
              <span className="hidden font-bold sm:inline-block">NaksYetu</span>
            </Link>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-full bg-muted/50 border shadow-sm">
            {topNavLinks.map(link => {
              const isActive = pathname.startsWith(link.href);
              const isDisabled = showProfileModal && link.href !== '/organizer/profile';
              return (
                <Link key={link.href} href={isDisabled ? '#' : link.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="flex items-center gap-1.5"
                    disabled={isDisabled}
                  >
                    <link.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{link.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <NotificationCenter />
            <ThemeToggle />
             <Avatar>
                <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("flex-1 p-4 sm:p-6 lg:p-8 pb-24", showProfileModal && !isProfilePage && "blur-sm pointer-events-none")}>
        <VerificationGate>
          {children}
        </VerificationGate>
      </main>

      {/* Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-4 items-center justify-items-center">
           {bottomNavLinks.map(link => {
             const isActive = pathname === link.href;
             const isDisabled = showProfileModal;
             return (
              <Link key={link.href} href={isDisabled ? '#' : link.href}>
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 p-2",
                    isActive ? "text-primary" : "text-muted-foreground",
                    isDisabled && "opacity-50 pointer-events-none"
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{link.label}</span>
                </div>
              </Link>
             )
           })}
        </div>
      </nav>

    </div>
  );
}
