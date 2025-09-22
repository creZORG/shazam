
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

  if (!user || !dbUser || !['verifier', 'organizer', 'admin', 'super-admin', 'developer'].includes(dbUser.role)) {
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
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            {/* You can add breadcrumbs or page titles here if needed */}
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </header>
        <VerificationGate>
          <main className="p-4 sm:p-6 lg:p-8">
              {children}
          </main>
        </VerificationGate>
      </SidebarInset>
    </SidebarProvider>
  );
}
