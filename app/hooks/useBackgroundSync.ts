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
      // Pull data if we haven't synced for this user yet in this session
      if (syncedUserIdRef.current !== user.id) {
        console.log('New user session - pulling data from Supabase');
        syncedUserIdRef.current = user.id;
        performSync().then(status => setSyncStatus(status));
      }
    } else {
      // User logged out - reset
      syncedUserIdRef.current = null;
      setSyncStatus({ lastSyncTime: null, error: 'Not logged in' });
    }
  }, [user]);

  return syncStatus;
};
