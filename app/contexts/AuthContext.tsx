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

async function checkAdminStatus(userId: string): Promise<boolean> {
  // Return cached result if we already checked this user
  if (adminCheckCache && adminCheckCache.userId === userId) {
    return adminCheckCache.isAdmin;
  }

  // Query database once
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', userId)
      .single();

    const isAdmin = !error && data?.role === 'admin';

    // Cache the result
    adminCheckCache = { userId, isAdmin };

    return isAdmin;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate session on init - clear stale data if session invalid
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        // If no valid session but localStorage has drill data, clear it
        if (!session && typeof window !== 'undefined') {
          const hasDrillData = Object.keys(localStorage).some(key => key.startsWith('drill-'));
          if (hasDrillData) {
            console.log('No valid session - clearing stale localStorage data');
            Object.keys(localStorage)
              .filter(key => key.startsWith('drill-'))
              .forEach(key => localStorage.removeItem(key));
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    initAuth();

    // Just listen to auth state changes - Supabase handles everything
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);
      setLoading(false);

      if (newUser) {
        const admin = await checkAdminStatus(newUser.id);
        setIsAdmin(admin);
      } else {
        adminCheckCache = null;
        setIsAdmin(false);
      }

      // Clear localStorage on sign-in/out
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        if (typeof window !== 'undefined') {
          Object.keys(localStorage)
            .filter(key => key.startsWith('drill-'))
            .forEach(key => localStorage.removeItem(key));
        }
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
