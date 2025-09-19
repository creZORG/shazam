
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/hooks/use-auth';
import { AppProviders } from './providers';
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/organizer') || pathname.startsWith('/influencer') || pathname.startsWith('/verify') || pathname.startsWith('/developer');

  const showMainLayout = !isAdminPage;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
          <AuthProvider>
            <AppProviders>
              {showMainLayout ? (
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-grow">{children}</main>
                  <Footer />
                </div>
              ) : (
                <>{children}</>
              )}
            </AppProviders>
          </AuthProvider>
          <Toaster />
          <Analytics />
      </body>
    </html>
  );
}
