'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);

      // Migrate guest data on first sign-in
      if (event === 'SIGNED_IN' && newUser) {
        try {
          const { migrateGuestData } = await import('@/app/services/supabaseSyncService');
          const { isMigrated: checkMigrated } = await import('@/app/services/localStorageService');

          if (!checkMigrated()) {
            console.log('Migrating guest data to Supabase...');
            await migrateGuestData();
            console.log('Migration complete');
          }
        } catch (error) {
          console.error('Failed to migrate guest data:', error);
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
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
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
