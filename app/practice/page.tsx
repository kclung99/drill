'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMidi } from '../hooks/useMidi';
import Piano from '../components/Piano';
import { detectChord, getRandomChord, chordsMatch, getChordNotes, playChord, getChordMidiNotes } from '../utils/chordDetection';
import Link from 'next/link';

export default function PracticeMode() {
  const { pressedKeys, isConnected, isSupported, error, activeMode, currentOctave, audioEnabled, setAudioEnabled } = useMidi();
  const [targetChord, setTargetChord] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isWaitingForNext, setIsWaitingForNext] = useState(false);
  const [chordPlaybackKeys, setChordPlaybackKeys] = useState<Set<number>>(new Set());

  const currentChord = useMemo(() => {
    if (pressedKeys.size === 0) return '';
    return detectChord(Array.from(pressedKeys));
  }, [pressedKeys]);

  const isCorrect = useMemo(() => {
    return currentChord && targetChord && chordsMatch(currentChord, targetChord);
  }, [currentChord, targetChord]);

  const generateNewChord = () => {
    const newChord = getRandomChord();
    setTargetChord(newChord);
    setStartTime(Date.now());
    setResponseTime(null);
    setIsWaitingForNext(false);
  };

  const handleNext = () => {
    generateNewChord();
  };

  const handlePlayChord = async () => {
    const midiNotes = getChordMidiNotes(targetChord);
    setChordPlaybackKeys(new Set(midiNotes));

    // Play the chord
    await playChord(targetChord);

    // Clear the visual highlighting after the chord finishes playing
    setTimeout(() => {
      setChordPlaybackKeys(new Set());
    }, 1500); // Match the duration in playChord function
  };

  useEffect(() => {
    if (isCorrect && startTime && !isWaitingForNext) {
      const time = Date.now() - startTime;
      setResponseTime(time);
      setScore(prev => prev + 1);
      setIsWaitingForNext(true);
    }
  }, [isCorrect, startTime, isWaitingForNext]);

  useEffect(() => {
    generateNewChord();
  }, []);

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

  const targetChordNotes = targetChord ? getChordNotes(targetChord) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Practice Mode</h1>
          <p className="text-gray-600 mb-6">Play the target chord as quickly as possible</p>

          <div className="flex justify-center gap-4 mb-6">
            <Link href="/" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              Home
            </Link>
            <Link href="/live" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Live Mode
            </Link>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-4 py-2 rounded font-medium ${
                audioEnabled
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              🔊 {audioEnabled ? 'Audio On' : 'Audio Off'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Input</h2>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isConnected
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {isConnected
                  ? `${activeMode === 'midi' ? 'MIDI' : 'Keyboard'}`
                  : 'Disconnected'
                }
              </div>
              {activeMode === 'keyboard' && (
                <div className="mt-1">
                  <p className="text-blue-600 text-xs">Use computer keys!</p>
                  {currentOctave !== null && (
                    <p className="text-green-600 text-xs">C{currentOctave} (Z/X)</p>
                  )}
                </div>
              )}
              {error && (
                <p className="text-red-600 mt-2 text-xs">{error}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Score</h2>
              <div className="text-3xl font-bold text-blue-600">{score}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Last Time</h2>
              <div className="text-2xl font-bold text-green-600">
                {responseTime ? `${(responseTime / 1000).toFixed(2)}s` : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Target Chord</h2>
            <div className="text-8xl font-bold text-purple-600 mb-4">
              {targetChord}
            </div>
            {targetChordNotes.length > 0 && (
              <div className="text-gray-600 mb-6">
                Notes: {targetChordNotes.join(' - ')}
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Input</h3>
              <div className={`text-4xl font-bold ${
                isCorrect ? 'text-green-600' : 'text-gray-400'
              }`}>
                {currentChord || '—'}
              </div>
              {isCorrect && (
                <div className="text-green-600 font-semibold mt-2">✓ Correct!</div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              {isWaitingForNext && (
                <button
                  onClick={handleNext}
                  className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 font-semibold"
                >
                  Next Chord
                </button>
              )}

              <button
                onClick={handlePlayChord}
                className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 font-semibold"
                disabled={!targetChord}
              >
                🔊 Play Chord
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Piano</h2>
          <div className="flex justify-center overflow-x-auto">
            <Piano pressedKeys={pressedKeys} chordPlaybackKeys={chordPlaybackKeys} />
          </div>
        </div>
      </div>
    </div>
  );
}