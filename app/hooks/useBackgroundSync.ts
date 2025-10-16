/**
 * useBackgroundSync Hook
 *
 * Pulls historical data from Supabase on first login.
 * Sessions sync immediately on save - no periodic background sync.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { performSync, SyncStatus } from '@/app/services/sessionSyncService';

export const useBackgroundSync = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    error: null,
  });

  useEffect(() => {
    if (user) {
      // Pull historical data on first login
      performSync().then(status => setSyncStatus(status));
    } else {
      setSyncStatus({ lastSyncTime: null, error: 'Not logged in' });
    }
  }, [user]);

  return syncStatus;
};
