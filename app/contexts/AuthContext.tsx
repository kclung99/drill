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
    // Check session once on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user || null;
      setUser(user);
      if (user) {
        const admin = await checkAdminStatus(user.id);
        setIsAdmin(admin);
      }
      setLoading(false);
    });

    // Listen for auth changes (login/logout only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);

      if (newUser) {
        // Check admin status once on sign in
        const admin = await checkAdminStatus(newUser.id);
        setIsAdmin(admin);
      } else {
        // Clear cache on sign out
        adminCheckCache = null;
        setIsAdmin(false);
      }

      // Clear guest data and perform initial sync on sign-in
      if (event === 'SIGNED_IN' && newUser) {
        try {
          // Clear any guest session data to keep data flow simple
          const { clearAllSessions } = await import('@/app/services/sessionDataService');
          clearAllSessions();
          console.log('Cleared guest session data on sign-in');

          // Perform initial sync to pull user's historical data from Supabase
          const { performSync } = await import('@/app/services/sessionSyncService');
          await performSync();
        } catch (error) {
          console.error('Failed to clear guest data or sync:', error);
        }
      }

      // Clear all session data on sign-out
      if (event === 'SIGNED_OUT') {
        try {
          const { clearAllSessions } = await import('@/app/services/sessionDataService');
          clearAllSessions();
          console.log('Cleared all session data on sign-out');
        } catch (error) {
          console.error('Failed to clear session data:', error);
        }
      }

      // Auto-logout on token expired or invalid session
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed - session expired, forcing logout');
        await supabase.auth.signOut();
      }

      if (event === 'USER_UPDATED' && !session) {
        console.warn('User session invalid, forcing logout');
        await supabase.auth.signOut();
      }
    });

    // Periodic session validation (every 5 minutes)
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.warn('Session validation failed, forcing logout');
        await supabase.auth.signOut();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
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
    // Clear all drill-related localStorage data
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter(key => key.startsWith('drill-'))
        .forEach(key => localStorage.removeItem(key));

      // Redirect to home and force refresh
      window.location.href = '/';
    }
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
