
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';
import { Montserrat, Poppins, Lato } from 'next/font/google';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/hooks/use-auth';
import { AppProviders } from './providers';
import { Analytics } from "@vercel/analytics/next"
import { useEffect, useState } from 'react';
import { getSettings } from './admin/settings/actions';
import { SeasonalBanner } from '@/components/layout/SeasonalBanner';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', weight: ['700', '800'] });
const poppins = Poppins({ subsets: ['latin'], variable: '--font-poppins', weight: ['500', '600'] });
const lato = Lato({ subsets: ['latin'], variable: '--font-lato', weight: '400' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/organizer') || pathname.startsWith('/influencer') || pathname.startsWith('/verify') || pathname.startsWith('/developer') || pathname.startsWith('/club');
  
  const [themeForced, setThemeForced] = useState(false);

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
      
      // Seasonal Theme logic
      const isDecember = new Date().getMonth() === 11;
      if (settings?.enableHolidayTheme || (settings?.enableHolidayTheme === undefined && isDecember)) {
        document.documentElement.classList.add('theme-holiday');
        setThemeForced(true);
      } else {
        document.documentElement.classList.remove('theme-holiday');
        setThemeForced(false);
      }
    });
  }, [pathname]); // Re-check on path change to update if settings change

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", montserrat.variable, poppins.variable, lato.variable)}>
          <AuthProvider>
            <AppProviders>
              <div className="flex flex-col min-h-screen">
                  {!isAdminPage && <SeasonalBanner />}
                  <Header />
                  <main className="flex-grow">{children}</main>
                  {!isAdminPage && <Footer />}
              </div>
            </AppProviders>
          </AuthProvider>
          <Toaster />
          <Analytics />
      </body>
    </html>
  );
}
