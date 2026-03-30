import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase';
import { getDocument, setDocument, updateDocument } from '../services/firestoreService';
import { seedIfEmpty } from '../services/seedService';
import type { AppUser } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        await loadOrCreateAppUser(user);
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function loadOrCreateAppUser(firebaseUser: FirebaseUser) {
    let profile = await getDocument<AppUser>('users', firebaseUser.uid);

    if (!profile) {
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL ?? '';
      const isAdmin = firebaseUser.email === adminEmail;

      const newUser: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: firebaseUser.displayName ?? firebaseUser.email ?? 'Kullanıcı',
        role: isAdmin ? 'admin' : 'teacher',
        authProvider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await setDocument('users', firebaseUser.uid, newUser);
      profile = newUser;

      if (isAdmin) {
        await seedIfEmpty(firebaseUser.uid);
      }
    } else {
      // Son giriş zamanını güncelle
      await updateDocument('users', firebaseUser.uid, {
        lastLoginAt: new Date().toISOString(),
      });
      profile.lastLoginAt = new Date().toISOString();
    }

    setAppUser(profile);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function signInWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOutUser() {
    await signOut(auth);
    setAppUser(null);
  }

  async function sendPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function changePassword(newPassword: string) {
    if (!currentUser) throw new Error('Giriş yapılmamış.');
    await updatePassword(currentUser, newPassword);
    if (appUser) {
      await updateDocument('users', appUser.uid, { mustChangePassword: false });
      setAppUser({ ...appUser, mustChangePassword: false });
    }
  }

  const value: AuthContextType = {
    currentUser,
    appUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signOutUser,
    sendPasswordReset,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
