export * from '../firebase.ts';
import { app, auth, db, storage } from '../firebase.ts';
import { GoogleAuthProvider } from 'firebase/auth';

export const googleAuthProvider = new GoogleAuthProvider();
export default app;
