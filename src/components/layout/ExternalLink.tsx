
'use client';

import React, { useState, useMemo, Fragment, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { marked } from 'marked';

interface ExternalLinkProps {
  text: string;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function ExternalLink({ text }: ExternalLinkProps) {
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [parsedHtml, setParsedHtml] = useState('');

  useEffect(() => {
    if (!text || typeof window === 'undefined') {
        setParsedHtml(marked.parse(text || '') as string);
        return;
    };
    
    // Use marked to convert markdown to HTML
    const rawHtml = marked.parse(text) as string;

    // Create a temporary div to parse the HTML and manipulate it
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;

    // Find all links and add the click handler
    tempDiv.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        setTargetUrl(a.href);
      });
      a.classList.add('text-primary', 'hover:underline');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });

    setParsedHtml(tempDiv.innerHTML);
  }, [text]);

  const domain = targetUrl ? getDomain(targetUrl) : null;

  return (
    <>
      <div className="prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: parsedHtml }} />
      
      <AlertDialog open={!!targetUrl} onOpenChange={(open) => !open && setTargetUrl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <AlertDialogTitle className="text-center">You are leaving NaksYetu</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              You are being redirected to an external website. NaksYetu is not responsible for the content of external sites.
              <div className="mt-4 p-2 bg-muted rounded-md text-sm">
                <span className="font-semibold text-foreground">{domain}</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel onClick={() => setTargetUrl(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
                <a href={targetUrl || ''} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
                    Proceed <ArrowRight className="ml-2 h-4 w-4" />
                </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
