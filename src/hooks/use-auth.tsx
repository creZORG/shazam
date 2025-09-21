
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signInWithGoogle, signOut, signUpWithEmail, signInWithEmail, resetPassword } from "@/lib/firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { FirebaseUser } from "@/lib/types";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface AuthContextType {
  user: User | null;
  dbUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: (analyticsData: { userAgent: string; referrer: string; }) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string, analyticsData: { userAgent: string; referrer: string; }) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<{status?: string} | void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userDocRef = doc(db, "users", user.uid);
        
        // Use onSnapshot for real-time updates
        const unsubFromDoc = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data() as FirebaseUser;
                setDbUser(userData);

                // Handle suspension in real-time
                if (userData.status === 'suspended') {
                    signOut().then(() => {
                        router.push('/login?reason=suspended');
                    });
                }

            } else {
                setDbUser(null);
            }
            setLoading(false);
        });

        // Detach listener on cleanup
        return () => unsubFromDoc();

      } else {
        setUser(null);
        setDbUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);


  const value = {
    user,
    dbUser,
    loading,
    signInWithGoogle: async (analyticsData: { userAgent: string; referrer: string; }) => {
      await signInWithGoogle(analyticsData);
    },
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    signOut: async () => {
      await signOut();
      setDbUser(null);
      router.push("/");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
