# ROOTS Lesson 01 — Final QA Report

## Delivery

- File: `output/ROOTS-Lesson-01-Welcome-to-ROOTS.mp4`
- SHA-256: `86b58b54e4b2af980c5be345d2a0eff465943b3dc3fa09cff7b3805268e2ded9`
- Size: 33,913,730 bytes
- Duration: 457.280 seconds (7:37.280)

## Technical validation

- Video: H.264, 1920×1080, 30 fps
- Audio: AAC, 48 kHz, stereo
- Render quality: CRF 16
- Complete ffmpeg decode: passed with no reported errors
- Audio continuity: no silence interval of 3 seconds or longer detected at -45 dB
- Subtitle sidecar: 153 cues in `generated/lesson-01.srt`
- Timing/visual manifest retained in `generated/script-video-manifest.json`

## Visual validation

- 51 review stills retained at 1920×1080.
- Start, middle, and end frames were extracted from the final encoded MP4 and inspected.
- ROOTS course logo is present on the title treatment.
- NAMA corner logo is persistent: colored on light scenes and white on dark scenes.
- Captions remain within the safe lower area and do not conflict with branding.
- Process, timeline, cycle, comparison, staircase, checklist, card-grid, statement,
  question, title, and closing treatments are represented.

## Workflow note

The repository's legacy `npm run check -- 01` path expects an avatar-based
`lesson-01-edl` module and is not compatible with this script-only composition.
The dedicated script-video TypeScript compilation passed, and Remotion rendered
all 13,717 frames successfully before the full decode check.
