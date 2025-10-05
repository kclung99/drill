/**
 * useBackgroundSync Hook
 *
 * React hook that manages background synchronization of localStorage data
 * to Supabase for logged-in users.
 *
 * Usage:
 *   const syncStatus = useBackgroundSync();
 *   // syncStatus.pendingCount shows items in queue
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { syncToSupabase, getSyncStatus, SyncStatus } from '@/app/services/supabaseSyncService';

const SYNC_INTERVAL_MS = 30000; // 30 seconds

export const useBackgroundSync = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSync: true,
    lastSyncTime: null,
    pendingCount: 0,
    error: null,
  });

  useEffect(() => {
    // Only sync if user is logged in
    if (!user) {
      return;
    }

    // Initial sync on mount (pull from Supabase first, then push any local changes)
    const doInitialSync = async () => {
      const { syncFromSupabase } = await import('@/app/services/supabaseSyncService');
      await syncFromSupabase(); // Pull remote data first
      const status = await syncToSupabase(); // Then push any local changes
      setSyncStatus(status);
    };

    // Periodic sync (push only)
    const doPeriodicSync = async () => {
      const status = await syncToSupabase();
      setSyncStatus(status);
    };

    doInitialSync();

    // Set up periodic sync (every 30s, push only)
    const interval = setInterval(doPeriodicSync, SYNC_INTERVAL_MS);

    // Clean up on unmount
    return () => clearInterval(interval);
  }, [user]);

  // Update status even when not logged in
  useEffect(() => {
    if (!user) {
      const status = getSyncStatus();
      setSyncStatus({
        ...status,
        isSync: false,
        error: 'Not logged in',
      });
    }
  }, [user]);

  return syncStatus;
};
