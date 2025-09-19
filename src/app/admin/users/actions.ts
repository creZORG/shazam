

'use server';

import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, Timestamp, orderBy, limit, startAfter, getCountFromServer, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import type { FirebaseUser, UserRole, Event } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { randomBytes } from 'crypto';
import { auth } from '@/lib/firebase/server-auth';
import { cookies, headers } from 'next/headers';
import { sendInvitationEmail } from '@/services/email';
import { createShortLink } from '@/lib/shortlinks';

type UserWithId = FirebaseUser & { id: string };

function serializeUser(doc: any): UserWithId {
    const data = doc.data();
    if (data.createdAt && data.createdAt instanceof Timestamp) {
        data.createdAt = data.createdAt.toDate().toISOString();
    }
     if (data.lastLogin && data.lastLogin instanceof Timestamp) {
        data.lastLogin = data.lastLogin.toDate().toISOString();
    }
    return { id: doc.id, ...data } as UserWithId;
}

export async function getUsersByRole(role: string, page: number = 1, pageSize: number = 25) {
  noStore(); 
  try {
    const usersRef = collection(db, 'users');
    let q;
    let totalUsers = 0;

    const roleQuery = query(usersRef, where('role', '==', role));
    const countSnapshot = await getCountFromServer(roleQuery);
    totalUsers = countSnapshot.data().count;

    q = query(roleQuery, orderBy('createdAt', 'desc'), limit(pageSize));

    if (page > 1) {
        const lastVisibleSnapshot = await getDocs(query(roleQuery, orderBy('createdAt', 'desc'), limit(pageSize * (page - 1))));
        const lastVisible = lastVisibleSnapshot.docs[lastVisibleSnapshot.docs.length - 1];
        if (lastVisible) {
            q = query(roleQuery, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(pageSize));
        }
    }

    const usersSnapshot = await getDocs(q);
    const users = usersSnapshot.docs.map(serializeUser);

    return { 
        success: true, 
        data: users,
        total: totalUsers,
        hasNextPage: (page * pageSize) < totalUsers,
    };

  } catch (error) {
    console.error('Error fetching users by role:', error);
    return { success: false, error: 'Failed to fetch users.' };
  }
}

export async function getAllNonAttendeeUsers() {
    noStore();
    try {
        const rolesToFetch: UserRole[] = ['super-admin', 'admin', 'organizer', 'influencer', 'verifier', 'club', 'developer'];
        const usersByRole: Record<string, UserWithId[]> = {};

        for (const role of rolesToFetch) {
             const q = query(collection(db, 'users'), where('role', '==', role), orderBy('createdAt', 'desc'));
             const snapshot = await getDocs(q);
             usersByRole[role] = snapshot.docs.map(serializeUser);
        }

        return { success: true, data: usersByRole };

    } catch (error: any) {
        console.error('Error fetching non-attendee users:', error);
        return { success: false, error: `Failed to fetch non-attendee users. Reason: ${error.message}` };
    }
}


export async function findUserByUsername(username: string): Promise<{ success: boolean; data?: (FirebaseUser & { id: string }); error?: string; }> {
    noStore();
    if (!username) return { success: false, error: 'Username is required.' };

    try {
        const q = query(collection(db, 'users'), where('name', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { success: false, error: 'User not found.' };
        }
        
        const userDoc = querySnapshot.docs[0];
        const user = serializeUser(userDoc);
        
        return { success: true, data: user };
    } catch (error) {
        console.error('Error finding user:', error);
        return { success: false, error: 'Failed to find user.' };
    }
}

interface InvitationPayload {
    email?: string;
    role: UserRole;
    eventId?: string;
    sendEmail?: boolean;
}

export async function generateInviteLink(payload: InvitationPayload): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
    const { email, role, eventId, sendEmail = false } = payload;
    
    if (sendEmail && !email) {
        return { success: false, error: "Email is required to send an invitation." };
    }

    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
         return { success: false, error: 'Authentication failed. Please log in again.' };
    }

    try {
        if (email) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email));
            const userSnapshot = await getDocs(q);
            
            if (!userSnapshot.empty) {
                const userRole = userSnapshot.docs[0].data().role;
                if (role === 'verifier' && userRole === 'verifier' && eventId) {
                    // This is a common use case, we can proceed.
                } else if (userRole !== 'attendee') {
                     return { success: false, error: `A user with this email already exists with the role '${userRole}'. You can change their role directly in the admin panel.` };
                }
            }
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        let listingName;
        if (eventId) {
            const eventDoc = await getDoc(doc(db, 'events', eventId));
            if(eventDoc.exists()) {
                listingName = (eventDoc.data() as Event).name;
            }
        }

        await addDoc(collection(db, 'invitations'), {
            email: email || null,
            role,
            token,
            expiresAt: Timestamp.fromDate(expiresAt),
            status: 'pending',
            invitedBy: decodedClaims.uid,
            createdAt: serverTimestamp(),
            eventId: eventId || null,
            listingName: listingName || null,
        });
        
        const headersList = headers();
        const host = headersList.get('host') || 'localhost:9002';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const longInviteLink = `${protocol}://${host}/invite/${token}`;
        
        const shortId = await createShortLink(longInviteLink);
        const shortInviteLink = `${protocol}://${host}/l/${shortId}`;
        
        if (sendEmail && email) {
            await sendInvitationEmail({ to: email, role, inviteLink: shortInviteLink, listingName });
        }
        
        return { success: true, inviteLink: shortInviteLink };

    } catch (error) {
        console.error('Error creating invitation:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: errorMessage };
    }
}


export async function getPublishedEventsForSelect() {
    noStore();
    try {
        const q = query(collection(db, 'events'), where('status', '==', 'published'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as {id: string, name: string}));
        return { success: true, data: events };
    } catch (error) {
        return { success: false, error: 'Failed to fetch events.' };
    }
}

export async function getVerifiersForEvent(eventId: string): Promise<{ success: boolean; data?: FirebaseUser[]; error?: string; }> {
    noStore();
    try {
        const q = query(
            collection(db, 'users'), 
            where('assignedEvents', 'array-contains', eventId)
        );
        const snapshot = await getDocs(q);
        const verifiers = snapshot.docs.map(doc => serializeUser(doc as any));
        return { success: true, data: verifiers };
    } catch (error) {
        console.error("Error fetching verifiers for event:", error);
        return { success: false, error: 'Failed to fetch verifiers.' };
    }
}
