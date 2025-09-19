
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { ShortLink } from '@/lib/types';
import { headers } from 'next/headers';

async function trackClick(shortId: string, invitationId: string) {
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    try {
        await addDoc(collection(db, 'invitationClicks'), {
            invitationId,
            shortId,
            timestamp: serverTimestamp(),
            ipAddress,
            userAgent,
        });
    } catch (error) {
        console.error("Failed to track invitation click:", error);
    }
}

export async function GET(
  request: Request,
  { params }: { params: { shortId: string } }
) {
  const shortId = params.shortId;

  if (!shortId) {
    return NextResponse.redirect(new URL('/not-found', request.url));
  }

  if (!db) {
     console.error('Firestore not initialized.');
     return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const linkDocRef = doc(db, 'shortLinks', shortId);
    const linkDoc = await getDoc(linkDocRef);

    if (linkDoc.exists()) {
      const { longUrl, invitationId } = linkDoc.data() as ShortLink;
      
      // --- Activity Tracking ---
      if (invitationId) {
        trackClick(shortId, invitationId);
      }
      // --- End Activity Tracking ---

      // Perform a 302 temporary redirect
      return NextResponse.redirect(new URL(longUrl, request.url));
    } else {
      // If the link doesn't exist, redirect to a 404 page
      return NextResponse.redirect(new URL('/not-found', request.url));
    }
  } catch (error) {
    console.error('Error fetching short link:', error);
    // Redirect to a generic error page or homepage on error
    return NextResponse.redirect(new URL('/', request.url));
  }
}
