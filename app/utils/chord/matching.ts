/**
 * Chord Matching
 *
 * Validate if pressed keys match target chord.
 */

import { Chord } from '@tonaljs/tonal';
import { noteToChroma } from './conversion';

/**
 * Check if pressed MIDI notes match target chord (MIDI-based, enharmonic-friendly)
 * More reliable than string comparison
 * @param pressedMidiNotes - Array of MIDI note numbers currently pressed
 * @param targetChord - Chord name to match against (e.g., "Am/E")
 * @returns true if notes match the chord (including correct inversion)
 */
export const chordsMatchMidi = (pressedMidiNotes: number[], targetChord: string): boolean => {
  if (!targetChord || pressedMidiNotes.length < 3) return false;

  // Parse target chord (handle inversions)
  const parts = targetChord.split('/');
  const baseChord = parts[0];
  const bassNote = parts[1] || null;

  const targetChordObj = Chord.get(baseChord);
  if (!targetChordObj.notes.length) {
    return false;
  }

  // Get target pitch classes (0-11)
  const targetPitchClasses = targetChordObj.notes
    .map(noteToChroma)
    .filter(c => c !== -1)
    .sort();

  // Get pressed pitch classes (mod 12)
  const sortedMidiNotes = [...pressedMidiNotes].sort((a, b) => a - b);
  const pressedPitchClasses = [...new Set(sortedMidiNotes.map(m => m % 12))].sort();

  // Check if note sets match
  const notesMatch = JSON.stringify(targetPitchClasses) === JSON.stringify(pressedPitchClasses);

  if (!notesMatch) {
    return false;
  }

  // For root position, just check notes match
  if (!bassNote) {
    return true;
  }

  // For inversions, check bass note (lowest MIDI note) matches target bass
  const bassMidiNote = sortedMidiNotes[0];
  const bassPitchClass = bassMidiNote % 12;
  const targetBassPitchClass = noteToChroma(bassNote);

  return bassPitchClass === targetBassPitchClass;
};

/**
 * Legacy string-based chord matching
 * Kept for backward compatibility but prefer chordsMatchMidi
 * @deprecated Use chordsMatchMidi instead
 */
export const chordsMatch = (detectedChord: string, targetChord: string): boolean => {
  if (!detectedChord || !targetChord) return false;

  // Parse both chords
  const parseChord = (chordStr: string): { baseChord: string; bassNote: string | null } => {
    const parts = chordStr.split('/');
    return {
      baseChord: parts[0],
      bassNote: parts[1] || null,
    };
  };

  const detected = parseChord(detectedChord);
  const target = parseChord(targetChord);

  // Get chord objects
  const detectedChordObj = Chord.get(detected.baseChord);
  const targetChordObj = Chord.get(target.baseChord);

  if (!detectedChordObj.notes.length || !targetChordObj.notes.length) {
    console.log('Invalid chord:', { detectedChord, targetChord });
    return false;
  }

  // Compare notes as chromatic values (enharmonic-friendly)
  const detectedChromas = detectedChordObj.notes
    .map(noteToChroma)
    .filter(c => c !== -1)
    .sort();

  const targetChromas = targetChordObj.notes
    .map(noteToChroma)
    .filter(c => c !== -1)
    .sort();

  const notesMatch = JSON.stringify(detectedChromas) === JSON.stringify(targetChromas);

  // For root position chords, just check notes match
  if (!detected.bassNote && !target.bassNote) {
    return notesMatch;
  }

  // For inversions, also check bass note matches (enharmonically)
  const detectedBassChroma = detected.bassNote ? noteToChroma(detected.bassNote) : null;
  const targetBassChroma = target.bassNote ? noteToChroma(target.bassNote) : null;

  const bassMatch = detectedBassChroma === targetBassChroma;

  // Debug logging for mismatches
  if (notesMatch && !bassMatch) {
    console.log('Bass note mismatch:', {
      detected: detected.bassNote,
      target: target.bassNote,
      detectedChroma: detectedBassChroma,
      targetChroma: targetBassChroma,
    });
  }

  return notesMatch && bassMatch;
};
