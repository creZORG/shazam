

"use client";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { app, db } from "./config";

export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

interface AnalyticsData {
    userAgent: string;
    referrer: string;
}

async function createSession(idToken: string) {
    const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
        throw new Error('Failed to create session.');
    }
}

async function clearSession() {
     await fetch('/api/auth/session', { method: 'DELETE' });
}


export async function signInWithGoogle(analyticsData: AnalyticsData) {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        name: user.displayName || `user_${Math.random().toString(36).substring(2, 9)}`,
        email: user.email,
        phone: user.phoneNumber || null,
        profilePicture: user.photoURL || null,
        provider: 'google',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        role: 'attendee',
        ...analyticsData
      });
    } else {
        await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
    }
    
    const idToken = await user.getIdToken();
    await createSession(idToken);

  } catch (error) {
    console.error("Error signing in with Google: ", error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string, username: string, analyticsData: AnalyticsData) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: username });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: username,
      email: user.email,
      phone: null,
      provider: 'email',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      role: 'attendee',
      ...analyticsData,
    });
    
    const idToken = await user.getIdToken();
    await createSession(idToken);

    return user;
  } catch (error) {
    console.error("Error signing up with email and password: ", error);
    throw error;
  }
}

export async function signInWithEmail(email, password) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data().status === 'suspended') {
        // Don't create a session, just return the status
        await firebaseSignOut(auth);
        return { status: 'suspended' };
    }

    await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
    
    const idToken = await user.getIdToken();
    await createSession(idToken);

  } catch (error) {
    console.error("Error signing in with email and password: ", error);
    throw error;
  }
}

export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Error sending password reset email:", error);
        throw error;
    }
}


export async function signOut() {
  try {
    await firebaseSignOut(auth);
    await clearSession();
  } catch (error) {
    console.error("Error signing out: ", error);
  }
}
