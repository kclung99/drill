'use client';

import React from 'react';

interface PianoProps {
  pressedKeys: Set<number>;
  chordPlaybackKeys?: Set<number>; // Keys to highlight during chord playback
  targetChordKeys?: Set<number>; // Keys to highlight for target chord
}

const Piano: React.FC<PianoProps> = ({ pressedKeys, chordPlaybackKeys = new Set(), targetChordKeys = new Set() }) => {

  const generateKeys = () => {
    const keys = [];
    const whiteKeyWidth = 40;
    const blackKeyWidth = 24;
    const blackKeyHeight = 100;
    const whiteKeyHeight = 160;

    // Display C2 to B5 (four octaves)
    const startMidi = 36; // C2
    const endMidi = 83;   // B5

    // First, generate all white keys
    let whiteKeyIndex = 0;
    for (let midiNote = startMidi; midiNote <= endMidi; midiNote++) {
      const noteInOctave = midiNote % 12;
      const isWhiteKey = [0, 2, 4, 5, 7, 9, 11].includes(noteInOctave); // C, D, E, F, G, A, B

      if (isWhiteKey) {
        const xPos = whiteKeyIndex * whiteKeyWidth;

        // Determine the color based on key state
        let bgColor = 'hover:bg-gray-100';
        if (pressedKeys.has(midiNote)) {
          bgColor = 'bg-blue-300'; // User pressed keys (blue)
        } else if (chordPlaybackKeys.has(midiNote)) {
          bgColor = 'bg-gray-300'; // Chord playback keys
        } else if (targetChordKeys.has(midiNote)) {
          bgColor = 'bg-red-300'; // Target chord keys
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
        let bgColor = 'bg-black hover:bg-gray-700';
        if (pressedKeys.has(midiNote)) {
          bgColor = 'bg-blue-500'; // User pressed keys (darker blue)
        } else if (chordPlaybackKeys.has(midiNote)) {
          bgColor = 'bg-gray-600'; // Chord playback keys
        } else if (targetChordKeys.has(midiNote)) {
          bgColor = 'bg-red-600'; // Target chord keys
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

  // Calculate width based on number of white keys (28 white keys from C2 to B5)
  const whiteKeyCount = 28;
  const whiteKeyWidth = 40;
  const totalWidth = whiteKeyCount * whiteKeyWidth;

  return (
    <div className="relative" style={{ width: `${totalWidth}px`, height: '180px' }}>
      {generateKeys()}
    </div>
  );
};

export default Piano;