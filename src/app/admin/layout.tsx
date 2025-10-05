
"use client";

import Link from "next/link";
import { usePathname, notFound } from "next/navigation";
import { SidebarProvider, Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, Ticket, Users, Handshake, Building, DollarSign, Settings, Shield, Mountain, BarChart, CreditCard, FileText, Loader2, List, Code, MessageSquare, Megaphone, ShoppingBag, BookOpen } from "lucide-react";
import { ReactNode } from "react";
import { Logo } from "@/components/icons/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { ChatBubble } from "./security/_components/ChatBubble";
import { VerificationGate } from '@/components/auth/VerificationGate';


const allAdminNavLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'super-admin'] },
  { href: "/admin/listings", label: "Listings", icon: List, roles: ['admin', 'super-admin'], subItems: [
      { href: "/admin/events", label: "Events", icon: Ticket },
      { href: "/admin/tours", label: "Tours", icon: Mountain },
      { href: "/admin/clubs", label: "Clubs", icon: Building },
  ]},
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard, roles: ['admin', 'super-admin'] },
  { href: "/admin/shop", label: "Shop", icon: ShoppingBag, roles: ['admin', 'super-admin'] },
  { href: "/admin/payouts", label: "Payouts", icon: DollarSign, roles: ['super-admin'] },
  { href: "/admin/reports", label: "Reports", icon: FileText, roles: ['admin', 'super-admin'] },
  { href: "/admin/requests", label: "Requests", icon: Handshake, roles: ['admin', 'super-admin'] },
  { href: "/admin/content", label: "Site Content", icon: FileText, roles: ['admin', 'super-admin'] },
  { href: "/admin/promotions", label: "Promotions", icon: Megaphone, roles: ['admin', 'super-admin'] },
  { href: "/admin/communication", label: "Communication", icon: MessageSquare, roles: ['admin', 'super-admin'] },
  { href: "/admin/users", label: "Users", icon: Users, roles: ['super-admin'] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart, roles: ['admin', 'super-admin'] },
  { href: "/admin/guide", label: "Guide", icon: BookOpen, roles: ['admin', 'super-admin']},
  { href: "/admin/settings", label: "System Settings", icon: Settings, roles: ['super-admin'] },
  { href: "/admin/security", label: "Security & Audit", icon: Shield, roles: ['super-admin'] },
  { href: "/developer", label: "Developer", icon: Code, roles: ['developer', 'super-admin'] }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, dbUser, loading } = useAuth();

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  if (!user || !dbUser || !['admin', 'super-admin', 'developer'].includes(dbUser.role)) {
    notFound();
  }

  const adminNavLinks = allAdminNavLinks.filter(link => 
      dbUser && link.roles.includes(dbUser.role)
  );

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
             <Link href="/" className="flex items-center space-x-2">
                <Logo variant="long" />
            </Link>
        </SidebarHeader>
        <SidebarMenu>
          {adminNavLinks.map((link) => {
            const finalHref = link.href === '/admin/listings' ? '/admin/events' : link.href;
            const isActive = pathname.startsWith(link.href);

             return (
             <SidebarMenuItem key={link.href}>
                <Link href={finalHref} legacyBehavior passHref>
                    <SidebarMenuButton
                    isActive={isActive}
                    tooltip={{ children: link.label }}
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
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger />
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
          {dbUser.role === 'super-admin' && <ChatBubble user={dbUser} />}
        </VerificationGate>
      </SidebarInset>
    </SidebarProvider>
  );
}
