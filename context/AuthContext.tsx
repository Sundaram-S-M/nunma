
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
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../utils/firebase';
import { UserRole, StudentProfileData, TutorProfileData } from '../types';

export interface UserProfile {
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
  bankingDetailsProvided?: boolean;
  studentProfile?: StudentProfileData;
  tutorProfile?: TutorProfileData;
  linkedin?: string;
  expertise?: string[];
  phoneNumber?: string;
  taxDetails?: {
    businessType: 'individual' | 'registered';
    legalName: string;
    phone?: string;
    bankAccountLast4?: string;
    ifsc?: string;
    gstin?: string;
  };
  availability?: any[];
  storage_used_bytes?: number;
  subscription_entitlements?: {
    storageLimit: number;
    storageUsed: number;
    studentLimit: number;
    studentAddonBlocks?: number;
  };
  kycStatus?: 'PENDING' | 'VERIFIED' | 'FAILED' | null;
  razorpay_account_id?: string;
  current_tier?: 'STARTER' | 'STANDARD' | 'PREMIUM';
  isDevBypass?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (profile: Omit<UserProfile, 'uid'>, password: string) => Promise<void>;
  requestOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string, registrationData?: { name: string, role: string }, password?: string) => Promise<any>;
  loginWithGoogle: (selectedRole?: UserRole) => Promise<void>;
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

    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Use onSnapshot for real-time updates (KYC status, storage, etc.)
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), 
          (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data() as UserProfile;
              if (!data.subscription_entitlements) {
                data.subscription_entitlements = { storageLimit: 104857600, storageUsed: 0, studentLimit: 100 };
              }
              setUser({ ...data, uid: firebaseUser.uid });
              setIsAuthenticated(true);
            } else {
              // New user signed in but no profile doc yet
              const newUserProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'New User',
                avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                role: UserRole.STUDENT,
                subscription_entitlements: { storageLimit: 104857600, storageUsed: 0, studentLimit: 100 },
                storage_used_bytes: 0,
                studentProfile: { isComplete: false },
                tutorProfile: { isComplete: false }
              };
              setUser(newUserProfile);
              setIsAuthenticated(true);

              // Auto-create doc if missing
              setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile, { merge: true })
                .catch(err => console.warn("AuthContext: Failed to auto-create profile doc", err));
            }
            setLoading(false);
          },
          (error) => {
            console.warn("AuthContext: Snapshot listener error (possibly permission denied):", error.message);
            // Don't leave the app in a permanent loading state on permission error
            setLoading(false);
          }
        );
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (profile: Omit<UserProfile, 'uid'>, password: string) => {
    if (!auth || !db) throw new Error("Firebase not initialized");

    const userCredential = await createUserWithEmailAndPassword(auth, profile.email, password);
    const uid = userCredential.user.uid;
    const fullProfile: UserProfile = {
      ...profile,
      uid,
      studentProfile: { isComplete: false },
      tutorProfile: { isComplete: false }
    };

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

  const loginWithGoogle = async (selectedRole?: UserRole) => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    if (db && selectedRole) {
        try {
            console.log(`AuthContext: Checking profile for Google User ${result.user.uid}...`);
            const userRef = doc(db, 'users', result.user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                console.log(`AuthContext: Creating new profile for Google User with role: ${selectedRole}`);
                await setDoc(userRef, { 
                  uid: result.user.uid,
                  email: result.user.email,
                  name: result.user.displayName,
                  avatar: result.user.photoURL,
                  role: selectedRole,
                  createdAt: new Date().toISOString()
                }, { merge: true });
            }
        } catch (error) {
            console.error("AuthContext: Critical Error - Failed to update role after Google Login:", error);
            // Option: Alert user or allow proceeding with default role if rules permit
        }
    }
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

    setUser(prev => prev ? { ...prev, ...updates } : null);
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
