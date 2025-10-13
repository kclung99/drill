'use client';

export class AudioService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private synth: any = null;
  private initialized = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private Tone: any = null;

  async initialize(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') return;

    try {
      // Dynamic import Tone.js only on client side
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.Tone = await import('tone') as any;

      // Create a polyphonic synthesizer that can play multiple notes
      this.synth = new this.Tone.PolySynth(this.Tone.Synth, {
        oscillator: {
          type: 'triangle',
          partials: [1, 0.2, 0.1]  // Add some harmonics for fuller sound
        },
        envelope: {
          attack: 0,   // Very fast attack for immediate response
          decay: 0.1,
          sustain: 0.2,
          release: 0.2,   // Shorter release for more responsive feel
        }
      }).toDestination();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  async startAudioContext(): Promise<void> {
    if (!this.Tone) return;

    try {
      if (this.Tone.getContext().state !== 'running') {
        await this.Tone.start();
      }
    } catch (error) {
      console.error('Failed to start audio context:', error);
    }
  }

  midiNoteToFrequency(midiNote: number): number {
    // Convert MIDI note number to frequency using A4 = 440Hz
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  midiNoteToName(midiNote: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }

  async playNote(midiNote: number, velocity: number = 100): Promise<void> {
    if (!this.initialized || !this.synth) {
      await this.initialize();
    }

    if (!this.synth || !this.initialized) return;

    try {
      await this.startAudioContext();

      const noteName = this.midiNoteToName(midiNote);
      const normalizedVelocity = velocity / 127; // Convert MIDI velocity to 0-1 range

      this.synth.triggerAttack(noteName, undefined, normalizedVelocity);
    } catch (error) {
      console.error('Failed to play note:', error);
    }
  }

  async stopNote(midiNote: number): Promise<void> {
    if (!this.synth || !this.initialized) return;

    try {
      const noteName = this.midiNoteToName(midiNote);
      this.synth.triggerRelease(noteName);
    } catch (error) {
      console.error('Failed to stop note:', error);
    }
  }

  stopAllNotes(): void {
    if (this.synth && this.initialized) {
      this.synth.releaseAll();
    }
  }

  setVolume(volume: number): void {
    if (this.synth && this.initialized) {
      // Convert 0-1 range to decibels
      const db = volume === 0 ? -Infinity : 20 * Math.log10(volume);
      this.synth.volume.value = db;
    }
  }

  dispose(): void {
    if (this.synth && this.initialized) {
      this.synth.dispose();
      this.synth = null;
    }
    this.initialized = false;
    this.Tone = null;
  }
}

/**
 * Play a chord using the audio service
 * @param chordName - Chord name (e.g., "C", "Am/E")
 */
export const playChord = async (chordName: string): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const { getChordMidiNotes } = await import('../utils/chord/conversion');
    const audioService = getAudioService();

    // Get MIDI notes for the chord
    const midiNotes = getChordMidiNotes(chordName);

    if (midiNotes.length === 0) return;

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

// Singleton instance
let audioServiceInstance: AudioService | null = null;

export const getAudioService = (): AudioService => {
  if (!audioServiceInstance) {
    audioServiceInstance = new AudioService();
  }
  return audioServiceInstance;
};