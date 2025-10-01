import { Chord, Note } from '@tonaljs/tonal';

export const midiNoteToName = (midiNote: number): string => {
  return Note.fromMidi(midiNote);
};

export const detectChord = (midiNotes: number[]): string => {
  if (midiNotes.length < 3) {
    return '';
  }

  const noteNames = midiNotes.map(midiNoteToName);
  const uniqueNotes = [...new Set(noteNames.map(note => Note.pitchClass(note)))];

  if (uniqueNotes.length < 3) {
    return '';
  }

  const detectedChord = Chord.detect(uniqueNotes);

  return detectedChord.length > 0 ? detectedChord[0] : '';
};

export const getRandomChord = (): string => {
  const commonChords = [
    'C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim',
    'Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5',
    'D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim',
    'E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim',
    'F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim',
    'G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim',
    'A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim',
    'Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'
  ];

  return commonChords[Math.floor(Math.random() * commonChords.length)];
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