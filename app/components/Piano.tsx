'use client';

import React from 'react';

interface PianoProps {
  pressedKeys: Set<number>;
  chordPlaybackKeys?: Set<number>; // Keys to highlight during chord playback
}

const Piano: React.FC<PianoProps> = ({ pressedKeys, chordPlaybackKeys = new Set() }) => {

  const generateKeys = () => {
    const keys = [];
    const whiteKeyWidth = 40;
    const blackKeyWidth = 24;
    const blackKeyHeight = 100;
    const whiteKeyHeight = 160;

    // Start from A0 (MIDI 21) and go to C8 (MIDI 108)
    const startMidi = 21; // A0
    const endMidi = 108;  // C8

    // First, generate all white keys
    let whiteKeyIndex = 0;
    for (let midiNote = startMidi; midiNote <= endMidi; midiNote++) {
      const noteInOctave = midiNote % 12;
      const isWhiteKey = [0, 2, 4, 5, 7, 9, 11].includes(noteInOctave); // C, D, E, F, G, A, B

      if (isWhiteKey) {
        const xPos = whiteKeyIndex * whiteKeyWidth;

        // Determine the color based on key state
        let bgColor = 'bg-white hover:bg-gray-50';
        if (pressedKeys.has(midiNote)) {
          bgColor = 'bg-blue-300'; // User pressed keys (blue)
        } else if (chordPlaybackKeys.has(midiNote)) {
          bgColor = 'bg-pink-200'; // Chord playback keys (light pink)
        }

        keys.push(
          <div
            key={`white-${midiNote}`}
            className={`absolute border border-gray-300 ${bgColor}`}
            style={{
              left: xPos,
              width: whiteKeyWidth,
              height: whiteKeyHeight,
              zIndex: 1,
            }}
            title={`MIDI ${midiNote}`}
          />
        );

        whiteKeyIndex++;
      }
    }

    // Then, generate black keys positioned between white keys
    whiteKeyIndex = 0;
    for (let midiNote = startMidi; midiNote <= endMidi; midiNote++) {
      const noteInOctave = midiNote % 12;
      const isWhiteKey = [0, 2, 4, 5, 7, 9, 11].includes(noteInOctave);
      const isBlackKey = [1, 3, 6, 8, 10].includes(noteInOctave); // C#, D#, F#, G#, A#

      if (isWhiteKey) {
        whiteKeyIndex++;
      } else if (isBlackKey) {
        // Position black key between white keys
        let blackKeyPosition = 0;

        if (noteInOctave === 1) { // C# - between C and D
          blackKeyPosition = whiteKeyIndex * whiteKeyWidth - blackKeyWidth / 2;
        } else if (noteInOctave === 3) { // D# - between D and E
          blackKeyPosition = whiteKeyIndex * whiteKeyWidth - blackKeyWidth / 2;
        } else if (noteInOctave === 6) { // F# - between F and G
          blackKeyPosition = whiteKeyIndex * whiteKeyWidth - blackKeyWidth / 2;
        } else if (noteInOctave === 8) { // G# - between G and A
          blackKeyPosition = whiteKeyIndex * whiteKeyWidth - blackKeyWidth / 2;
        } else if (noteInOctave === 10) { // A# - between A and B
          blackKeyPosition = whiteKeyIndex * whiteKeyWidth - blackKeyWidth / 2;
        }

        // Determine the color based on key state
        let bgColor = 'bg-gray-900 hover:bg-gray-800';
        if (pressedKeys.has(midiNote)) {
          bgColor = 'bg-blue-600'; // User pressed keys (darker blue)
        } else if (chordPlaybackKeys.has(midiNote)) {
          bgColor = 'bg-pink-400'; // Chord playback keys (darker pink for black keys)
        }

        keys.push(
          <div
            key={`black-${midiNote}`}
            className={`absolute border border-gray-400 ${bgColor}`}
            style={{
              left: blackKeyPosition,
              width: blackKeyWidth,
              height: blackKeyHeight,
              zIndex: 2,
            }}
            title={`MIDI ${midiNote}`}
          />
        );
      }
    }

    return keys;
  };

  return (
    <div className="relative bg-gray-100 p-4 rounded-lg shadow-lg">
      <div className="relative" style={{ width: '1400px', height: '180px' }}>
        {generateKeys()}
      </div>
      {pressedKeys.size > 0 && (
        <div className="text-xs text-gray-600 mt-2">
          Pressed MIDI notes: {Array.from(pressedKeys).sort((a, b) => a - b).map(note => {
            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const octave = Math.floor(note / 12) - 1;
            const noteIndex = note % 12;
            return `${note} (${noteNames[noteIndex]}${octave})`;
          }).join(', ')}
        </div>
      )}
    </div>
  );
};

export default Piano;