/**
 * useBackgroundSync Hook
 *
 * Pulls data from Supabase once when user prop changes.
 * This happens on login, account switch, or page refresh with existing session.
 * Data from Supabase overwrites localStorage (guest data is harmlessly replaced).
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { performSync } from '@/app/services/sessionSyncService';

export const useBackgroundSync = () => {
  const { user } = useAuth();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      // Only sync when user ID changes (prevents re-sync on token refresh)
      if (lastUserIdRef.current !== user.id) {
        lastUserIdRef.current = user.id;

        // Pull all data from Supabase and overwrite localStorage
        performSync();

        // Pull settings from Supabase
        import('@/app/services/settingsService').then(({ fetchSettingsFromSupabase }) => {
          fetchSettingsFromSupabase();
        });
      }
    } else {
      lastUserIdRef.current = null;
    }
  }, [user]);
};
