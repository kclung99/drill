/**
 * useBackgroundSync Hook
 *
 * Pulls historical data from Supabase when user signs in.
 * Sessions sync immediately on save - no periodic background sync.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { performSync, SyncStatus } from '@/app/services/sessionSyncService';

export const useBackgroundSync = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    error: null,
  });

  // Track which user we've synced for
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      // Only sync when user ID actually changes (not on every auth event)
      if (syncedUserIdRef.current !== user.id) {
        syncedUserIdRef.current = user.id;

        // Pull session data from Supabase
        performSync().then(status => setSyncStatus(status));

        // Pull settings from Supabase (AuthContext already cleared old data)
        import('@/app/services/settingsService').then(({ fetchSettingsFromSupabase }) => {
          fetchSettingsFromSupabase();
        });
      }
    } else {
      // User logged out - reset sync state
      syncedUserIdRef.current = null;
      setSyncStatus({ lastSyncTime: null, error: 'Not logged in' });
    }
  }, [user]);

  return syncStatus;
};
