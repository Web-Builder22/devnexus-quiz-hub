import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface DbUser {
  id: number;
  uid: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  token: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, role?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateRole: (role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          const preferredRole = localStorage.getItem('user_role_preference');
          const response = await fetch('/api/v1/auth/sync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: preferredRole, displayName: firebaseUser.displayName })
          });
          
          if (response.ok) {
            const data = await response.json().catch(() => null);
            if (data?.user) setDbUser(data.user);
            if (preferredRole) localStorage.removeItem('user_role_preference');
          } else {
            console.warn('Failed to sync user with database, using local fallback profile');
            const storedRole = preferredRole || localStorage.getItem('active_role') || 'student';
            setDbUser({
              id: 1,
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: storedRole,
              mfaEnabled: false
            });
          }
        } catch (error) {
          console.warn('Error syncing user with server, using local fallback profile:', error);
          const storedRole = localStorage.getItem('active_role') || 'student';
          setDbUser({
            id: 1,
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: storedRole,
            mfaEnabled: false
          });
        }
      } else {
        // Check for custom manual auth token
        const customToken = localStorage.getItem('custom_token');
        const customDbUserStr = localStorage.getItem('custom_dbUser');
        if (customToken && customDbUserStr) {
          try {
            const dbUser = JSON.parse(customDbUserStr);
            const customUser = {
              uid: dbUser.uid,
              email: dbUser.email,
              displayName: dbUser.displayName || dbUser.email?.split('@')[0],
              photoURL: null,
              getIdToken: async () => customToken
            };
            setUser(customUser as any);
            setDbUser(dbUser);
            setToken(customToken);
          } catch (e) {
            setUser(null);
            setDbUser(null);
            setToken(null);
          }
        } else {
          setUser(null);
          setDbUser(null);
          setToken(null);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.error || 'Login failed');
        (err as any).code = errorData.error;
        throw err;
      }
      
      const responseData = await response.json().catch(() => ({}));
      const { token: customToken, user: customDbUser } = responseData;
      localStorage.setItem('custom_token', customToken);
      localStorage.setItem('custom_dbUser', JSON.stringify(customDbUser));
      
      const customUser = {
        uid: customDbUser.uid,
        email: customDbUser.email,
        displayName: customDbUser.displayName || customDbUser.email?.split('@')[0],
        photoURL: null,
        getIdToken: async () => customToken
      };
      setUser(customUser as any);
      setDbUser(customDbUser);
      setToken(customToken);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, role?: string) => {
    try {
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.error || 'Signup failed');
        (err as any).code = errorData.error;
        throw err;
      }
      
      const responseData = await response.json().catch(() => ({}));
      const { token: customToken, user: customDbUser } = responseData;
      localStorage.setItem('custom_token', customToken);
      localStorage.setItem('custom_dbUser', JSON.stringify(customDbUser));
      
      const customUser = {
        uid: customDbUser.uid,
        email: customDbUser.email,
        displayName: customDbUser.displayName || customDbUser.email?.split('@')[0],
        photoURL: null,
        getIdToken: async () => customToken
      };
      setUser(customUser as any);
      setDbUser(customDbUser);
      setToken(customToken);
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('custom_token');
      localStorage.removeItem('custom_dbUser');
      
      // If user is logged in via Firebase
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      } else {
        // Manually clear state for custom auth
        setUser(null);
        setDbUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateRole = async (role: string) => {
    localStorage.setItem('active_role', role);
    if (dbUser) {
      setDbUser({ ...dbUser, role });
    }
    if (!token) return;
    try {
      const response = await fetch('/api/v1/auth/role', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.user) setDbUser(data.user);
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      dbUser, 
      token, 
      loading, 
      signInWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signOut, 
      updateRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
