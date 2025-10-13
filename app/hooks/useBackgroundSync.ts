/**
 * useBackgroundSync Hook
 *
 * React hook that manages background synchronization of localStorage data
 * to Supabase for logged-in users.
 *
 * Usage:
 *   const syncStatus = useBackgroundSync();
 *   // syncStatus.pending shows items in queue
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { performSync, getSyncStatus, SyncStatus } from '@/app/services/sessionSyncService';

const SYNC_INTERVAL_MS = 30000; // 30 seconds

export const useBackgroundSync = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pending: 0,
    lastSyncTime: null,
    error: null,
  });

  useEffect(() => {
    // Only sync if user is logged in
    if (!user) {
      return;
    }

    // Initial sync on mount (pull + push)
    const doInitialSync = async () => {
      const status = await performSync();
      setSyncStatus(status);
    };

    // Periodic sync (pull + push)
    const doPeriodicSync = async () => {
      const status = await performSync();
      setSyncStatus(status);
    };

    doInitialSync();

    // Set up periodic sync (every 30s)
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
        error: 'Not logged in',
      });
    }
  }, [user]);

  return syncStatus;
};
