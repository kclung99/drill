'use client';

import { useMemo } from 'react';
import { useMidi } from '../hooks/useMidi';
import Piano from '../components/Piano';
import { detectChord } from '../utils/chordDetection';
import Link from 'next/link';
import { Note } from '@tonaljs/tonal';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">MIDI Not Supported</h1>
          <p className="text-gray-600">Your browser doesn't support Web MIDI API.</p>
          <Link href="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="p-8">
        <div className="flex justify-between items-center">
          <div className="flex-1" />
          <div className="flex justify-center gap-4">
            <Link href="/" className="text-blue-600 hover:underline font-medium">
              home
            </Link>
            <Link href="/live" className="text-blue-600 font-medium underline">
              live
            </Link>
            <Link href="/practice" className="text-blue-600 hover:underline font-medium">
              chord
            </Link>
            <Link href="/drawing" className="text-blue-600 hover:underline font-medium">
              reference
            </Link>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${activeMode === 'midi' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm text-gray-600">
                {activeMode === 'midi' ? 'midi' : 'keyboard'}
              </span>
            </div>
          </div>
        </div>
      </nav>

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