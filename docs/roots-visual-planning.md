# ROOTS lesson visual planning standard

Applies to every ROOTS lesson video (`video-scripts/roots/ROOTS-Lesson-NN-*.md` + `.visuals.json`).
Lesson 01 is the reference implementation.

## Workflow per lesson

1. Copy the approved narration script to `video-scripts/roots/`. Never rewrite narration.
2. Write `<script>.visuals.json` (one entry per `##` section; beats split on `atPhrase`).
3. Check it — no voice, no render:
   `python3 production/scripts/check_visual_plan.py video-scripts/roots/<script>.md`
   Fix every ERROR. Read every WARN.
4. Build narration + plan: `./generate-video video-scripts/roots/<script>.md --no-render`
   Watch the builder for `WARNING: two cards appear together`.
5. Preview in Studio: `cd production/act-engine && npm start` → ScriptVideo.
6. Review render:
   `npx remotion render src/index.ts ScriptVideo out/roots-lesson-NN-review.mp4 --codec=h264 --crf=23 --audio-codec=aac`
7. Final after approval: same command with `--crf=16` and `-final.mp4`.
8. Commit on branch `lesson/roots/NN`.

## Rules for the visual plan

**Content must come from the narration.**
- Every card text is something the voice actually says (shortened is fine, invented is not).
- No numbers in charts unless the narration gives them. `bar-chart` / `donut` values are never made up.

**One card, one spoken moment.**
- Every item has its own `itemPhrases` entry that contains the word naming it.
  The engine anchors the card to that word, not to the start of the phrase.
- Two items must never share a phrase. If the narration names two things in one breath,
  make them one card.
- Phrases must appear exactly once in that section's narration (add a neighbouring word if not).

**Pick the design from the meaning, not for variety alone.**

| The narration says… | Use |
|---|---|
| "not X, but Y" / "instead of" / "rather than" | `before-after` (+ `leftCount`, `leftLabel`, `rightLabel`) |
| two groups that work together (not opposites) | `comparison` with `joiner: "+"` and column labels |
| a list of observable things vs. a question to ask | `comparison` with `joiner: "?"` |
| ordered steps / stages of doing something | `process` (≤5) or `roadmap-path` (journey) |
| a repeating loop | `cycle` |
| layers that build on a foundation, with a peak | `pyramid` (first item = base, last = peak) |
| parts that all serve one goal | `target` (last item = goal) or `mind-map` (`center` = goal) |
| things that sit on top of / align with each other | `layer-stack` |
| exactly four areas around one idea | `quadrant` (`center`) |
| two or three ideas that overlap into one | `venn` (`center` = the overlap) |
| facets of one whole | `donut` (no values) |
| a set of separate examples | `card-grid` |
| a checklist the learner should do | `checklist` |
| a single key sentence | `statement`; a question → `question`; closing → `outro` |
| narrowing many things down to one focus / result | `funnel` (first = broadest; `center` = the result) |
| degrees between two poles, "not simply X or Y" | `spectrum` (`leftLabel`/`rightLabel` = poles; optional `values` 0–100 = positions) |
| keeping two sides in balance / weighing | `balance` (`leftCount`, `leftLabel`, `rightLabel`, `center` e.g. "In balance"; ≤3 per side) |
| one root principle grows into several practices | `tree` (`center` = the root) |
| "if this, then that" — evidence decides the next step | `decision-tree` (`center` = the question; items `"Condition \| Action"`) |
| what is visible vs. what lies beneath | `iceberg` (`leftCount` = 1–2 visible items; rest below) |
| closing a gap from where learners are to a goal | `bridge` (`leftLabel` = start, `rightLabel` = goal; items = supports) |
| numbers actually spoken in the narration | `stat-tiles` (items `"5\|Domains"`; never invent numbers — the checker blocks it) |
| parts that drive each other / interdependence | `gears` (2–4) |
| "X means…" — a key term and its meaning | `definition` (`center` = term; `joiner` = "means" / "means focusing on") |

- `title` is for the opening slide only (it shows the ROOTS logo). A later `title`
  becomes a navy section divider without the logo.
- No single design on more than ~30% of slides; avoid the same design twice in a row.
- Keep card text short: 1–5 words, max ~35 characters.

## Engine behaviour (for reference)

- Voice is continuous; never cut or padded.
- A new slide is revealed over the previous one (wipe, slide, iris, diagonal, fade) and is
  fully visible ~0.2 s before its anchor phrase.
- A slide stays fully visible ≥1.5 s after its last card; the next slide may then lag its
  voice by up to 1 s.
- Cards land 0.15 s before their word; unspoken cards show dimmed.
- NAMA logo: colour on light backgrounds, white on dark — per slide, including during reveals.
