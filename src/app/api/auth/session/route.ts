
import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';

// The session expires in 14 days.
const expiresIn = 60 * 60 * 24 * 14 * 1000;

export async function POST(request: Request) {
    const { idToken } = await request.json();

    try {
        if (!auth) {
            throw new Error("Firebase Admin Auth is not initialized.");
        }
        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
        cookies().set('session', sessionCookie, {
            httpOnly: true,
            maxAge: expiresIn,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to create session cookie:', error);
        return NextResponse.json({ success: false, error: 'Failed to create session.' }, { status: 401 });
    }
}

export async function DELETE() {
    try {
        cookies().delete('session');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to clear session cookie:', error);
        return NextResponse.json({ success: false, error: 'Failed to clear session.' }, { status: 500 });
    }
}
