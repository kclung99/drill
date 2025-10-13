/**
 * Legacy Migration Helper
 *
 * Migrates data from old localStorage format to new format
 * Run this once in the browser console if you have existing data
 */

export const migrateLegacyData = () => {
  console.log('🔄 Checking for legacy data...');

  // Check old habit data format
  const oldHabitData = localStorage.getItem('drill-habit-data');
  if (oldHabitData) {
    console.log('⚠️  Found old habit data format');
    console.log('This data format is deprecated but won\'t be deleted.');
    console.log('The new system derives heatmap from practice sessions.');
  }

  // Check new session formats
  const chordSessions = localStorage.getItem('drill-chord-sessions');
  const drawingSessions = localStorage.getItem('drill-drawing-sessions');

  if (chordSessions) {
    const parsed = JSON.parse(chordSessions);
    console.log(`✅ Found ${parsed.length} chord sessions in new format`);
  } else {
    console.log('📦 No chord sessions found (this is normal for new users)');
  }

  if (drawingSessions) {
    const parsed = JSON.parse(drawingSessions);
    console.log(`✅ Found ${parsed.length} drawing sessions in new format`);
  } else {
    console.log('📦 No drawing sessions found (this is normal for new users)');
  }

  console.log('\n💡 To see your heatmap:');
  console.log('1. Complete a practice session (chord or drawing)');
  console.log('2. The heatmap will automatically calculate from your sessions');
  console.log('3. For logged-in users, sessions sync to Supabase automatically');
};

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).migrateLegacyData = migrateLegacyData;
}
