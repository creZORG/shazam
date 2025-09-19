
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getSettings } from '@/app/admin/settings/actions';
import type { SiteSettings } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'brief' | 'long';
  asLink?: boolean;
}

const defaultLogoUrls = {
  brief: 'https://i.postimg.cc/Vk16XVjR/here.png',
  long: 'https://i.postimg.cc/4yK23PLk/download.png',
};

export function Logo({ variant = 'brief', asLink = false, className, ...props }: LogoProps) {
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    getSettings().then(({ settings }) => {
      if (settings) {
        const url = variant === 'brief' ? settings.logoBriefUrl : settings.logoLongUrl;
        setLogoUrl(url || defaultLogoUrls[variant]);
      } else {
        setLogoUrl(defaultLogoUrls[variant]);
      }
      setLoading(false);
    });
  }, [variant]);


  const dimensions = variant === 'brief' 
    ? { width: 60, height: 60 } 
    : { width: 120, height: 40 };

  const logoImage = (
    <div className={cn("relative", className)} style={{ width: dimensions.width, height: dimensions.height }} {...props}>
      {loading ? (
        <Skeleton className="w-full h-full" />
      ) : logoUrl ? (
          <Image
            src={logoUrl}
            alt={`NaksYetu Logo - ${variant}`}
            fill
            className="object-contain"
            priority
          />
      ) : null}
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" aria-label="Go to homepage">
        {logoImage}
      </Link>
    );
  }

  return logoImage;
}
