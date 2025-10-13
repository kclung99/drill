/**
 * Chord Types
 *
 * Centralized type definitions for chord practice system.
 * Single source of truth for all chord-related types.
 */

// ============================================================================
// Session Configuration
// ============================================================================

export interface SessionConfig {
  chordCount: number;
  mode: 'scales' | 'chordTypes';
  chordTypes: string[];
  scales: string[];
  includeInversions?: boolean;
}

// ============================================================================
// Chord Type Definitions
// ============================================================================

export interface ChordType {
  id: string;
  name: string;
  suffix: string;
}

export interface Scale {
  id: string;
  name: string;
}

// ============================================================================
// Session Results
// ============================================================================

export interface ChordSessionResult {
  chord: string;
  attempts: number;
  correctTime: number; // milliseconds
  totalTime: number; // milliseconds
}

export interface ChordSessionMetrics {
  totalChords: number;
  totalAttempts: number;
  accuracy: number; // percentage (0-100)
  avgTimePerChord: number; // seconds
  fastestTime: number; // seconds
  slowestTime: number; // seconds
  effectiveChords: number; // totalChords * (accuracy / 100)
}

export interface ChordSessionConfig {
  duration: number; // minutes
  mode: 'chordTypes' | 'scales';
  chordTypes: string[];
  scales: string[];
  includeInversions: boolean;
}

// ============================================================================
// Stats & Analytics
// ============================================================================

export interface ChordSessionStats {
  pbEffectiveChords: number;
  percentile: number; // 0-100, where 100 is best
  totalSessions: number;
  betterThanCount: number;
}
