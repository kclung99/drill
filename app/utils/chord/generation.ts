/**
 * Chord Generation
 *
 * Generate random chords for practice sessions.
 */

import { Note, Chord } from '@tonaljs/tonal';
import { SessionConfig } from '@/app/types/chord';
import { CHORD_TYPES, MAJOR_SCALE_INTERVALS, MAJOR_SCALE_QUALITIES, CHROMA_TO_NOTES } from './constants';
import { addInversions } from './inversions';

/**
 * Generate chords for a practice session
 * Based on session config (chord types or scales mode)
 */
export const generateSessionChords = (config: SessionConfig): string[] => {
  let allChords: string[] = [];

  if (config.mode === 'scales') {
    // Scale mode: generate diatonic chords from selected scales
    for (const scale of config.scales) {
      // In scale mode, use all available chord types that fit the scale
      const allChordTypes = CHORD_TYPES.map(ct => ct.id);
      const scaleChords = getScaleChords(scale, allChordTypes);
      allChords.push(...scaleChords);
    }
  } else {
    // Chord type mode: generate selected chord types on all chromatic roots
    allChords = getAllChromaticChords(config.chordTypes);
  }

  // Remove duplicates
  const uniqueChords = [...new Set(allChords)];

  // Add inversions if requested
  const chordsPool = config.includeInversions ? addInversions(uniqueChords) : uniqueChords;

  // Randomly select the requested number of chords
  const sessionChords: string[] = [];
  for (let i = 0; i < config.chordCount; i++) {
    const randomChord = chordsPool[Math.floor(Math.random() * chordsPool.length)];
    sessionChords.push(randomChord);
  }

  return sessionChords;
};

/**
 * Get diatonic chords from a major scale
 * @param scaleRoot - Root note of the scale (e.g., "C", "G")
 * @param chordTypes - Chord type IDs to include (e.g., ["maj", "min"])
 * @returns Array of chord names (e.g., ["C", "Dm", "Em"])
 */
export const getScaleChords = (scaleRoot: string, chordTypes: string[]): string[] => {
  const chords: string[] = [];

  const rootNote = Note.get(scaleRoot);
  const rootChroma = rootNote.chroma || 0;

  for (let i = 0; i < 7; i++) {
    const chordChroma = (rootChroma + MAJOR_SCALE_INTERVALS[i]) % 12;
    const chordRoot = Note.fromMidi(60 + chordChroma); // Get note name from MIDI
    const chordRootName = Note.pitchClass(chordRoot);

    const naturalQuality = MAJOR_SCALE_QUALITIES[i];

    // Only include chord types that were selected AND match the natural diatonic quality
    for (const selectedType of chordTypes) {
      const chordType = CHORD_TYPES.find(ct => ct.id === selectedType);
      if (!chordType) continue;

      // Only add chords that match the natural diatonic quality for this scale degree
      if (selectedType === naturalQuality) {
        chords.push(chordRootName + chordType.suffix);
      }
    }
  }

  return chords;
};

/**
 * Get all chromatic chords for selected chord types
 * Generates chords on all 12 chromatic roots with enharmonic variants
 * @param chordTypes - Chord type IDs (e.g., ["maj", "min", "dom7"])
 * @returns Array of chord names (e.g., ["C", "C#", "Db", "D", ...])
 */
export const getAllChromaticChords = (chordTypes: string[]): string[] => {
  const chords: string[] = [];

  for (const selectedType of chordTypes) {
    const chordType = CHORD_TYPES.find(ct => ct.id === selectedType);
    if (!chordType) continue;

    // Add this chord type on all 12 chromatic roots (with enharmonic variants)
    for (const noteVariants of CHROMA_TO_NOTES) {
      for (const root of noteVariants) {
        chords.push(root + chordType.suffix);
      }
    }
  }

  return chords;
};

/**
 * Get a random chord (fallback for backward compatibility)
 * @deprecated Use generateSessionChords instead
 */
export const getRandomChord = (): string => {
  const defaultConfig: SessionConfig = {
    chordCount: 1,
    mode: 'chordTypes',
    chordTypes: ['maj', 'min'],
    scales: ['C'],
    includeInversions: false,
  };

  const chords = generateSessionChords(defaultConfig);
  return chords[0] || 'C';
};
