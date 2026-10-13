# ACT Video Engine

## Avatar-free script mode

The engine also supports an independent script-only workflow. It uses the PRIME course
configuration, co-brand assets, light/navy visual language, captions, and
render settings, but it does not load presenter footage or mount `PresenterLayer`.

From the repository root, add a Markdown file under `video-scripts/` and run:

```bash
./generate-video video-scripts/my-video.md
```

This produces an automatically narrated review MP4. See `video-scripts/README.md` for
the Markdown format, plan-only mode, and the approval-gated final render command.

The script-only visual planner selects among animated process flows, alternating
timelines, orbit cycles, comparison panels, card constellations, staircases, and
checklists. It alternates PRIME light and deep-blue scenes and uses staggered reveals,
drawn connectors, moving emphasis, word builds, and subtle ambient motion so consecutive
ideas do not look or move alike.

A provider-independent Remotion engine that turns a locked lesson script + real avatar
footage into a finished lesson video, following `claude/video-engine-production-rules.md`
(the project's standing rulebook — read that first).

## Why this exists, and how it differs from `production/remotion-engine`

The old engine (`videos-ACT/act-video-course/production/remotion-engine`) was built around a
hand-coded 2D Lottie avatar driven by synthesized TTS — no real camera footage. This engine
is for the new pipeline: a real avatar video (Google Vids, HeyGen, Synthesia, a recorded
presenter — doesn't matter which) plus a script, aligned to the footage's *actual* timing.

**Architectural change worth knowing about:** the old pipeline rendered overlays as a
separate PNG-sequence pass and composited them onto the source video with ffmpeg
(`zoompan` + `overlay`), which is what caused the A/V drift bugs documented in
`video-editing-engine-spec.md`. This engine never leaves Remotion: the avatar video plays as
one continuous `<OffthreadVideo>` layer spanning the whole lesson, and every graphic is a
React layer composited in the same timeline. There is no second encoding pass, so there is
nothing to drift — audio and picture are the source file's own, frame-accurate throughout.

## How a lesson gets built

1. **Get the real timing.** `resolveAnchors.ts` takes a word-level timing track (see
   `data/lesson-01-word-timing.json`, extracted from the footage's own caption track — a
   proper forced-aligner is a straightforward swap-in if one becomes available) and resolves
   `atPhrase` anchors in an EDL to real seconds. Never trust the written script's timing.
2. **Author the EDL.** This is Claude's job as director/editor (rule 17) — a JSON object
   (`edl/schema.ts`) describing scenes (presenter layout + timing) and events (which
   component shows when, anchored to a phrase in the ACTUAL transcript). See
   `data/lesson-01-edl.ts` for a full worked example, including how it handles a footage
   transcript that didn't match the approved script.
3. **Render.** `compositions/Lesson01.tsx` resolves the EDL, then `PresenterLayer` draws the
   avatar per the current layout and `EventRenderer` mounts each event's component from
   `components/registry.ts` for its resolved time window.

## The four things the first pass got wrong

Worth recording, because they are the failure modes this kind of engine falls into:

1. **Transitions existed in the schema and the preset library, but nothing rendered them.**
   `transitionIn`/`transitionOut` parsed fine and were simply never read, so every scene
   change was a raw jump — and since the avatar tool generates one clip per scene, each of
   those jumps also carried a visible change in the presenter's pose and energy.
   `transitions/SceneTransitionLayer.tsx` now draws them, centred on the seam, and also
   covers hard cuts detected in the source itself with ffmpeg scene detection.
2. **Shrinking the presenter into a box on black.** The source is a full 1920x1080 shot of a
   real room; putting it in a 60%-wide box discarded the room and replaced it with nothing.
   Full-bleed is now the default, "medium"/"close" are camera punch-ins rather than smaller
   pictures, and `presenter/Stage.tsx` fills whatever the presenter vacates with a blurred,
   brand-washed copy of the same footage — so the room is always still there.
3. **Scenes that shrank the presenter with no graphic to fill the space.** Now structurally
   impossible: `edl/enforceLayoutRules.ts` promotes any such scene back to full-bleed and
   reports it, so the EDL can't produce an empty frame even if the planner asks for one.
4. **Text cards standing in for infographics.** A list of three rows is not a diagram of
   three zones. `ThreeZoneDiagram` draws the actual concentric circles the narration
   describes ("picture three circles"), and `FourStepJourney` draws the four units as one
   path with a spine, each node lighting up on the timestamp where it is named.

## What's built vs. what's a template to extend

Built and rendering: the full presenter layout vocabulary (`presenter/layoutConfig.ts`), the
stage backdrop, the transition layer, the layout-safety pass, seven of the seventeen rule-4
graphic components (ThreeZoneDiagram, FourStepJourney, KeyStatement, ScenarioSequence,
DefinitionCard, QuoteCard, LessonSummary), the transition and motion preset libraries, the
provider-independent `AnimationProvider` interface with a licensing gate that refuses
anything not `approved: true` (rules 6-9), and a full worked EDL for Lesson 1.

Two of those seven are true diagrams; the rest are text-bearing cards, which is the right
call for their content (a definition, a quotation, a key sentence). When a lesson needs a
concept drawn rather than written, build it as a diagram like the two above rather than
reaching for a list.

Reserved, not yet implemented: the other ten components in the rule-4 vocabulary
(Timeline, ProcessFlow, ComparisonCards, BeforeAfter, CycleDiagram,
QuestionCard, BigNumber, Checklist, WorksheetViewer) — add them the same way as the six
built ones (`CardShell` + `theme.ts` + your own layout), so lessons 2-20 don't invent a new
look each time. Subtitles (rule 15) aren't wired up yet — the per-scene actual transcript is
already sitting in `lesson-01-scenes-ACTUAL.md`, it just needs a `<Subtitle>` layer added to
`Lesson01.tsx`. Per-zone/per-item highlight timing inside `ThreeZoneDiagram` is intentionally
not implemented yet (noted as a follow-up in `data/lesson-01-edl.ts`) — the diagram currently
shows all three zones without live highlighting, to keep the first pass reliable.

## Running it

```
npm install
npm start          # Remotion Studio — scrub the timeline interactively
./render-local.sh                  # full lesson -> out/
./render-local.sh 11200 11400      # just those frames, to check one change fast
npm run typecheck
```

**Render it on your own machine.** A full 12.5-minute lesson is ~22,400 frames. The cloud
sandbox this was built in has 2 cores and takes 70-90 minutes; a MacBook Air has 8-10 and
should manage it in a fraction of that, since Remotion renders frames in parallel across
cores. `remotion.config.ts` sets concurrency to "all available", detects whether it is in the
sandbox, and otherwise lets Remotion download and manage its own Chromium — so there is
nothing to edit before running it locally. Only prerequisite is Node 18+.

Iterating on a single transition or slide? Render the 200-frame window around it rather than
the whole lesson. That is seconds, not an hour, and it is how every fix in this engine was
checked.

Put the lesson's avatar video in `public/` (matching `avatarVideoSrc` in its EDL file) before
rendering — it's git-ignored here because of size; see `public/.gitkeep`.

## Known gaps to close before lesson-01 ships

See `lesson-01-scenes-ACTUAL.md` (in `Desktop/Claude outputs/`) for the four content flags:
the Bismillah/hadith spoken as transliteration rather than native Arabic, "NAMA Foundation"
captioned as "Norma Foundation," an invented "seven championships in a row," and ~45
uncaptioned seconds at the very end of the video whose content is still unverified.
