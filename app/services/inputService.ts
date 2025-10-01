export interface InputEvent {
  type: 'noteOn' | 'noteOff';
  note: number;
  velocity: number;
}

export interface AudioOptions {
  enabled: boolean;
  volume?: number;
}

export interface InputService {
  isSupported(): boolean;
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  getError(): string | null;
  onInputEvent(callback: (event: InputEvent) => void): void;
  offInputEvent(callback: (event: InputEvent) => void): void;
  setAudioOptions(options: AudioOptions): void;
}

export abstract class BaseInputService implements InputService {
  protected connected = false;
  protected error: string | null = null;
  protected listeners: ((event: InputEvent) => void)[] = [];
  protected audioOptions: AudioOptions = { enabled: true, volume: 0.7 };

  abstract isSupported(): boolean;
  abstract connect(): Promise<void>;

  disconnect(): void {
    this.connected = false;
    this.error = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getError(): string | null {
    return this.error;
  }

  onInputEvent(callback: (event: InputEvent) => void): void {
    this.listeners.push(callback);
  }

  offInputEvent(callback: (event: InputEvent) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  setAudioOptions(options: AudioOptions): void {
    this.audioOptions = { ...this.audioOptions, ...options };
  }

  protected async emitEvent(event: InputEvent): Promise<void> {
    this.listeners.forEach(listener => listener(event));

    // Play audio if enabled
    if (this.audioOptions.enabled && typeof window !== 'undefined') {
      try {
        const { getAudioService } = await import('./audioService');
        const audioService = getAudioService();

        if (this.audioOptions.volume !== undefined) {
          audioService.setVolume(this.audioOptions.volume);
        }

        if (event.type === 'noteOn') {
          await audioService.playNote(event.note, event.velocity);
        } else if (event.type === 'noteOff') {
          await audioService.stopNote(event.note);
        }
      } catch (error) {
        console.error('Audio playback failed:', error);
        // Gracefully continue without audio
      }
    }
  }
}