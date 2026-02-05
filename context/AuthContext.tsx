
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  bio?: string;
  location?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (profile: UserProfile, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  toggleRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USER: UserProfile = {
  name: 'Sundaram S M',
  email: 'sachinsundar145@gmail.com',
  avatar: 'https://picsum.photos/seed/sundaram/80/80',
  role: UserRole.STUDENT,
  bio: 'Senior Product Manager at Google | Expert in Data Science & Product Lifecycle.',
  location: 'Tirunelveli, Tamil Nadu, India'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('nunma_user');
    const authStatus = localStorage.getItem('nunma_auth');
    if (savedUser && authStatus === 'true') {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Simulated login logic
    const mockUser = { ...DEFAULT_USER, email };
    setUser(mockUser);
    setIsAuthenticated(true);
    localStorage.setItem('nunma_user', JSON.stringify(mockUser));
    localStorage.setItem('nunma_auth', 'true');
  };

  const signup = async (profile: UserProfile, password: string) => {
    // Simulated signup logic
    setUser(profile);
    setIsAuthenticated(true);
    localStorage.setItem('nunma_user', JSON.stringify(profile));
    localStorage.setItem('nunma_auth', 'true');
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('nunma_user');
    localStorage.removeItem('nunma_auth');
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('nunma_user', JSON.stringify(updatedUser));
  };

  const toggleRole = () => {
    if (!user) return;
    const newRole = user.role === UserRole.STUDENT ? UserRole.TUTOR : UserRole.STUDENT;
    updateProfile({ role: newRole });
  };

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
