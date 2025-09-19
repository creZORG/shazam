
'use client';

import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
      <h1 className="text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">404</h1>
      <h2 className="mt-4 text-3xl font-semibold">Page Not Found</h2>
      <p className="mt-2 text-muted-foreground max-w-md">
        Oops! The page you're looking for seems to have taken a detour. It might have been moved, deleted, or maybe it never existed.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
        <Link href="/" className="w-full">
            <Button className="w-full">
                <Home className="mr-2" />
                Go to Homepage
            </Button>
        </Link>
         <Link href="/events" className="w-full">
            <Button variant="outline" className="w-full">
                <Search className="mr-2" />
                Search Events
            </Button>
        </Link>
      </div>
    </div>
  );
}
