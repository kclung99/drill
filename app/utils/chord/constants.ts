/**
 * Chord Constants
 *
 * Chord types, scales, and other musical constants.
 */

import { ChordType, Scale } from '@/app/types/chord';

export const CHORD_TYPES: ChordType[] = [
  { id: 'maj', name: 'major', suffix: '' }, // Just "C", not "CM"
  { id: 'min', name: 'minor', suffix: 'm' },
  { id: 'dim', name: 'diminished', suffix: 'dim' },
  { id: 'maj7', name: 'major 7th', suffix: 'maj7' },
  { id: 'min7', name: 'minor 7th', suffix: 'm7' },
  { id: 'dom7', name: 'dominant 7th', suffix: '7' },
  { id: 'm7b5', name: 'half diminished', suffix: 'm7b5' }
];

export const SCALES: Scale[] = [
  { id: 'C', name: 'C' },
  { id: 'Db', name: 'C# / Db' },
  { id: 'D', name: 'D' },
  { id: 'Eb', name: 'D# / Eb' },
  { id: 'E', name: 'E' },
  { id: 'F', name: 'F' },
  { id: 'Gb', name: 'F# / Gb' },
  { id: 'G', name: 'G' },
  { id: 'Ab', name: 'G# / Ab' },
  { id: 'A', name: 'A' },
  { id: 'Bb', name: 'A# / Bb' },
  { id: 'B', name: 'B' }
];

// Major scale intervals (semitones from root)
export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Major scale diatonic chord qualities (I, ii, iii, IV, V, vi, vii°)
export const MAJOR_SCALE_QUALITIES = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];

// Chromatic note names (enharmonic equivalents)
export const CHROMA_TO_NOTES = [
  ['C'],           // 0
  ['C#', 'Db'],    // 1
  ['D'],           // 2
  ['D#', 'Eb'],    // 3
  ['E'],           // 4
  ['F'],           // 5
  ['F#', 'Gb'],    // 6
  ['G'],           // 7
  ['G#', 'Ab'],    // 8
  ['A'],           // 9
  ['A#', 'Bb'],    // 10
  ['B']            // 11
];

// Flat to sharp conversion map
export const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#'
};
