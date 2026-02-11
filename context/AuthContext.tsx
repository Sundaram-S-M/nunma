
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { UserRole } from '../types';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  bio?: string;
  location?: string;
  dob?: string;
  followersCount?: number;
  followingCount?: number;
  earnings?: number;
  studentsCount?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (profile: Omit<UserProfile, 'uid'>, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  toggleRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      console.warn("AuthContext: Firebase not initialized. Authentication disabled.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
            setIsAuthenticated(true);
          } else {
            // New user signed in but no profile doc yet (edge case)
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email || '', name: 'New User', avatar: '', role: UserRole.STUDENT });
            setIsAuthenticated(true);
          }
        } catch (error: any) {
          console.error("AuthContext: Error fetching user doc:", error);
          if (error.code === 'permission-denied') {
            console.warn("AuthContext: Permission denied for 'users' collection. Using minimal profile fallback.");
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Developer',
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              role: UserRole.STUDENT
            });
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (profile: Omit<UserProfile, 'uid'>, password: string) => {
    if (!auth || !db) throw new Error("Firebase not initialized");

    const userCredential = await createUserWithEmailAndPassword(auth, profile.email, password);
    const uid = userCredential.user.uid;
    const fullProfile: UserProfile = { ...profile, uid };

    try {
      await setDoc(doc(db, 'users', uid), fullProfile);
    } catch (error: any) {
      console.error("AuthContext: Failed to create user profile doc:", error);
      if (error.code !== 'permission-denied') throw error;
      console.warn("AuthContext: Proceeding with local state only due to permission restricted environment.");
    }

    setUser(fullProfile);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };

    if (db) {
      try {
        // Use setDoc with merge to ensure doc creation and persist data
        await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      } catch (error: any) {
        console.error("AuthContext: Failed to update profile in Firestore:", error);
        // Fallback for permission errors or missing docs in locked-down environments
        alert("Failed to save profile changes to cloud. Local changes will persist for this session.");
      }
    } else {
      console.warn("AuthContext: Firebase not initialized. Updating local state only.");
    }

    setUser(updatedUser);
  };

  const toggleRole = async () => {
    if (!user) return;
    try {
      const newRole = user.role === UserRole.STUDENT ? UserRole.TUTOR : UserRole.STUDENT;
      await updateProfile({ role: newRole });
      alert(`Switched to ${newRole === UserRole.TUTOR ? 'Tutor' : 'Student'} mode`);
    } catch (error) {
      console.error("AuthContext: Toggle role failed:", error);
      alert("Failed to switch roles. Please try again.");
    }
  };

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#fcfcfc]">
      <div className="w-12 h-12 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout, updateProfile, toggleRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
