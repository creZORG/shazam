
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;
let db;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    app = !getApps().length
      ? initializeApp({
          credential: cert(serviceAccount),
        })
      : getApp();
    
    db = getFirestore(app);

} else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Server-side Firebase features will be disabled.");
    app = getApps().length ? getApp() : undefined;
    db = app ? getFirestore(app) : undefined;
}


export { app, db };

