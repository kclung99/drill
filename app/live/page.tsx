'use client';

import { useMemo } from 'react';
import { useMidi } from '../hooks/useMidi';
import Piano from '../components/Piano';
import { detectChord } from '../utils/chordDetection';
import Link from 'next/link';

export default function LiveMode() {
  const {
    pressedKeys,
    isConnected,
    isSupported,
    error,
    activeMode,
    keyboardMapping,
    currentOctave,
    audioEnabled,
    setAudioEnabled
  } = useMidi();

  const currentChord = useMemo(() => {
    if (pressedKeys.size === 0) return '';
    return detectChord(Array.from(pressedKeys));
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Live Mode</h1>
          <p className="text-gray-600 mb-6">Play your MIDI keyboard to see chord detection in real-time</p>

          <div className="flex justify-center gap-4 mb-6">
            <Link href="/" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              Home
            </Link>
            <Link href="/practice" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Practice Mode
            </Link>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-4 py-2 rounded font-medium ${
                audioEnabled
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              🔊 {audioEnabled ? 'Audio On' : 'Audio Off'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Input Status</h2>
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              isConnected
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {isConnected
                ? `${activeMode === 'midi' ? 'MIDI' : 'Keyboard'} Connected`
                : 'Input Disconnected'
              }
            </div>
            {activeMode === 'keyboard' && (
              <div className="mt-2">
                <p className="text-blue-600 text-sm">
                  💡 Using computer keyboard - press keys to play notes!
                </p>
                {currentOctave !== null && (
                  <p className="text-green-600 text-sm">
                    Current octave: C{currentOctave} (use Z/X to change)
                  </p>
                )}
              </div>
            )}
            {error && (
              <p className="text-red-600 mt-2 text-sm">{error}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Detected Chord</h2>
            <div className="text-6xl font-bold text-blue-600 min-h-[80px] flex items-center justify-center">
              {currentChord || '—'}
            </div>
            <p className="text-gray-500 mt-2">
              {pressedKeys.size > 0 ? `${pressedKeys.size} keys pressed` : 'No keys pressed'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Piano</h2>
          <div className="flex justify-center overflow-x-auto">
            <Piano pressedKeys={pressedKeys} />
          </div>
        </div>

        {activeMode === 'keyboard' && keyboardMapping && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">
              Keyboard Mapping {currentOctave !== null && `(Current: C${currentOctave})`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">White Keys (ASDF Row)</h3>
                <div className="space-y-1 font-mono">
                  <div>A → C{currentOctave}</div>
                  <div>S → D{currentOctave}</div>
                  <div>D → E{currentOctave}</div>
                  <div>F → F{currentOctave}</div>
                  <div>G → G{currentOctave}</div>
                  <div>H → A{currentOctave}</div>
                  <div>J → B{currentOctave}</div>
                  <div>K → C{currentOctave !== null ? currentOctave + 1 : '?'}</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Black Keys (QWER Row)</h3>
                <div className="space-y-1 font-mono">
                  <div>W → C#{currentOctave}</div>
                  <div>E → D#{currentOctave}</div>
                  <div>T → F#{currentOctave}</div>
                  <div>Y → G#{currentOctave}</div>
                  <div>U → A#{currentOctave}</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Controls & Tips</h3>
                <div className="space-y-1 text-gray-600">
                  <div className="font-semibold text-gray-900">Octave Controls:</div>
                  <div>Z → Lower octave</div>
                  <div>X → Raise octave</div>
                  <div className="mt-3 font-semibold text-gray-900">Tips:</div>
                  <div>• Ableton-style layout</div>
                  <div>• Try A-D-G for C major!</div>
                  <div>• Use W-E for sharps</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}