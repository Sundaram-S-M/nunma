
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../utils/firebase';
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
  headline?: string;
  experience?: any[];
  education?: any[];
  skills?: string[];
  followersCount?: number;
  followingCount?: number;
  earnings?: number;
  studentsCount?: number;
  onboardingCompleted?: boolean;
  linkedin?: string;
  expertise?: string[];
  availability?: any[];
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (profile: Omit<UserProfile, 'uid'>, password: string) => Promise<void>;
  requestOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string, registrationData?: { name: string, role: string }, password?: string) => Promise<any>;
  loginWithGoogle: () => Promise<void>;
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
            const data = userDoc.data() as UserProfile;
            setUser({ ...data, uid: firebaseUser.uid }); // Ensure UID is always present from auth
            setIsAuthenticated(true);
          } else {
            // New user signed in but no profile doc yet (edge case)
            const newUserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'New User',
              avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              role: UserRole.STUDENT
            };
            setUser(newUserProfile);
            setIsAuthenticated(true);

            // Auto-create doc if missing (for Google sign-in)
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile, { merge: true });
            } catch (err) {
              console.warn("AuthContext: Failed to auto-create profile doc", err);
            }
          }
        } catch (error: any) {
          console.error("AuthContext: Error fetching user doc:", error);
          if (error.code === 'permission-denied') {
            console.warn("AuthContext: Permission denied for 'users' collection. Using minimal profile fallback.");
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'Developer',
              avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
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

  const requestOTP = async (email: string) => {
    if (!functions) throw new Error("Firebase Functions not initialized");
    const requestOTPFunc = httpsCallable(functions, 'requestOTP');
    await requestOTPFunc({ email });
  };

  const verifyOTP = async (email: string, otp: string, registrationData?: { name: string, role: string }, password?: string) => {
    if (!auth || !functions) throw new Error("Firebase not initialized");
    const verifyOTPFunc = httpsCallable<{ email: string, otp: string, registrationData?: any, password?: string }, any>(functions, 'verifyOTPAndSignIn');
    const result = await verifyOTPFunc({ email, otp, registrationData, password });

    if (result.data.verified && !result.data.customToken) {
      // Intermediate step for registration (OTP verified, need password)
      return result.data;
    }

    if (result.data.customToken) {
      await signInWithCustomToken(auth, result.data.customToken);
    } else {
      throw new Error("Failed to receive authentication token.");
    }
  };

  const loginWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.uid) {
      console.error("AuthContext: Cannot update profile - User UID missing");
      return;
    }

    const updatedUser = { ...user, ...updates };

    if (db) {
      try {
        console.log(`AuthContext: Attempting to update profile for ${user.uid}...`);
        await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
        console.log("AuthContext: Profile updated successfully in Firestore");
      } catch (error: any) {
        console.error("AuthContext: Failed to update profile in Firestore:", error);

        let errorMsg = "Failed to save profile changes to cloud.";
        if (error.code === 'permission-denied') {
          errorMsg += " Permission denied. Your account may have restrictions.";
        } else if (error.code === 'unavailable') {
          errorMsg += " Firestore is currently offline.";
        }

        alert(`${errorMsg} Local changes will persist for this session.`);
      }
    } else {
      console.warn("AuthContext: Firebase not initialized (db is null). Updating local state only.");
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
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      signup,
      requestOTP,
      verifyOTP,
      loginWithGoogle,
      logout,
      updateProfile,
      toggleRole
    }}>
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
