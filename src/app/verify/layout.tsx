
"use client";

import Link from "next/link";
import { usePathname, notFound } from "next/navigation";
import { SidebarProvider, Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar";
import { QrCode, CalendarDays, Loader2, BookOpen } from "lucide-react";
import { ReactNode } from "react";
import { Logo } from "@/components/icons/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { VerificationGate } from '@/components/auth/VerificationGate';

const verificationNavLinks = [
  { href: "/verify", label: "Dashboard", icon: CalendarDays },
  { href: "/verify/guide", label: "Guide", icon: BookOpen },
];

export default function VerifyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, dbUser, loading } = useAuth();
  
  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  if (!user || !dbUser || !['verifier', 'organizer', 'admin', 'super-admin'].includes(dbUser.role)) {
      notFound();
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
             <Link href="/" className="flex items-center space-x-2">
                <Logo />
                <span className="font-bold">NaksYetu</span>
            </Link>
        </SidebarHeader>
        <SidebarMenu>
          {verificationNavLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  tooltip={{ children: link.label }}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </Sidebar>
      <SidebarInset>
        <VerificationGate>
          <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 items-center">
                  <div className="md:hidden">
                      <SidebarTrigger />
                  </div>
                  <div className="flex-1">
                      <h1 className="text-xl font-semibold ml-2">Verification Portal</h1>
                  </div>
                  <div className="flex items-center space-x-2">
                      {user && <NotificationCenter />}
                      <ThemeToggle />
                      {user && (
                          <Avatar className="h-8 w-8">
                              <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'U'} />
                              <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                      )}
                  </div>
              </div>
          </header>
          <main className="p-4 sm:p-6 lg:p-8">
              {children}
          </main>
        </VerificationGate>
      </SidebarInset>
    </SidebarProvider>
  );
}
