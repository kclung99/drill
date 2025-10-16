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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange:', event, {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      });

      const newUser = session?.user || null;
      setUser(newUser);
      setLoading(false);

      if (newUser) {
        const admin = await checkAdminStatus(newUser.id);
        console.log('[Auth] Admin check result:', admin);
        setIsAdmin(admin);
      } else {
        console.log('[Auth] No user - clearing admin status');
        adminCheckCache = null;
        setIsAdmin(false);
      }

      // Clear drill data on sign-in/out
      if (event === 'SIGNED_IN') {
        // Clear guest data when user signs in
        if (typeof window !== 'undefined') {
          Object.keys(localStorage)
            .filter(key => key.startsWith('drill-'))
            .forEach(key => localStorage.removeItem(key));
        }
      }

      if (event === 'SIGNED_OUT') {
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
