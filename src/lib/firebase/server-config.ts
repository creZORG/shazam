
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App | undefined;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
        const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(serviceAccountJson);

        app = getApps().length
          ? getApp()
          : initializeApp({
              credential: cert(serviceAccount),
            });
        
    } catch (e) {
        console.error("Firebase Admin SDK Initialization Error in server-config.ts:", e);
        console.error("This is likely due to an invalid or missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
        app = undefined;
    }
} else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Server-side Firebase features will be disabled.");
    app = undefined;
}

export function getAdminApp(): App {
    if (!app) {
        throw new Error("Firebase Admin App is not initialized. Check server configuration.");
    }
    return app;
}

export async function getAdminDb() {
    const app = getAdminApp();
    return getFirestore(app);
}
