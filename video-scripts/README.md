# Video scripts

Put one Markdown narration script in this directory, then run the builder from the
repository root:

```bash
./generate-video video-scripts/my-video.md
```

The command creates narration, captions, a visual plan, and an avatar-free review
video using the repository's PRIME course theme. The review MP4 is written to
`production/act-engine/out/<script-name>-review.mp4`.

## Script format

```markdown
# Video title

## Opening

This paragraph is spoken exactly as written. Each paragraph becomes a visual scene.

## Key points

- First list item, spoken exactly as written.
- Second list item, spoken exactly as written.
```

- The `#` title and `##` section headings organize the visuals and are not narrated.
- Paragraphs and list items are narration and are never rewritten.
- Blank lines create natural scene boundaries.
- Long paragraphs are split only at sentence boundaries.

## Automatic visual variety

The engine reads section wording and list structure to select a suitable treatment:

- processes and sequential steps → animated process flow;
- dates, phases, journeys, and milestones → animated timeline;
- repeating or continuous ideas → orbit cycle;
- contrasts and alternatives → comparison panels;
- levels and growth → ascending staircase;
- neutral groups → animated card constellation, with structural rotation to avoid repetition.

Scenes alternate between PRIME's light and deep-blue surfaces. Cards, connectors,
diagram nodes, emphasis states, background ornaments, and headlines animate in a
controlled sequence while the narration plays.

## Commands

Install the one Python dependency once:

```bash
python3 -m pip install -r production/scripts/requirements-script-video.txt
cd production/act-engine && npm install && cd ../..
```

Build a visual plan without network access or narration:

```bash
./generate-video video-scripts/my-video.md --plan-only
```

Generate narration and data but skip the review render:

```bash
./generate-video video-scripts/my-video.md --no-render
```

After the review video is approved, create the final CRF 16 render:

```bash
./generate-video video-scripts/my-video.md --final --approved-by "Reviewer name"
```
