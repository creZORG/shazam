
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
import { LayoutDashboard, PlusCircle, Ticket, UserCircle, Loader2, Percent, BarChart2, CheckSquare } from "lucide-react";
import { SidebarProvider, Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar";
import { Logo } from "@/components/icons/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/layout/NotificationCenter";

const organizerNavLinks = [
  { href: "/organizer", label: "Overview", icon: LayoutDashboard },
  { href: "/organizer/listings", label: "My Listings", icon: Ticket },
  { href: "/organizer/events/create", label: "Create New", icon: PlusCircle },
  { href: "/organizer/attendance", label: "Attendance", icon: CheckSquare },
  { href: "/organizer/promocodes", label: "Promocodes", icon: Percent },
  { href: "/organizer/profile", label: "Profile", icon: UserCircle },
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
    <SidebarProvider>
      {showProfileModal && user && <ProfileSetupModal open={showProfileModal} user={user} />}
      <Sidebar>
        <SidebarHeader>
             <Link href="/" className="flex items-center space-x-2">
                <Logo />
                <span className="font-bold">NaksYetu</span>
            </Link>
        </SidebarHeader>
        <SidebarMenu>
            {organizerNavLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                const isDisabled = showProfileModal && link.href !== '/organizer/profile';
                return (
                    <SidebarMenuItem key={link.href}>
                    <Link href={isDisabled ? '#' : link.href} legacyBehavior passHref>
                        <SidebarMenuButton
                        isActive={isActive}
                        tooltip={{ children: link.label }}
                        disabled={isDisabled}
                        >
                        <link.icon />
                        <span>{link.label}</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                )
            })}
        </SidebarMenu>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="md:hidden">
                    <SidebarTrigger />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-semibold ml-2">Organizer Dashboard</h1>
                </div>
                <div className="flex items-center space-x-2">
                    {user && <NotificationCenter />}
                    <ThemeToggle />
                    {dbUser && (
                         <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.photoURL || ''} />
                                <AvatarFallback>{dbUser.organizerName?.charAt(0) || user?.displayName?.charAt(0) || 'O'}</AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-medium hidden sm:block">{dbUser.organizerName || user?.displayName}</p>
                        </div>
                    )}
                </div>
            </div>
        </header>
        <main className={cn("p-4 sm:p-6 lg:p-8", showProfileModal && !isProfilePage && "blur-sm pointer-events-none")}>
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
