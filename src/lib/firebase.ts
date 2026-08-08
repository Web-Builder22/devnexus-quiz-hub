import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/calendar');
googleAuthProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleAuthProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleAuthProvider.addScope('https://www.googleapis.com/auth/meetings.space.created');
googleAuthProvider.addScope('https://www.googleapis.com/auth/meetings.space.readonly');
googleAuthProvider.addScope('https://www.googleapis.com/auth/meetings.space.settings');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleAuthProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleAuthProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');


export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  const code = error.code || '';
  const message = error.message || '';

  if (code === 'auth/operation-not-allowed' || message.includes('auth/operation-not-allowed')) {
    return 'Email/Password authentication is currently disabled in your Firebase Console. Please go to Firebase Console > Authentication > Sign-in method, click on "Email/Password", and select "Enable".';
  }

  if (code === 'auth/email-already-in-use' || message.includes('auth/email-already-in-use')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }

  if (code === 'auth/invalid-email' || message.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }

  if (code === 'auth/weak-password' || message.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 8 characters with letters, numbers, and special characters.';
  }

  if (
    code === 'auth/user-not-found' || 
    code === 'auth/wrong-password' || 
    code === 'auth/invalid-credential' ||
    message.includes('auth/user-not-found') ||
    message.includes('auth/wrong-password') ||
    message.includes('auth/invalid-credential')
  ) {
    return 'Invalid email or password. Please check your details and try again.';
  }

  if (code === 'auth/user-disabled' || message.includes('auth/user-disabled')) {
    return 'This user account has been disabled. Please contact support.';
  }

  if (code === 'auth/too-many-requests' || message.includes('auth/too-many-requests')) {
    return 'Too many failed attempts. Please wait a few moments and try again.';
  }

  if (code === 'auth/popup-closed-by-user' || message.includes('auth/popup-closed-by-user')) {
    return 'Sign-in window was closed before completing.';
  }

  if (code === 'auth/network-request-failed' || message.includes('auth/network-request-failed')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (typeof message === 'string') {
    return message.replace(/^Firebase:\s*/, '').replace(/\s*\([^)]*\)\.?$/, '');
  }

  return 'An unexpected authentication error occurred. Please try again.';
}
