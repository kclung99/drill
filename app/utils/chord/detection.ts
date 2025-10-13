/**
 * Chord Detection
 *
 * Detect chords from MIDI note input.
 */

import { Chord, Note } from '@tonaljs/tonal';
import { midiNoteToName, normalizeNoteToSharp, normalizeChordName } from './conversion';

/**
 * Detect chord from MIDI note numbers
 * Returns chord name with slash notation for inversions
 * @example [60, 64, 67] → "C"
 * @example [64, 67, 72] → "C/E"
 */
export const detectChord = (midiNotes: number[]): string => {
  if (midiNotes.length < 3) {
    return '';
  }

  // Sort MIDI notes to find the lowest (bass note)
  const sortedMidiNotes = [...midiNotes].sort((a, b) => a - b);
  const noteNames = sortedMidiNotes.map(midiNoteToName);
  const uniqueNotes = [...new Set(noteNames.map(note => Note.pitchClass(note)))];

  if (uniqueNotes.length < 3) {
    return '';
  }

  // Get the bass note (lowest pitch) - normalize to sharp
  const bassNote = normalizeNoteToSharp(Note.pitchClass(noteNames[0]));

  // Detect possible chords
  const detectedChords = Chord.detect(uniqueNotes);

  if (detectedChords.length === 0) {
    return '';
  }

  // First pass: Look for inversions (non-root bass notes)
  for (const chordName of detectedChords) {
    const chord = Chord.get(chordName);
    if (!chord.tonic) continue;

    const rootNote = normalizeNoteToSharp(Note.pitchClass(chord.tonic));
    const chordNotes = chord.notes.map(note => normalizeNoteToSharp(Note.pitchClass(note)));
    const bassIndex = chordNotes.indexOf(bassNote);

    if (bassIndex > 0) {
      return `${normalizeChordName(chordName)}/${bassNote}`;
    }
  }

  // Second pass: Look for root position chords
  for (const chordName of detectedChords) {
    const chord = Chord.get(chordName);
    if (!chord.tonic) continue;

    const rootNote = normalizeNoteToSharp(Note.pitchClass(chord.tonic));

    if (rootNote === bassNote) {
      return normalizeChordName(chordName);
    }
  }

  return normalizeChordName(detectedChords[0]);
};
