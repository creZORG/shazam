
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { ShortLink } from '@/lib/types';
import { trackLinkClick } from '@/app/influencer/campaigns/[id]/actions';
import { headers } from 'next/headers';

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
      const { longUrl, promocodeId, trackingLinkId } = linkDoc.data() as ShortLink;
      
      // --- Activity Tracking ---
      if (promocodeId && trackingLinkId) {
        trackLinkClick({
            promocodeId,
            trackingLinkId,
        });
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
