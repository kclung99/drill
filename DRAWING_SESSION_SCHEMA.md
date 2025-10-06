# Drawing Practice Session Schema Proposal

## Current State Analysis

### **Session Configuration**
```typescript
// From drawing/page.tsx
{
  duration: number | 'inf',           // seconds per image (or infinite)
  imageCount: number,                 // how many images in session
  category: 'full-body' | 'hands' | 'feet' | 'portraits',
  gender: 'female' | 'male' | 'any',
  clothing: 'minimal' | 'clothed' | 'any',
  alwaysGenerateNew: boolean          // force new generation vs. pool
}
```

### **Current Tracking**
- ❌ No session details saved
- ❌ No per-image timing
- ❌ No progress tracking (which image completed)
- ✅ Only increments counter via `incrementSession('drawing')`

---

## Proposed Schema

### **Option A: Minimal (Matches Current Music Approach)**

Simple session-level tracking without per-image details.

```sql
CREATE TABLE IF NOT EXISTS drawing_practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session config
  duration_seconds INTEGER,           -- NULL = infinite mode
  image_count INTEGER NOT NULL,
  category TEXT,                      -- 'full-body', 'hands', 'feet', 'portraits'
  gender TEXT,                        -- 'female', 'male', 'any'
  clothing TEXT,                      -- 'minimal', 'clothed', 'any'
  always_generate_new BOOLEAN DEFAULT FALSE,

  -- Session results (summary only)
  images_completed INTEGER NOT NULL,  -- How many images user went through
  total_time_seconds INTEGER,         -- Total session duration (if timed)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawing_sessions_user_id
  ON drawing_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sessions_created_at
  ON drawing_practice_sessions(created_at DESC);
```

**Pros:**
- Simple, minimal schema
- Matches music session structure
- Easy to implement quickly

**Cons:**
- No per-image timing data
- Can't analyze which poses/categories take longer
- Less useful for progress tracking

---

### **Option B: Detailed (With Per-Image Data)**

Track timing for each individual image in the session.

```sql
CREATE TABLE IF NOT EXISTS drawing_practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session config
  duration_seconds INTEGER,           -- NULL = infinite mode
  image_count INTEGER NOT NULL,
  category TEXT,
  gender TEXT,
  clothing TEXT,
  always_generate_new BOOLEAN DEFAULT FALSE,

  -- Session results (summary)
  images_completed INTEGER NOT NULL,
  total_time_seconds INTEGER,
  avg_time_per_image DECIMAL(6,2),    -- Average time in seconds

  -- Individual image results (JSONB)
  -- Example: [
  --   {"imageId": "abc123", "category": "full-body", "timeSpent": 65},
  --   {"imageId": "def456", "category": "hands", "timeSpent": 45}
  -- ]
  image_results JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawing_sessions_user_id
  ON drawing_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sessions_created_at
  ON drawing_practice_sessions(created_at DESC);
```

**Pros:**
- Can analyze per-image performance
- Shows which categories/poses are hardest
- Better for progress tracking over time
- More useful analytics

**Cons:**
- More complex to implement
- Requires tracking timing per image
- Larger storage footprint

---

## Recommendation: **Option A (Minimal)**

**Rationale:**
1. **Consistency** - Matches the music session approach
2. **Simpler implementation** - Can ship today
3. **Sufficient for heatmap** - We only need session completion for heatmap
4. **Future-proof** - Can add `image_results` JSONB column later if needed

**Implementation effort:**
- ~30 minutes to create schema
- ~1 hour to update drawing page
- ~30 minutes to update sync service

---

## Data Flow (Proposed)

### **Drawing Session Completion**
```typescript
// On stopSession():
1. Calculate session metrics (images_completed, total_time)
2. Save to localStorage immediately
3. Queue for Supabase sync (if logged in)
4. Update heatmap counter in localStorage
```

### **Heatmap Integration**
```typescript
// For logged-in users, aggregate from both tables:
- Music sessions: COUNT from chord_practice_sessions by date
- Drawing sessions: COUNT from drawing_practice_sessions by date
- Combine into heatmap view
```

### **Recent Sessions Display**
```typescript
// Update home page to show both:
- Recent music sessions (existing)
- Recent drawing sessions (new)
// Or combine into single chronological list
```

---

## localStorage Structure

```typescript
export interface DrawingSession {
  id: string;
  config: {
    duration: number | 'inf';
    imageCount: number;
    category: string;
    gender: string;
    clothing: string;
    alwaysGenerateNew: boolean;
  };
  results: {
    imagesCompleted: number;
    totalTimeSeconds: number | null;
  };
  timestamp: number; // Unix timestamp
}

// Stored at key: 'drill-drawing-sessions'
```

---

## Migration SQL (Option A)

```sql
-- Add to migrations/002_drawing_sessions.sql

CREATE TABLE IF NOT EXISTS drawing_practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session config
  duration_seconds INTEGER,
  image_count INTEGER NOT NULL,
  category TEXT,
  gender TEXT,
  clothing TEXT,
  always_generate_new BOOLEAN DEFAULT FALSE,

  -- Session results
  images_completed INTEGER NOT NULL,
  total_time_seconds INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawing_sessions_user_id
  ON drawing_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sessions_created_at
  ON drawing_practice_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE drawing_practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own drawing sessions"
  ON drawing_practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drawing sessions"
  ON drawing_practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Questions for Review

### **1. Per-Image Timing?**
- Do you want to track time spent on each individual image?
- **Recommendation:** Start without, add later if needed

### **2. Pause Tracking?**
- Should we track pause events?
- **Recommendation:** No, just track total session time

### **3. Skip/Next Actions?**
- Should we track if user skipped images?
- **Recommendation:** No, just track images_completed

### **4. Image Metadata?**
- Should we store which specific images were used?
- **Recommendation:** No, just category/filters (privacy-friendly)

### **5. Heatmap Display?**
- Should heatmap show music + drawing combined?
- **Recommendation:** Yes, aggregate both (like original design)

---

## Next Steps (If Approved)

1. ✅ Finalize schema (Option A recommended)
2. Create migration file `002_drawing_sessions.sql`
3. Update `localStorageService.ts` to add drawing session functions
4. Update `drawing/page.tsx` to save session data
5. Update `supabaseSyncService.ts` to sync drawing sessions
6. Update heatmap to aggregate both music + drawing from Supabase
7. (Optional) Add drawing sessions to recent sessions table on home

**Estimated time: 2-3 hours total**

---

## Future Enhancements (V2)

If you want more detailed analytics later:
- Add `image_results JSONB` column (per-image timing)
- Track skip/next actions
- Add reference image IDs (link to drawing_images table)
- Calculate "difficulty score" per category
- Show progress over time (avg time decreasing)
- Add session notes/reflections

Let me know which option you prefer and I'll implement it!
