'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check admin status ONCE and cache in memory
let adminCheckCache: { userId: string; isAdmin: boolean } | null = null;

// Track last user ID to detect changes (login, logout, account switch)
// We use ID instead of User object because User is a new object on every auth event
let lastUserId: string | null = null;

async function checkAdminStatus(userId: string): Promise<boolean> {
  // Return cached result if we already checked this user in this session
  if (adminCheckCache && adminCheckCache.userId === userId) {
    return adminCheckCache.isAdmin;
  }

  // Query database
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', userId)
      .single();

    const isAdmin = !error && data?.role === 'admin';

    // Cache in memory for this session
    adminCheckCache = { userId, isAdmin };

    return isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // Just listen to auth state changes - Supabase handles everything
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user || null;
      const newUserId = newUser?.id || null;
      const userChanged = newUserId !== lastUserId;

      // Handle user changes (login, logout, account switch)
      if (userChanged) {
        // Clear drill data when switching users
        if (typeof window !== 'undefined') {
          Object.keys(localStorage)
            .filter(key => key.startsWith('drill-'))
            .forEach(key => localStorage.removeItem(key));
        }

        lastUserId = newUserId;
        adminCheckCache = null;
      }

      setUser(newUser);
      setLoading(false);

      if (newUser) {
        const admin = await checkAdminStatus(newUser.id);
        setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
  };

  const signOut = async () => {
    // Clear all data and sign out
    if (typeof window !== 'undefined') {
      localStorage.clear(); // Nuclear option - clear everything
    }

    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
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
