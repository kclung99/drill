/**
 * Chord Inversions
 *
 * Generate chord inversions (slash chord notation).
 */

import { Chord, Note } from '@tonaljs/tonal';
import { normalizeNoteToSharp } from './conversion';

/**
 * Generate all inversions for a list of chords
 * Adds first, second, and third (for 7th chords) inversions
 * @param baseChords - Array of base chord names (e.g., ["C", "Am"])
 * @returns Array with root position + all inversions (e.g., ["C", "C/E", "C/G", "Am", "Am/C", "Am/E"])
 */
export const addInversions = (baseChords: string[]): string[] => {
  const chordsWithInversions: string[] = [];

  for (const chordName of baseChords) {
    // Add the root position chord
    chordsWithInversions.push(chordName);

    // Get chord notes to generate inversions
    const chord = Chord.get(chordName);
    if (chord.notes.length >= 3) {
      // Add first inversion (third in bass) - normalize to sharp
      const firstInversionBass = normalizeNoteToSharp(Note.pitchClass(chord.notes[1]));
      chordsWithInversions.push(`${chordName}/${firstInversionBass}`);

      // Add second inversion (fifth in bass) - normalize to sharp
      const secondInversionBass = normalizeNoteToSharp(Note.pitchClass(chord.notes[2]));
      chordsWithInversions.push(`${chordName}/${secondInversionBass}`);

      // For 7th chords, add third inversion (seventh in bass) - normalize to sharp
      if (chord.notes.length >= 4) {
        const thirdInversionBass = normalizeNoteToSharp(Note.pitchClass(chord.notes[3]));
        chordsWithInversions.push(`${chordName}/${thirdInversionBass}`);
      }
    }
  }

  return chordsWithInversions;
};
