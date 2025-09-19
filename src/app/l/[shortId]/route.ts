

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import type { ShortLink } from '@/lib/types';
import { headers } from 'next/headers';

async function trackClick(shortId: string, linkData: ShortLink) {
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    try {
        // If it's a tracking link (for a promocode or general campaign), increment its click count
        if (linkData.trackingLinkId && linkData.promocodeId) {
            const trackingLinkRef = doc(db, 'promocodes', linkData.promocodeId, 'trackingLinks', linkData.trackingLinkId);
            await updateDoc(trackingLinkRef, { clicks: increment(1) });
        } else if (linkData.trackingLinkId) {
            const trackingLinkRef = doc(db, 'trackingLinks', linkData.trackingLinkId);
            await updateDoc(trackingLinkRef, { clicks: increment(1) });
        }
        
        // If it's an invitation link, log the click event separately
        if (linkData.invitationId) {
             await addDoc(collection(db, 'invitationClicks'), {
                invitationId: linkData.invitationId,
                shortId: shortId,
                timestamp: serverTimestamp(),
                ipAddress,
                userAgent,
            });
        }
        
    } catch (error) {
        console.error("Failed to track click:", error);
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
      const linkData = linkDoc.data() as ShortLink;
      
      // Perform activity tracking without awaiting it to avoid blocking the redirect
      trackClick(shortId, linkData);
      
      const response = NextResponse.redirect(new URL(linkData.longUrl, request.url));
      
      // Set a cookie to attribute purchase conversions
      if (linkData.trackingLinkId) {
        const cookieData = { trackingLinkId: linkData.trackingLinkId, promocodeId: linkData.promocodeId };
        response.cookies.set('nak_tracker', JSON.stringify(cookieData), {
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        });
      }

      return response;
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
