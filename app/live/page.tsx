'use client';

import { useMemo } from 'react';
import { useMidi } from '../hooks/useMidi';
import Piano from '../components/Piano';
import { detectChord } from '../utils/chordDetection';
import { Note } from '@tonaljs/tonal';
import { NavBar } from '@/components/nav-bar';

export default function LiveMode() {
  const {
    pressedKeys,
    isSupported,
    activeMode
  } = useMidi();

  const currentChord = useMemo(() => {
    if (pressedKeys.size === 0) return '';
    return detectChord(Array.from(pressedKeys));
  }, [pressedKeys]);

  const noteNames = useMemo(() => {
    return Array.from(pressedKeys)
      .sort((a, b) => a - b)
      .map(midi => Note.fromMidi(midi))
      .join(' ');
  }, [pressedKeys]);

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="live" showMidiStatus={true} midiActive={activeMode === 'midi'} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">MIDI Not Supported</h1>
            <p className="text-gray-600">Your browser doesn't support Web MIDI API.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar currentPage="live" showMidiStatus={true} midiActive={activeMode === 'midi'} />

      <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8">

        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl font-bold text-blue-600">
            {currentChord || '-'}
          </div>
          <div className="text-lg text-gray-500">
            {noteNames || '-'}
          </div>
        </div>

        <div>
          <Piano pressedKeys={pressedKeys} />
        </div>
      </div>
    </div>
  );
}