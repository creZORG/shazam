
'use client';

import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logError } from './developer/analytics/actions';
import { useAuth } from '@/hooks/use-auth';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    console.error(error);
    // Log the error to your new logging service
    logError({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      path: pathname,
      userAgent: navigator.userAgent,
      userId: user?.uid,
      userName: user?.displayName || 'Anonymous',
    });
  }, [error, pathname, user]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
      <TriangleAlert className="w-20 h-20 text-destructive mb-4" />
      <h2 className="text-3xl font-bold">Something Went Wrong</h2>
      <p className="mt-2 text-muted-foreground max-w-md">
        We're sorry, but it seems an unexpected error occurred. Our team has been notified. Please try again.
      </p>
      <div className="mt-8">
        <Button onClick={() => reset()}>
          Try Again
        </Button>
      </div>
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-left max-w-2xl w-full">
        <h3 className="font-semibold">Error Details:</h3>
        <code className="text-sm text-muted-foreground break-words">
          {error.message || 'An unknown error occurred.'}
        </code>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70 mt-2">Digest: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
