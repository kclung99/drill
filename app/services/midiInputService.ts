import { BaseInputService } from './inputService';

export class MidiInputService extends BaseInputService {
  private midiAccess: MIDIAccess | null = null;
  private input: MIDIInput | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && !!navigator.requestMIDIAccess;
  }

  async connect(): Promise<void> {
    try {
      if (!this.isSupported()) {
        throw new Error('Web MIDI API not supported in this browser');
      }

      this.midiAccess = await navigator.requestMIDIAccess();

      const inputs = Array.from(this.midiAccess.inputs.values());
      if (inputs.length === 0) {
        throw new Error('No MIDI devices found');
      }

      this.input = inputs[0];
      this.input.onmidimessage = this.handleMidiMessage.bind(this);

      this.connected = true;
      this.error = null;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown MIDI error';
      this.connected = false;
      throw error;
    }
  }

  disconnect(): void {
    if (this.input) {
      this.input.onmidimessage = null;
      this.input = null;
    }
    this.midiAccess = null;
    super.disconnect();
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0];
    const note = data[1];
    const velocity = data[2];
    const command = status >> 4;

    if (command === 9 && velocity > 0) {
      this.emitEvent({
        type: 'noteOn',
        note,
        velocity
      });
    } else if (command === 8 || (command === 9 && velocity === 0)) {
      this.emitEvent({
        type: 'noteOff',
        note,
        velocity: 0
      });
    }
  }
}