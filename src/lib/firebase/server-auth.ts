
'use server';

import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './server-config';

/**
 * Returns the Firebase Admin Auth instance.
 * This is an async function to comply with "use server" requirements.
 */
export async function getAdminAuth() {
  const app = getAdminApp();
  if (!app) {
    throw new Error("Firebase Admin App is not initialized. Check server configuration.");
  }
  return getAuth(app);
}
