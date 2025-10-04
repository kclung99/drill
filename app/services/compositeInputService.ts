import { InputService, InputEvent, AudioOptions } from './inputService';
import { MidiInputService } from './midiInputService';
import { KeyboardInputService } from './keyboardInputService';

export type InputMode = 'midi' | 'keyboard' | 'auto';

export class CompositeInputService implements InputService {
  private midiService = new MidiInputService();
  private keyboardService = new KeyboardInputService();
  private activeService: InputService | null = null;
  private mode: InputMode = 'auto';

  constructor(mode: InputMode = 'auto') {
    this.mode = mode;
  }

  isSupported(): boolean {
    switch (this.mode) {
      case 'midi':
        return this.midiService.isSupported();
      case 'keyboard':
        return this.keyboardService.isSupported();
      case 'auto':
        return this.midiService.isSupported() || this.keyboardService.isSupported();
    }
  }

  async connect(): Promise<void> {
    switch (this.mode) {
      case 'midi':
        await this.midiService.connect();
        this.activeService = this.midiService;
        break;

      case 'keyboard':
        await this.keyboardService.connect();
        this.activeService = this.keyboardService;
        break;

      case 'auto':
        try {
          await this.midiService.connect();
          this.activeService = this.midiService;
        } catch {
          await this.keyboardService.connect();
          this.activeService = this.keyboardService;
        }
        break;
    }
  }

  disconnect(): void {
    this.midiService.disconnect();
    this.keyboardService.disconnect();
    this.activeService = null;
  }

  isConnected(): boolean {
    return this.activeService?.isConnected() ?? false;
  }

  getError(): string | null {
    if (this.mode === 'auto') {
      const midiError = this.midiService.getError();
      const keyboardError = this.keyboardService.getError();

      if (midiError && keyboardError) {
        return `MIDI: ${midiError}, Keyboard: ${keyboardError}`;
      }

      return midiError || keyboardError;
    }

    return this.activeService?.getError() ?? null;
  }

  onInputEvent(callback: (event: InputEvent) => void): void {
    this.midiService.onInputEvent(callback);
    this.keyboardService.onInputEvent(callback);
  }

  offInputEvent(callback: (event: InputEvent) => void): void {
    this.midiService.offInputEvent(callback);
    this.keyboardService.offInputEvent(callback);
  }

  getActiveMode(): 'midi' | 'keyboard' | null {
    if (this.activeService === this.midiService) {
      return 'midi';
    } else if (this.activeService === this.keyboardService) {
      return 'keyboard';
    }
    return null;
  }

  getKeyboardMapping(): Record<string, number> | null {
    if (this.keyboardService instanceof KeyboardInputService) {
      return this.keyboardService.getKeyboardMapping();
    }
    return null;
  }

  getCurrentOctave(): number | null {
    if (this.activeService === this.keyboardService && this.keyboardService instanceof KeyboardInputService) {
      return this.keyboardService.getCurrentOctave();
    }
    return null;
  }

  setMode(mode: InputMode): void {
    this.mode = mode;
    this.disconnect();
  }

  setAudioOptions(options: AudioOptions): void {
    // Audio disabled - do nothing
  }
}