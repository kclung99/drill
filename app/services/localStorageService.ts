/**
 * localStorage Service (DEPRECATED - Use sessionDataService instead)
 *
 * This file is kept for backward compatibility only.
 * New code should use:
 * - sessionDataService.ts for session storage
 * - heatmapService.ts for heatmap calculation
 */

// Re-export for backward compatibility
export {
  getChordSessions,
  getDrawingSessions,
  type ChordSession,
  type DrawingSession,
  type ChordSessionConfig,
  type ChordSessionMetrics,
  type ChordSessionResult,
  type DrawingSessionConfig,
  type DrawingSessionResults,
} from './sessionDataService';

// Deprecated: incrementSession is no longer needed
// Heatmap is derived from sessions automatically
export const incrementSession = (type: 'music' | 'drawing'): void => {
  console.warn('incrementSession is deprecated. Heatmap is now derived from practice sessions.');
};
