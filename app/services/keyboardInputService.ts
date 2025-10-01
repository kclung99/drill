import { BaseInputService } from './inputService';

export class KeyboardInputService extends BaseInputService {
  private pressedKeys = new Set<string>();
  private currentOctave = 4; // Default to C4 octave (MIDI 60)

  // Ableton-style keyboard mapping - ASDF row for white keys, WE etc for black keys
  private getKeyToMidiMap(): Record<string, number> {
    const baseNote = this.currentOctave * 12 + 12; // C of current octave (fix: add 12 for correct MIDI mapping)

    return {
      // White keys (ASDF row) - chromatic starting from C
      'a': baseNote,      // C
      's': baseNote + 2,  // D
      'd': baseNote + 4,  // E
      'f': baseNote + 5,  // F
      'g': baseNote + 7,  // G
      'h': baseNote + 9,  // A
      'j': baseNote + 11, // B
      'k': baseNote + 12, // C (next octave)

      // Black keys (QWER row) - sharps/flats
      'w': baseNote + 1,  // C#
      'e': baseNote + 3,  // D#
      't': baseNote + 6,  // F#
      'y': baseNote + 8,  // G#
      'u': baseNote + 10, // A#
    };
  }

  isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  async connect(): Promise<void> {
    try {
      if (!this.isSupported()) {
        throw new Error('Keyboard input not supported');
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
      }

      this.connected = true;
      this.error = null;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown keyboard error';
      this.connected = false;
      throw error;
    }
  }

  disconnect(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
    }
    this.pressedKeys.clear();
    super.disconnect();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Prevent handling if input is focused or modifier keys are pressed
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();

    // Handle octave changes
    if (key === 'z' && !this.pressedKeys.has(key)) {
      this.pressedKeys.add(key);
      event.preventDefault();
      this.changeOctave(-1);
      return;
    }

    if (key === 'x' && !this.pressedKeys.has(key)) {
      this.pressedKeys.add(key);
      event.preventDefault();
      this.changeOctave(1);
      return;
    }

    const keyToMidiMap = this.getKeyToMidiMap();
    const midiNote = keyToMidiMap[key];

    if (midiNote !== undefined && !this.pressedKeys.has(key)) {
      // Ensure MIDI note is in valid range (0-127)
      if (midiNote >= 0 && midiNote <= 127) {
        this.pressedKeys.add(key);
        event.preventDefault();

        this.emitEvent({
          type: 'noteOn',
          note: midiNote,
          velocity: 100
        });
      }
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    // Handle octave control key releases (don't send note off for these)
    if (key === 'z' || key === 'x') {
      this.pressedKeys.delete(key);
      event.preventDefault();
      return;
    }

    const keyToMidiMap = this.getKeyToMidiMap();
    const midiNote = keyToMidiMap[key];

    if (midiNote !== undefined && this.pressedKeys.has(key)) {
      this.pressedKeys.delete(key);
      event.preventDefault();

      this.emitEvent({
        type: 'noteOff',
        note: midiNote,
        velocity: 0
      });
    }
  };

  private changeOctave(direction: number): void {
    const newOctave = this.currentOctave + direction;

    // Limit octave range to valid MIDI range (0-10, where 10*12=120 is close to max MIDI 127)
    if (newOctave >= 0 && newOctave <= 10) {
      this.currentOctave = newOctave;

      // Notify listeners about octave change (you could emit a custom event here if needed)
      console.log(`Octave changed to: ${this.currentOctave} (C${this.currentOctave} = MIDI ${this.currentOctave * 12})`);
    }
  }

  getKeyboardMapping(): Record<string, number> {
    return { ...this.getKeyToMidiMap() };
  }

  getCurrentOctave(): number {
    return this.currentOctave;
  }
}