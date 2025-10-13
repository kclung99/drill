/**
 * Chord Conversion Utilities
 *
 * Convert between MIDI notes, note names, and pitch classes.
 */

import { Note, Chord } from '@tonaljs/tonal';
import { FLAT_TO_SHARP } from './constants';

/**
 * Convert MIDI note number to note name (e.g., 60 → "C4")
 */
export const midiNoteToName = (midiNote: number): string => {
  return Note.fromMidi(midiNote);
};

/**
 * Normalize note name to sharp notation for consistency
 * @example "Db" → "C#", "Eb" → "D#"
 */
export const normalizeNoteToSharp = (noteName: string): string => {
  return FLAT_TO_SHARP[noteName] || noteName;
};

/**
 * Normalize chord name to use our convention
 * @example "CM" → "C", "Cm" → "Cm", "Cmaj7" → "Cmaj7"
 */
export const normalizeChordName = (chordName: string): string => {
  return chordName.replace(/^([A-G][#b]?)M(?![a-z])/, '$1');
};

/**
 * Convert note name to chromatic pitch class (0-11)
 * @example "C" → 0, "C#" → 1, "D" → 2, etc.
 */
export const noteToChroma = (noteName: string): number => {
  const note = Note.get(noteName);
  return note.chroma !== undefined ? note.chroma : -1;
};

/**
 * Get note names for a chord
 * Handles inversions (slash chords) by returning base chord notes
 * @example "C" → ["C", "E", "G"]
 * @example "Am/E" → ["A", "C", "E"]
 */
export const getChordNotes = (chordName: string): string[] => {
  const baseChordName = chordName.split('/')[0];
  const chord = Chord.get(baseChordName);
  return chord.notes;
};

/**
 * Get MIDI note numbers for a chord (centered around middle C)
 * Handles inversions properly with correct voicing
 * @example "C" → [60, 64, 67] (C4, E4, G4)
 * @example "C/E" → [64, 67, 72] (E4, G4, C5)
 */
export const getChordMidiNotes = (chordName: string): number[] => {
  const parts = chordName.split('/');
  const baseChordName = parts[0];
  const bassNoteName = parts[1]; // e.g., "E" in "Am/E"

  const chord = Chord.get(baseChordName);
  if (chord.notes.length === 0) return [];

  const baseOctave = 60; // C4 (middle C)

  if (bassNoteName) {
    // Inversion: put bass note at bottom
    const bassNote = Note.get(bassNoteName);
    const bassMidi = (bassNote.chroma !== undefined ? bassNote.chroma : 0) + baseOctave;

    // Add other chord notes above the bass
    const otherNotes = chord.notes
      .filter(noteName => {
        const noteChroma = Note.get(noteName).chroma;
        return noteChroma !== bassNote.chroma;
      })
      .map(noteName => {
        const note = Note.get(noteName);
        let midiNote = (note.chroma !== undefined ? note.chroma : 0) + baseOctave;

        // If this note is lower than bass, move it up an octave
        if (midiNote <= bassMidi) {
          midiNote += 12;
        }

        return midiNote;
      })
      .sort((a, b) => a - b);

    return [bassMidi, ...otherNotes];
  }

  // Root position: place chord around middle C
  return chord.notes.map((noteName, idx) => {
    const note = Note.get(noteName);
    let midiNote = (note.chroma !== undefined ? note.chroma : 0) + baseOctave;

    // Ensure notes are ascending
    if (idx > 0) {
      const prevNote = chord.notes[idx - 1];
      const prevChroma = Note.get(prevNote).chroma || 0;
      const currChroma = note.chroma || 0;

      // If current note's chroma is ≤ previous, move it up an octave
      if (currChroma <= prevChroma) {
        midiNote += 12;
      }
    }

    return midiNote;
  });
};
