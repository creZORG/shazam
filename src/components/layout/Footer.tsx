
"use client";

import { Twitter, Instagram, Facebook, LifeBuoy, Shield, Star } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { getSiteContent } from '@/app/admin/content/actions';
import { Button } from '../ui/button';

const companyLinks = [
  { href: '/about', label: 'About NaksYetu' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/blog', label: 'Blog' },
];

const forYouLinks = [
    { href: '/partner-with-us', label: 'Become an Organizer' },
    { href: '/partner-with-us', label: 'Become an Influencer' },
    { href: '/influencers', label: 'Our Influencers' },
    { href: '/club', label: 'For Nightclubs' },
    { href: '/advertising', label: 'Advertise on NaksYetu' },
]

const legalLinks = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/cookie-policy', label: 'Cookie Policy' },
  { href: '/terms-of-service', label: 'Terms of Service' },
  { href: '/partners-tos', label: "Partner's T&Cs" },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/ad-policy', label: 'Advertising Policy' },
];

type SocialLinks = {
    twitter?: string;
    instagram?: string;
    facebook?: string;
}

export function Footer() {
  const pathname = usePathname();
  const { dbUser } = useAuth();
  const [socials, setSocials] = useState<SocialLinks>({});
  
  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    getSiteContent().then(result => {
        if(result.success && result.data?.socials) {
            setSocials(result.data.socials);
        }
    })
  }, []);

  if (isAdminPage) {
    return null;
  }

  return (
    <footer className="border-t">
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Logo variant="long" />
            </Link>
            <p className="text-sm text-muted-foreground">
              Discover and book tickets for the best events in Nakuru.
            </p>
             <div className="flex space-x-4 mt-4">
                {socials.twitter && <Link href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><Twitter className="h-5 w-5" /></Link>}
                {socials.instagram && <Link href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><Instagram className="h-5 w-5" /></Link>}
                {socials.facebook && <Link href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><Facebook className="h-5 w-5" /></Link>}
            </div>
          </div>
          <div className="col-span-1">
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {companyLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
           <div className="col-span-1">
            <h3 className="font-semibold mb-4">For You</h3>
            <ul className="space-y-2">
              {forYouLinks.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-1">
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              {dbUser && ['admin', 'super-admin'].includes(dbUser.role) && (
                 <li>
                  <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Admin Portal
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground text-center sm:text-left">
                &copy; {new Date().getFullYear()} NaksYetu. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">Built by Mark Allan</p>
                <a href="https://kihumba.com/clients/projects/naksyetu" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                        <Star className="h-4 w-4 mr-2 text-yellow-400 fill-current" />
                        Rate Project
                    </Button>
                </a>
            </div>
            <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <LifeBuoy className="h-4 w-4" />
                Help Centre
            </Link>
        </div>
      </div>
    </footer>
  );
}
