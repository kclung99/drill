# Project: **Drill**

## Overview
Drill is a small web app built with **Next.js + TypeScript**.  
It connects to a MIDI keyboard and helps users with chord recognition and practice.

## Modes
1. **Live Mode**
   - Detect and display the chord from the notes currently pressed.
   - Show a simple piano visualization highlighting pressed keys.

2. **Practice Mode**
   - Display a random target chord from a defined pool.
   - Wait for the user to play the chord.
   - Measure and display response time.
   - Piano visualization shown underneath.

## Piano Visualization
- Covers the standard 88-key range.
- Highlights pressed notes in real time.
- Simple visual layout (white and black keys).

## Simplifications
- Only sharps notation for now.
- No sustain pedal handling.
- No audio playback.
- Use first available MIDI device automatically.

## Structure
- **Pages**
  - `/live` – chord detection and piano display.
  - `/practice` – practice drills with target chords and timing.
- **Components**
  - `Piano` – renders the keyboard and highlights pressed keys.
- **Libraries**
  - Web MIDI API for input.
  - Tonal.js for chord detection and chord sets.
