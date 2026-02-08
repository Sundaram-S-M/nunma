
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
    // Mock Mode Fallback: Check localStorage if Firebase is not initialized
    const checkMockAuth = () => {
      const mockUser = localStorage.getItem('nunma_mock_user');
      if (mockUser) {
        setUser(JSON.parse(mockUser));
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    if (!auth || !db) {
      console.log("AuthContext: Using Mock Mode (Firebase not initialized)");
      checkMockAuth();
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
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user doc:", error);
          checkMockAuth();
        }
      } else {
        checkMockAuth();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) {
      // Mock Login Logic
      const mockUser = localStorage.getItem('nunma_mock_user');
      if (mockUser) {
        const parsed = JSON.parse(mockUser);
        if (parsed.email === email) {
          setUser(parsed);
          setIsAuthenticated(true);
          return;
        }
      }
      throw new Error("Mock Auth: Identity not found in local storage. Please create a profile first.");
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (profile: Omit<UserProfile, 'uid'>, password: string) => {
    if (!auth || !db) {
      // Mock Signup Logic
      const uid = 'mock-' + Date.now();
      const fullProfile: UserProfile = { ...profile, uid };
      localStorage.setItem('nunma_mock_user', JSON.stringify(fullProfile));
      setUser(fullProfile);
      setIsAuthenticated(true);
      return;
    }
    const userCredential = await createUserWithEmailAndPassword(auth, profile.email, password);
    const uid = userCredential.user.uid;
    const fullProfile: UserProfile = { ...profile, uid };

    await setDoc(doc(db, 'users', uid), fullProfile);
    setUser(fullProfile);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    if (!auth) {
      localStorage.removeItem('nunma_mock_user');
      setUser(null);
      setIsAuthenticated(false);
      return;
    }
    await signOut(auth);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };

    if (!db) {
      localStorage.setItem('nunma_mock_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return;
    }

    await updateDoc(doc(db, 'users', user.uid), updates);
    setUser(updatedUser);
  };

  const toggleRole = async () => {
    if (!user) return;
    const newRole = user.role === UserRole.STUDENT ? UserRole.TUTOR : UserRole.STUDENT;
    await updateProfile({ role: newRole });
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
