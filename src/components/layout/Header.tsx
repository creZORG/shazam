
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/Logo';
import { LogOut, Menu, Ticket, PartyPopper, Briefcase, User, Settings, LayoutDashboard, QrCode, Shield, Percent, Award, Code, ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ThemeToggle } from './ThemeToggle';
import { FirebaseUser } from '@/lib/types';
import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { NotificationCenter } from './NotificationCenter';

const publicNavLinks = [
  { href: '/events', label: 'Events' },
  { href: '/tours', label: 'Tours' },
  { href: '/nightlife', label: 'Nightlife', icon: PartyPopper, className: 'text-pink-400' },
  { href: '/shop', label: 'Shop', icon: ShoppingBag },
];

const roleBasedLinks = [
  { href: '/organizer', label: 'For Organizers', roles: ['organizer', 'admin', 'super-admin', 'developer'] },
  { href: '/club', label: 'For Clubs', roles: ['club', 'admin', 'super-admin'] },
  { href: '/influencer', label: 'For Influencers', roles: ['influencer', 'admin', 'super-admin'] },
  { href: '/verify', label: 'Verification', icon: QrCode, roles: ['verifier', 'organizer', 'admin', 'super-admin'] },
]

const hasAccess = (user: FirebaseUser | null, roles?: string[]) => {
  if (!roles) return true; // Link is public
  if (!user) return false; // Link is protected, but no user
  return roles.includes(user.role);
};


export function Header() {
  const pathname = usePathname();
  const { user, dbUser, signOut } = useAuth();

  const navLinks = React.useMemo(() => {
    const visibleRoleLinks = roleBasedLinks.filter(link => hasAccess(dbUser, link.roles));
    return [...publicNavLinks, ...visibleRoleLinks];
  }, [dbUser]);

  const renderNavLinks = (isMobile = false) =>
    navLinks.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "transition-colors flex items-center gap-1.5 rounded-full",
               isMobile 
                ? "text-lg p-3" 
                : "text-sm font-medium px-3 py-1.5",
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {link.icon && <link.icon className="h-4 w-4" />}
            {link.label}
          </Link>
        )
    });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 flex h-14 items-center justify-between">
        <div className="flex items-center">
           <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>
                    <Link href="/" className="flex items-center space-x-2 mb-6">
                      <Logo variant="long" />
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-2">
                  {renderNavLinks(true)}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
           <Link href="/" className="flex items-center">
              <Logo variant="long" className="h-8 w-auto hidden md:block" />
              <Logo variant="brief" className="h-10 w-10 md:hidden" />
            </Link>
        </div>

        <div className="flex items-center gap-1">
            <div className="hidden md:flex">
                <nav className="flex items-center gap-1 p-1 rounded-full bg-muted/50 border shadow-sm">
                    {renderNavLinks()}
                </nav>
            </div>
          {user && <NotificationCenter />}
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                {dbUser && ['organizer', 'admin', 'super-admin', 'developer'].includes(dbUser.role) && (
                  <Link href="/organizer">
                    <DropdownMenuItem>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Organizer Dashboard</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                 {dbUser && ['club', 'admin', 'super-admin'].includes(dbUser.role) && (
                  <Link href="/club">
                    <DropdownMenuItem>
                      <PartyPopper className="mr-2 h-4 w-4" />
                      <span>Club Dashboard</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                {dbUser && ['influencer', 'admin', 'super-admin'].includes(dbUser.role) && (
                  <Link href="/influencer">
                    <DropdownMenuItem>
                      <Percent className="mr-2 h-4 w-4" />
                      <span>Influencer Dashboard</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                {dbUser && ['developer', 'admin', 'super-admin'].includes(dbUser.role) && (
                   <Link href="/developer">
                    <DropdownMenuItem>
                      <Code className="mr-2 h-4 w-4" />
                      <span>Developer Portal</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                {dbUser && ['admin', 'super-admin'].includes(dbUser.role) && (
                   <Link href="/admin">
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Portal</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
                <Link href="/login" passHref className="hidden md:block">
                    <Button>
                        <Ticket className="mr-2 h-4 w-4" />
                        Login
                    </Button>
                </Link>
                 <Link href="/login" passHref className="md:hidden">
                    <Button variant="ghost" size="icon">
                        <User className="h-5 w-5" />
                        <span className="sr-only">Login</span>
                    </Button>
                </Link>
            </>
          )}

        </div>
      </div>
    </header>
  );
}
