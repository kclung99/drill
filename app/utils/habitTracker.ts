/**
 * Habit Tracker Utility (DEPRECATED - Use heatmapService instead)
 *
 * This file is kept for backward compatibility only.
 * New code should use heatmapService.ts for heatmap calculation.
 */

// Re-export for backward compatibility
export {
  generateHeatmapDates as generateDatesForHeatmap,
  getMonthLabels,
  type DayHeatmapData,
} from '@/app/services/heatmapService';

// Deprecated: incrementSession is no longer needed
export const incrementSession = (type: 'music' | 'drawing'): void => {
  console.warn('incrementSession is deprecated. Heatmap is now derived from practice sessions.');
};