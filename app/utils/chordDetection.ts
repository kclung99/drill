import { Chord, Note } from '@tonaljs/tonal';

export const midiNoteToName = (midiNote: number): string => {
  return Note.fromMidi(midiNote);
};

// Normalize note to sharp notation for consistency
const normalizeNoteToSharp = (noteName: string): string => {
  const flatToSharp: { [key: string]: string } = {
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#'
  };
  return flatToSharp[noteName] || noteName;
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
    const rootNote = normalizeNoteToSharp(Note.pitchClass(chord.tonic));
    const chordNotes = chord.notes.map(note => normalizeNoteToSharp(Note.pitchClass(note)));
    const bassIndex = chordNotes.indexOf(bassNote);

    if (bassIndex > 0) {
      // It's an inversion - append slash notation with normalized bass
      return `${chordName}/${bassNote}`;
    }
  }

  // Second pass: Look for root position chords
  for (const chordName of detectedChords) {
    const chord = Chord.get(chordName);
    const rootNote = normalizeNoteToSharp(Note.pitchClass(chord.tonic));

    if (rootNote === bassNote) {
      // Root position
      return chordName;
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
  includeInversions?: boolean; // Include chord inversions in practice
}

export const CHORD_TYPES = [
  { id: 'maj', name: 'Major', suffix: '' }, // Just "C", not "CM"
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
  // Include both sharp and flat enharmonic equivalents for training variety
  const chromaToNotes = [
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

  for (const selectedType of chordTypes) {
    const chordType = CHORD_TYPES.find(ct => ct.id === selectedType);
    if (!chordType) continue;

    // Add this chord type on all 12 chromatic roots (with enharmonic variants)
    for (const noteVariants of chromaToNotes) {
      for (const root of noteVariants) {
        chords.push(root + chordType.suffix);
      }
    }
  }

  return chords;
};

const addInversions = (baseChords: string[]): string[] => {
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
  const chordsPool = config.includeInversions
    ? addInversions(uniqueChords)
    : uniqueChords;

  // Randomly select the requested number of chords
  const sessionChords: string[] = [];
  for (let i = 0; i < config.chordCount; i++) {
    const randomChord = chordsPool[Math.floor(Math.random() * chordsPool.length)];
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
  // Handle inversions - for slash chords, return the base chord notes
  // The bass note in slash notation is just for voicing, not part of the chord definition
  const baseChordName = chordName.split('/')[0];
  const chord = Chord.get(baseChordName);
  return chord.notes;
};

// Convert note name to MIDI number (mod 12) for enharmonic-friendly comparison
const noteToChroma = (noteName: string): number => {
  const note = Note.get(noteName);
  return note.chroma !== undefined ? note.chroma : -1;
};

// New MIDI-based matching - more reliable than note name strings
export const chordsMatchMidi = (pressedMidiNotes: number[], targetChord: string): boolean => {
  if (!targetChord || pressedMidiNotes.length < 3) return false;

  // Parse target chord
  const parseChord = (chordStr: string): { baseChord: string, bassNote: string | null } => {
    const parts = chordStr.split('/');
    return {
      baseChord: parts[0],
      bassNote: parts[1] || null
    };
  };

  const target = parseChord(targetChord);
  const targetChordObj = Chord.get(target.baseChord);

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
  if (!target.bassNote) {
    return true;
  }

  // For inversions, check bass note (lowest MIDI note) matches target bass
  const bassMidiNote = sortedMidiNotes[0];
  const bassPitchClass = bassMidiNote % 12;
  const targetBassPitchClass = noteToChroma(target.bassNote);

  return bassPitchClass === targetBassPitchClass;
};

export const chordsMatch = (detectedChord: string, targetChord: string): boolean => {
  if (!detectedChord || !targetChord) return false;

  // Parse both chords
  const parseChord = (chordStr: string): { baseChord: string, bassNote: string | null } => {
    const parts = chordStr.split('/');
    return {
      baseChord: parts[0],
      bassNote: parts[1] || null
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
      targetChroma: targetBassChroma
    });
  }

  return notesMatch && bassMatch;
};

// Get MIDI notes for a chord
export const getChordMidiNotes = (chordName: string): number[] => {
  // Handle inversions (slash chords)
  const parts = chordName.split('/');
  const baseChordName = parts[0];
  const bassNoteName = parts[1]; // e.g., "E" in "Am/E"

  const chord = Chord.get(baseChordName);
  if (chord.notes.length === 0) return [];

  // Start at C4 (MIDI 60)
  const baseOctave = 60;

  if (bassNoteName) {
    // For inversions, put the bass note at the bottom
    const bassNote = Note.get(bassNoteName);
    const bassMidi = (bassNote.chroma !== undefined ? bassNote.chroma : 0) + baseOctave;

    // Add the rest of the chord notes above the bass
    const otherNotes = chord.notes
      .filter(noteName => {
        const noteChroma = Note.get(noteName).chroma;
        return noteChroma !== bassNote.chroma;
      })
      .map((noteName, idx) => {
        const note = Note.get(noteName);
        let midiNote = (note.chroma !== undefined ? note.chroma : 0) + baseOctave;

        // If this note is lower than the bass, move it up an octave
        if (midiNote <= bassMidi) {
          midiNote += 12;
        }

        return midiNote;
      })
      .sort((a, b) => a - b); // Sort to ensure proper voicing

    return [bassMidi, ...otherNotes];
  }

  // Root position - place chord around C4
  return chord.notes.map((noteName, idx) => {
    const note = Note.get(noteName);
    let midiNote = (note.chroma !== undefined ? note.chroma : 0) + baseOctave;

    // Ensure notes are ascending and in the same octave range
    if (idx > 0) {
      const prevNote = chord.notes[idx - 1];
      const prevChroma = Note.get(prevNote).chroma || 0;
      const currChroma = note.chroma || 0;

      // If current note's chroma is less than or equal to previous, move it up an octave
      if (currChroma <= prevChroma) {
        midiNote += 12;
      }
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