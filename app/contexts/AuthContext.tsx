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
    supabase.auth.getUser().then(async ({ data: { user } }) => {
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

      if (newUser) {
        // TEMPORARY: Block new user registration - only allow existing users
        // Check if user exists in database
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('user_id')
          .eq('user_id', newUser.id)
          .single();

        // If user doesn't exist, sign them out immediately
        if (!userSettings) {
          console.log('Unauthorized user attempt:', newUser.email);
          await supabase.auth.signOut();
          setUser(null);
          setIsAdmin(false);
          return;
        }
        // END TEMPORARY

        // User exists, proceed normally
        setUser(newUser);
        const admin = await checkAdminStatus(newUser.id);
        setIsAdmin(admin);

        // Migrate guest data on first sign-in
        if (event === 'SIGNED_IN') {
          // FUTURE: Re-enable migration for new users
          try {
            const { migrateGuestData } = await import('@/app/services/supabaseSyncService');
            const { isMigrated: checkMigrated } = await import('@/app/services/localStorageService');

            if (!checkMigrated()) {
              await migrateGuestData();
            }
          } catch (error) {
            console.error('Failed to migrate guest data:', error);
          }
        }
      } else {
        // Clear cache on sign out
        adminCheckCache = null;
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    // TEMPORARY: Disable sign-in to prevent new user registration
    alert('Sign-in is currently disabled for new users.');
    return;

    // FUTURE: Re-enable OAuth sign-in
    // await supabase.auth.signInWithOAuth({
    //   provider: 'google',
    //   options: {
    //     redirectTo: `${window.location.origin}${window.location.pathname}`,
    //   },
    // });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
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
