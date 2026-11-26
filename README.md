# Sylva: Recursive Soundscapes

Sylva grows recursive geometry and turns each call into part of a generative soundscape. The standalone `index.html` includes its HTML, CSS, and JavaScript in one file. The editable version is split across `Sylva.html`, `Sylva.css`, and `Sylva.js`.

## Recursive geometries

- **Blossom Tree** — branching limbs grow outward from a trunk; spread and depth shape the canopy.
- **Sierpinski Stars** — recursive triangular subdivision produces a repeating constellation of smaller triangles.
- **Koch Snowflake** — each edge is recursively replaced by four segments around a triangular peak.
- **Spiral Phyllotaxis** — points advance by a golden angle along a Fibonacci-like spiral. The warm, spiral presentation is also referred to as the **Uzumaki Vortex**; it is the same spiral mode, not a separate selector in this build.
- **Recursive Fern (Barnsley Fern)** — asymmetric recursive fronds create a botanical silhouette with varied branch lengths and angles.

All geometries use a bounded recursive call plan. At high depth and branching, the rendered plan is capped at 2,048 nodes to keep drawing and audio responsive.

## How geometry becomes music

Each generated branch, segment, or recursive cell is a call in the composition:

- **Depth** sets the number of recursive levels. A call's depth helps choose its scale degree and octave, so deeper calls generally sound higher and brighter.
- **Branching** sets how many child calls each parent creates. The sibling index contributes to note selection and rhythmic pattern.
- **Spread angle** changes branch directions and contributes to the selected pitch. A branch's horizontal position controls stereo pan.
- **Tempo** sets the base interval between recursive calls. **Fibonacci / Golden Ratio** timing shortens intervals for deeper calls.
- **Scale** constrains generated notes to either C Major Pentatonic or D Lydian. Geometry and seed determine the call sequence and its musical variation.

Live sound uses procedural Web Audio oscillators, an ambient pad, filtering, reverb, a tempo-derived φ echo, voice limiting, and a soft dynamics compressor. Auto-Breathe gently evolves spread and pad tone. The seed makes generated variation repeatable. The Guided Tour demonstrates depth, stereo position, recursive timing, and the spiral inspector view.

## Run Sylva

1. Open `index.html` in a current desktop browser. No build step or external assets are required.
2. Click **Begin growing** (or press **Space**) to start audio. Browsers require a user gesture before playback.
3. Choose a geometry or mood, then adjust depth, branching, spread, tempo, timing, and scale. Use **Copy Link** to share the current settings.

For local development, edit `Sylva.html`, `Sylva.css`, and `Sylva.js`; `index.html` is the self-contained version and should be regenerated from those sources after edits.

## Export a WAV

1. Start or configure the soundscape and choose a composition length (15, 30, or 60 seconds).
2. Click **Export composition** and wait for the progress indicator to finish.
3. Save the downloaded stereo `.wav` file.

Export renders the notes and ambient pad offline and packages them as 16-bit PCM audio. The renderer includes recursive timing and effect tails; muted subtrees are omitted.
