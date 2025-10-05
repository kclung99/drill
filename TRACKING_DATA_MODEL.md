# Tracking Data Model Proposal

## Overview
This document outlines the data tracking requirements for the Drill app, which has two main practice modes: **Music (Chord Practice)** and **Drawing (Reference Practice)**.

---

## What We're Tracking

### 1. **Habit Tracking (Simple Session Counters)**
Track daily completion of practice sessions to build a GitHub-style heatmap showing practice consistency.

**Use Cases:**
- Show year-long heatmap on home page
- Display today's progress (e.g., "2/2 music sessions completed")
- Filter by music/drawing/combined view
- Motivate daily practice habits

### 2. **Music Practice Sessions (Detailed Analytics)**
Track detailed chord practice performance for progress tracking and skill improvement.

**Use Cases:**
- View practice history and trends
- Track accuracy improvements over time
- Identify difficult chord types/scales
- Show personal bests (fastest time, highest accuracy)
- Session duration statistics

### 3. **Drawing Practice Sessions (Simple Logging)**
Track drawing session completions for habit building (less analytics than music).

**Use Cases:**
- Log session completion for habit tracking
- Track session duration
- Track filter preferences used (category, gender, clothing)

---

## Current Implementation Analysis

### **localStorage Data Structure**
```typescript
// Key: 'drill-habit-data'
{
  settings: {
    musicDailyTarget: 2,
    drawingDailyTarget: 2
  },
  days: [
    {
      date: "2025-10-05",
      musicSessions: 2,
      drawingSessions: 1
    }
  ]
}
```

### **Practice Page Session Data** (currently NOT saved)
```typescript
interface SessionResult {
  chord: string;           // e.g., "Cmaj", "F#min"
  attempts: number;        // how many tries before correct
  correctTime: number;     // time to get it right (ms)
  totalTime: number;       // total time on this chord (ms)
}

// Session metrics (calculated, not saved):
- totalAttempts
- correctChords
- chordAccuracy (%)
- avgTimePerChord
- fastestTime
- slowestTime
```

### **Session Configuration**
```typescript
{
  duration: 3 | 5 | 10 | 20,  // minutes
  mode: 'chordTypes' | 'scales',
  chordTypes: ['maj', 'min', 'dim', ...],  // if mode = chordTypes
  scales: ['C', 'D', 'E', ...]             // if mode = scales
}
```

---

## Data Architecture: localStorage-First Hybrid

### **Core Principle**
All tracking uses a **unified pipeline** that writes to localStorage first, then optionally syncs to Supabase for logged-in users.

**Pipeline:**
```
ALL USERS (guest + logged in):
  1. Write to localStorage (immediate, synchronous)
  2. Update UI from localStorage (instant feedback)

LOGGED IN USERS ONLY:
  3. Queue for Supabase sync (async, background)
  4. Batch upload to Supabase (every 30s or on session end)
```

**Benefits:**
- ✅ Guest and logged-in users share the same code path
- ✅ Instant UI updates (no network wait)
- ✅ Offline support
- ✅ Guest data persists if they sign up later
- ✅ Live mode can record high-frequency events to localStorage, batch upload later

**Trade-off:**
- Need sync logic and queue management (acceptable complexity)

---

## Settings (Hardcoded for Now)

**Daily Targets:**
- Music: `2 sessions/day` (hardcoded)
- Drawing: `2 sessions/day` (hardcoded)

**Future:** Can move to `user_settings` table later if customization is needed.

---

## Proposed Database Schema

### **Table 1: `habit_sessions`**
**Purpose:** Simple session logging for heatmap (one row per completed session)

```sql
CREATE TABLE habit_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('music', 'drawing')),
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habit_sessions_user_date ON habit_sessions(user_id, session_date);
CREATE INDEX idx_habit_sessions_user_type_date ON habit_sessions(user_id, session_type, session_date);
```

**Attributes:**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique session ID |
| user_id | UUID | Who completed the session |
| session_type | TEXT | 'music' or 'drawing' |
| session_date | DATE | Date of session (for heatmap) |
| created_at | TIMESTAMPTZ | When session was logged |

**Notes:**
- Each completed session creates ONE row
- Heatmap queries aggregate COUNT by date
- Supports filtering by session_type
- Timezone-aware: session_date should be in user's timezone

---

## Focus: Music Tables Only (Phase 1)

For initial implementation, we'll focus on music tracking only. Drawing sessions will continue using the simple habit tracking.

---

### **Table 2: `chord_practice_sessions`**
**Purpose:** Detailed music practice analytics (one row per practice session)

```sql
CREATE TABLE chord_practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session config
  duration_minutes INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('chordTypes', 'scales')),
  chord_types TEXT[],          -- e.g., ['maj', 'min', 'dim']
  scales TEXT[],               -- e.g., ['C', 'D', 'Eb']

  -- Session results (summary)
  total_chords INTEGER NOT NULL,
  total_attempts INTEGER NOT NULL,
  accuracy DECIMAL(5,2),           -- Percentage (0-100)
  avg_time_per_chord DECIMAL(6,2), -- Seconds
  fastest_time DECIMAL(6,2),       -- Seconds
  slowest_time DECIMAL(6,2),       -- Seconds

  -- Individual chord results (JSONB for flexibility)
  chord_results JSONB,
  -- Example: [
  --   {"chord": "Cmaj", "attempts": 2, "correctTime": 3500, "totalTime": 3500},
  --   {"chord": "Fmin", "attempts": 3, "correctTime": 5200, "totalTime": 5200}
  -- ]

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chord_sessions_user_id ON chord_practice_sessions(user_id);
CREATE INDEX idx_chord_sessions_created_at ON chord_practice_sessions(created_at DESC);
CREATE INDEX idx_chord_sessions_user_date ON chord_practice_sessions(user_id, created_at DESC);
```

**Attributes:**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique session ID |
| user_id | UUID | Who practiced |
| duration_minutes | INTEGER | Session length (3, 5, 10, 20) |
| mode | TEXT | 'chordTypes' or 'scales' |
| chord_types | TEXT[] | Array of chord type IDs (if mode=chordTypes) |
| scales | TEXT[] | Array of scale IDs (if mode=scales) |
| total_chords | INTEGER | How many chords answered correctly |
| total_attempts | INTEGER | Total attempts across all chords |
| accuracy | DECIMAL(5,2) | Success rate percentage |
| avg_time_per_chord | DECIMAL(6,2) | Average time in seconds |
| fastest_time | DECIMAL(6,2) | Best chord time in seconds |
| slowest_time | DECIMAL(6,2) | Slowest chord time in seconds |
| chord_results | JSONB | Detailed per-chord breakdown |
| created_at | TIMESTAMPTZ | When session completed |

**Notes:**
- Summary metrics enable fast queries without parsing JSONB
- `chord_results` provides drill-down analysis
- Can aggregate to find weak chord types over time

---

## Drawing Tables (Deferred to Phase 2)

Drawing practice will continue using simple `habit_sessions` logging for now. Detailed drawing analytics can be added later if needed.

---

## Data Flow (localStorage-First)

### **Music Practice Session**
```typescript
// On session completion:

// 1. Calculate metrics from sessionResults array
const metrics = calculateSessionMetrics(sessionResults);

// 2. Save detailed session to localStorage (immediate)
localStorage.setItem('drill-chord-sessions', JSON.stringify([
  ...existingSessions,
  {
    id: generateId(),
    config: { duration, mode, chordTypes, scales },
    metrics: metrics,
    chordResults: sessionResults,
    timestamp: Date.now()
  }
]));

// 3. Increment habit counter in localStorage (immediate)
incrementSession('music'); // existing function

// 4. Update UI (instant feedback)
refreshHeatmap();
showResults(metrics);

// 5. If user is logged in, queue for Supabase sync (async)
if (user) {
  queueForSync('chord_practice_sessions', sessionData);
  queueForSync('habit_sessions', { type: 'music', date: today });
}
```

### **Drawing Practice Session**
```typescript
// On session completion:

// 1. Increment habit counter in localStorage (immediate)
incrementSession('drawing'); // existing function

// 2. Update UI (instant feedback)
refreshHeatmap();

// 3. If user is logged in, queue for Supabase sync (async)
if (user) {
  queueForSync('habit_sessions', { type: 'drawing', date: today });
}
```

### **Background Sync Worker** (New)
```typescript
// Runs every 30s if user is logged in and online
async function syncToSupabase() {
  if (!user || !navigator.onLine) return;

  const queue = getSyncQueue();
  if (queue.length === 0) return;

  try {
    // Batch insert to Supabase
    await supabase.from('habit_sessions').upsert(queue.habitSessions);
    await supabase.from('chord_practice_sessions').insert(queue.chordSessions);

    // Clear synced items from queue
    clearSyncQueue();
  } catch (error) {
    console.error('Sync failed, will retry', error);
    // Queue remains, will retry on next tick
  }
}
```

### **Guest → User Migration** (New)
```typescript
// On first sign-in:
async function migrateGuestData(userId: string) {
  // 1. Read all localStorage data
  const habitData = getHabitData();
  const chordSessions = getLocalChordSessions();

  // 2. Upload to Supabase with user_id
  await supabase.from('habit_sessions').insert(
    habitData.days.flatMap(day => [
      ...Array(day.musicSessions).fill({
        user_id: userId,
        session_type: 'music',
        session_date: day.date
      }),
      ...Array(day.drawingSessions).fill({
        user_id: userId,
        session_type: 'drawing',
        session_date: day.date
      })
    ])
  );

  await supabase.from('chord_practice_sessions').insert(
    chordSessions.map(s => ({ ...s, user_id: userId }))
  );

  // 3. Keep localStorage intact (still primary source)
  // 4. Mark as migrated to prevent re-upload
  localStorage.setItem('drill-migrated', 'true');
}
```

### **Heatmap Display**
```typescript
// ALWAYS read from localStorage (fast)
const habitData = getHabitData();

// For logged-in users, sync from Supabase on page load (background)
if (user) {
  syncFromSupabase(); // updates localStorage with any missing data
}
```

---

## Questions for Review

### **1. Session Completion Definition**
- **Music:** Should completing ANY duration count as 1 session? Or does 1 session = minimum duration?
  - Current: Any completed session counts as 1 (regardless of 3min vs 20min)
  - **Recommendation:** Keep current behavior (any completion = 1 session)

### **2. Timezone Handling**
- Should `session_date` use user's local timezone or UTC?
  - Current localStorage: Uses `NEXT_PUBLIC_TIMEZONE` (America/Chicago)
  - **Recommendation:** Continue using `NEXT_PUBLIC_TIMEZONE` for consistency
  - Future: Could add user timezone preference

### **3. Multiple Sessions Per Day**
- Can users complete more than their daily target?
  - Current: Yes (musicSessions can be > musicDailyTarget)
  - Heatmap shows "both complete" when both targets met
  - **Recommendation:** Keep unlimited (good for motivated users)

### **4. Sync Queue Management**
- How to handle failed syncs?
  - **Recommendation:** Retry on next sync tick (every 30s)
  - Add exponential backoff if repeated failures?
  - Show sync status indicator in UI?

### **5. Sync Conflicts**
- What if user practices on two devices while offline?
  - **Recommendation:** Supabase is append-only (habit_sessions, chord_sessions)
  - Just merge both when they sync (duplicate sessions are ok)
  - localStorage remains device-specific

### **6. localStorage Schema Updates**
- Need new localStorage keys:
  - `drill-habit-data` (existing - keep)
  - `drill-chord-sessions` (new - detailed sessions)
  - `drill-sync-queue` (new - pending uploads)
  - `drill-migrated` (new - migration flag)

---

## Storage Estimates

### **localStorage**
- `drill-habit-data`: ~10 KB (365 days × ~30 bytes)
- `drill-chord-sessions`: ~1.5 MB (730 sessions × ~2 KB)
- `drill-sync-queue`: ~50 KB (temporary, cleared after sync)
- **Total: ~1.6 MB/user/year** (well within 5-10MB browser limits)

### **Supabase (Logged-in users only)**
- `habit_sessions`: ~73 KB/user/year
- `chord_practice_sessions`: ~1.46 MB/user/year
- **Total: ~1.5 MB/user/year** (very reasonable)

---

## Implementation Plan

### **Phase 1: Database Setup**
1. Drop existing Supabase tables (if any)
2. Create `habit_sessions` table
3. Create `chord_practice_sessions` table
4. Test table creation and RLS policies

### **Phase 2: localStorage Enhancements**
1. Create `app/services/localStorageService.ts`
   - Manage all localStorage keys
   - Add `drill-chord-sessions` storage
   - Add `drill-sync-queue` storage
2. Update `habitTracker.ts` to use service
3. Add chord session storage functions

### **Phase 3: Supabase Sync Layer**
1. Create `app/services/supabaseSyncService.ts`
   - Queue management (add to queue, get queue, clear queue)
   - Batch upload to Supabase
   - Error handling and retry logic
2. Create `app/hooks/useBackgroundSync.ts`
   - React hook for sync worker
   - Runs every 30s if user logged in
   - Provides sync status

### **Phase 4: Update Practice Page**
1. Modify `app/practice/page.tsx`
   - Save detailed session to localStorage on completion
   - Call sync queue function if user logged in
2. Test guest mode (localStorage only)
3. Test logged-in mode (localStorage + Supabase sync)

### **Phase 5: Guest Migration**
1. Create `app/utils/migrateGuestData.ts`
2. Call on first sign-in via AuthContext
3. Test migration flow

### **Phase 6: Multi-Device Sync** (Optional/Future)
1. Add `syncFromSupabase()` to pull remote data
2. Merge remote sessions into localStorage
3. Handle conflicts (append-only is safe)

---

## Next Steps

1. ✅ **Review this proposal** - Confirm localStorage-first approach
2. **Answer remaining questions** - Sync retry strategy, UI indicators
3. **Run database migrations** - Create tables in Supabase
4. **Implement Phase 2** - localStorage service layer
5. **Implement Phase 3** - Supabase sync service
6. **Update practice page** - Save detailed sessions
