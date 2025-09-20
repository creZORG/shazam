
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
import { useEffect } from 'react';
import { getSettings } from './admin/settings/actions';
import { SeasonalBanner } from '@/components/layout/SeasonalBanner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/organizer') || pathname.startsWith('/influencer') || pathname.startsWith('/verify') || pathname.startsWith('/developer');

  const showMainLayout = !isAdminPage;

  useEffect(() => {
    // Favicon logic
    getSettings().then(({ settings }) => {
      const faviconUrl = settings?.logoBriefUrl || 'https://i.postimg.cc/Vk16XVjR/here.png';
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    });

    // Seasonal Theme logic
    const currentMonth = new Date().getMonth(); // 0-indexed (0 = January, 11 = December)
    if (currentMonth === 11) { // It's December
      document.documentElement.classList.add('theme-holiday');
    } else {
      document.documentElement.classList.remove('theme-holiday');
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
          <AuthProvider>
            <AppProviders>
              {showMainLayout ? (
                <div className="flex flex-col min-h-screen">
                  <SeasonalBanner />
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
