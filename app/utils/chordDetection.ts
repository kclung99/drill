import { Chord, Note } from '@tonaljs/tonal';

export const midiNoteToName = (midiNote: number): string => {
  return Note.fromMidi(midiNote);
};

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

  // Get the bass note (lowest pitch)
  const bassNote = Note.pitchClass(noteNames[0]);

  // Detect possible chords
  const detectedChords = Chord.detect(uniqueNotes);

  if (detectedChords.length === 0) {
    return '';
  }

  // Find the chord that matches with the correct bass note (inversion)
  for (const chordName of detectedChords) {
    const chord = Chord.get(chordName);
    const rootNote = Note.pitchClass(chord.tonic);

    if (rootNote === bassNote) {
      // Root position
      return chordName;
    } else {
      // Check if it's an inversion
      const chordNotes = chord.notes.map(note => Note.pitchClass(note));
      const bassIndex = chordNotes.indexOf(bassNote);

      if (bassIndex > 0) {
        // It's an inversion - append slash notation
        return `${chordName}/${bassNote}`;
      }
    }
  }

  // Fallback to first detected chord
  return detectedChords[0];
};

export interface SessionConfig {
  chordCount: number;
  mode: 'scales' | 'chordTypes';
  chordTypes: string[];
  scales: string[];
}

export const CHORD_TYPES = [
  { id: 'maj', name: 'Major', suffix: '' },
  { id: 'min', name: 'Minor', suffix: 'm' },
  { id: 'dim', name: 'Diminished', suffix: 'dim' },
  { id: 'maj7', name: 'Major 7th', suffix: 'maj7' },
  { id: 'min7', name: 'Minor 7th', suffix: 'm7' },
  { id: 'dom7', name: 'Dominant 7th', suffix: '7' },
  { id: 'm7b5', name: 'Half Diminished', suffix: 'm7b5' }
];

export const SCALES = [
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

const getScaleChords = (scaleRoot: string, chordTypes: string[]): string[] => {
  const chords: string[] = [];

  // Major scale chord progressions (I, ii, iii, IV, V, vi, vii°)
  const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11]; // Semitone intervals
  const majorScaleQualities = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];

  const rootNote = Note.get(scaleRoot);
  const rootChroma = rootNote.chroma || 0;

  for (let i = 0; i < 7; i++) {
    const chordChroma = (rootChroma + majorScaleIntervals[i]) % 12;
    const chordRoot = Note.fromMidi(60 + chordChroma); // Get note name from MIDI
    const chordRootName = Note.pitchClass(chordRoot);

    const naturalQuality = majorScaleQualities[i];

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

const getAllChromaticChords = (chordTypes: string[]): string[] => {
  const chords: string[] = [];
  const chromaToNote = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  for (const selectedType of chordTypes) {
    const chordType = CHORD_TYPES.find(ct => ct.id === selectedType);
    if (!chordType) continue;

    // Add this chord type on all 12 chromatic roots
    for (const root of chromaToNote) {
      chords.push(root + chordType.suffix);
    }
  }

  return chords;
};

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

  // Randomly select the requested number of chords
  const sessionChords: string[] = [];
  for (let i = 0; i < config.chordCount; i++) {
    const randomChord = uniqueChords[Math.floor(Math.random() * uniqueChords.length)];
    sessionChords.push(randomChord);
  }

  return sessionChords;
};

export const getRandomChord = (): string => {
  // Fallback for backward compatibility
  const defaultConfig: SessionConfig = {
    chordCount: 1,
    chordTypes: ['maj', 'min'],
    scales: ['C']
  };

  const chords = generateSessionChords(defaultConfig);
  return chords[0] || 'C';
};

export const getChordNotes = (chordName: string): string[] => {
  const chord = Chord.get(chordName);
  return chord.notes;
};

// Convert note name to MIDI number (mod 12) for enharmonic-friendly comparison
const noteToChroma = (noteName: string): number => {
  const note = Note.get(noteName);
  return note.chroma !== undefined ? note.chroma : -1;
};

export const chordsMatch = (detectedChord: string, targetChord: string): boolean => {
  if (!detectedChord || !targetChord) return false;

  const detected = Chord.get(detectedChord);
  const target = Chord.get(targetChord);

  if (detected.notes.length === 0 || target.notes.length === 0) return false;

  // Convert notes to chromatic numbers (0-11) which are enharmonic-friendly
  const detectedChromas = detected.notes
    .map(noteToChroma)
    .filter(chroma => chroma !== -1)
    .sort();

  const targetChromas = target.notes
    .map(noteToChroma)
    .filter(chroma => chroma !== -1)
    .sort();

  // Compare chromatic values instead of note names
  return JSON.stringify(detectedChromas) === JSON.stringify(targetChromas);
};

// Get MIDI notes for a chord
export const getChordMidiNotes = (chordName: string): number[] => {
  const chord = Chord.get(chordName);
  if (chord.notes.length === 0) return [];

  // Convert chord notes to MIDI numbers in a good octave range
  return chord.notes.map(noteName => {
    const note = Note.get(noteName);
    // Place chord in octave 4-5 range (MIDI 60-84)
    let midiNote = note.chroma !== undefined ? note.chroma + 60 : 60;

    // Spread notes across octaves for better voicing
    const noteIndex = chord.notes.indexOf(noteName);
    if (noteIndex > 0) {
      midiNote += Math.floor(noteIndex / 3) * 12; // Move higher notes up an octave
    }

    return midiNote;
  });
};

// Play a chord using the audio service
export const playChord = async (chordName: string): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const { getAudioService } = await import('../services/audioService');
    const audioService = getAudioService();

    const chord = Chord.get(chordName);
    if (chord.notes.length === 0) return;

    // Use the same MIDI note calculation as getChordMidiNotes
    const midiNotes = getChordMidiNotes(chordName);

    // Play all notes simultaneously
    for (const midiNote of midiNotes) {
      await audioService.playNote(midiNote, 80);
    }

    // Stop notes after a short duration
    setTimeout(async () => {
      for (const midiNote of midiNotes) {
        await audioService.stopNote(midiNote);
      }
    }, 1500); // Play for 1.5 seconds

  } catch (error) {
    console.error('Failed to play chord:', error);
  }
};