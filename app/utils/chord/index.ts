/**
 * Chord Utilities - Barrel Export
 *
 * Re-exports all chord-related utilities from organized modules.
 * Import from this file to use chord utilities.
 *
 * @example
 * import { detectChord, chordsMatchMidi, generateSessionChords, CHORD_TYPES } from '@/utils/chord';
 */

// Constants
export { CHORD_TYPES, SCALES, FLAT_TO_SHARP, CHROMA_TO_NOTES } from './constants';

// Conversion utilities
export {
  midiNoteToName,
  normalizeNoteToSharp,
  noteToChroma,
  getChordNotes,
  getChordMidiNotes,
} from './conversion';

// Detection
export { detectChord } from './detection';

// Matching
export { chordsMatchMidi, chordsMatch } from './matching';

// Generation
export { generateSessionChords, getScaleChords, getAllChromaticChords, getRandomChord } from './generation';

// Inversions
export { addInversions } from './inversions';

// Re-export types
export type { SessionConfig, ChordType, Scale } from '@/app/types/chord';
