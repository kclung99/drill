'use client';

import { ReactNode } from 'react';
import { useBackgroundSync } from '@/app/hooks/useBackgroundSync';

/**
 * SyncProvider Component
 *
 * Wraps the app to enable background sync for logged-in users.
 * This component doesn't render anything, it just runs the sync worker.
 */
export default function SyncProvider({ children }: { children: ReactNode }) {
  // This hook runs the background sync worker
  useBackgroundSync();

  return <>{children}</>;
}
