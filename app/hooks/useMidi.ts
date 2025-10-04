'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CompositeInputService, InputMode } from '../services/compositeInputService';
import { InputEvent } from '../services/inputService';

interface InputState {
  isSupported: boolean;
  isConnected: boolean;
  pressedKeys: Set<number>;
  error: string | null;
  activeMode: 'midi' | 'keyboard' | null;
  keyboardMapping: Record<string, number> | null;
  currentOctave: number | null;
}

export const useInput = (mode: InputMode = 'auto') => {
  const [inputState, setInputState] = useState<InputState>({
    isSupported: false,
    isConnected: false,
    pressedKeys: new Set(),
    error: null,
    activeMode: null,
    keyboardMapping: null,
    currentOctave: null,
  });

  const serviceRef = useRef<CompositeInputService | null>(null);

  const handleInputEvent = useCallback((event: InputEvent) => {
    setInputState(prev => {
      const newPressed = new Set(prev.pressedKeys);

      if (event.type === 'noteOn') {
        newPressed.add(event.note);
      } else if (event.type === 'noteOff') {
        newPressed.delete(event.note);
      }

      return {
        ...prev,
        pressedKeys: newPressed
      };
    });
  }, []);

  const connect = useCallback(async () => {
    try {
      const service = new CompositeInputService(mode);
      serviceRef.current = service;

      setInputState(prev => ({
        ...prev,
        isSupported: service.isSupported(),
        error: null
      }));

      service.onInputEvent(handleInputEvent);
      await service.connect();

      setInputState(prev => ({
        ...prev,
        isConnected: service.isConnected(),
        activeMode: service.getActiveMode(),
        keyboardMapping: service.getKeyboardMapping(),
        currentOctave: service.getCurrentOctave(),
        error: service.getError()
      }));

    } catch (error) {
      setInputState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown input error',
        isConnected: false
      }));
    }
  }, [mode, handleInputEvent]);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.offInputEvent(handleInputEvent);
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }

    setInputState(prev => ({
      ...prev,
      isConnected: false,
      pressedKeys: new Set(),
      activeMode: null,
      keyboardMapping: null,
      currentOctave: null
    }));
  }, [handleInputEvent]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...inputState,
    connect,
    disconnect,
  };
};

// Keep backward compatibility
export const useMidi = () => useInput('auto');