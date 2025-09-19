

import { getAuth } from 'firebase-admin/auth';
import { app } from './server-config';

// Ensure app is defined before calling getAuth
export const auth = app ? getAuth(app) : undefined;
