'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        console.log('🔍 Checking admin status for user:', user.id);
        import('@/app/lib/adminAuth').then(({ isAdmin: checkAdmin }) => {
          checkAdmin().then((admin) => {
            console.log('✅ Admin check result:', admin);
            setIsAdmin(admin);
          });
        });
      } else {
        setIsAdmin(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);

      // Check admin status
      if (newUser) {
        console.log('🔍 Auth change - checking admin for:', newUser.id);
        const { isAdmin: checkAdmin } = await import('@/app/lib/adminAuth');
        const admin = await checkAdmin();
        console.log('✅ Auth change - admin result:', admin);
        setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }

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
    <AuthContext.Provider value={{ user, isAdmin, signIn, signOut }}>
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
