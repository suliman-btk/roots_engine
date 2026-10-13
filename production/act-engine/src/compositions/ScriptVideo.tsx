import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import manifestJson from "../data/script-video.json";
import courseConfigRaw from "../../../../course-config.json";
import { CourseConfigContext } from "../course/CourseContext";
import { parseCourseConfig } from "../course/schema";
import { LessonLabelContext } from "../slides/SlideFrame";
import { PrimeScriptScene, logoAreaIsDark } from "../script-video/PrimeScriptScene";
import { SubtitleLayer } from "../script-video/SubtitleLayer";
import { SceneTransition } from "../script-video/SceneTransition";
import { validateScriptVideoManifest } from "../script-video/schema";
import type { ScriptScene } from "../script-video/schema";

const courseConfig = parseCourseConfig(courseConfigRaw);
export const scriptVideoManifest = validateScriptVideoManifest(manifestJson);

/** The new slide is fully revealed this long before the voice reaches its anchor phrase. */
const CUT_LEAD_SECONDS = 0.2;
/** Length of the reveal of a new slide over the previous one. */
const REVEAL_SECONDS = 0.6;
/** Card highlights land this much before the word that names them. */
const ITEM_LEAD_SECONDS = 0.15;
/** A slide stays fully visible at least this long after its last card appears. */
const MIN_HOLD_SECONDS = 1.5;
/** ...but the next slide may lag its own voice by at most this much. */
const MAX_LAG_SECONDS = 1.0;

function revealSeconds(scenes: ScriptScene[], index: number) {
  if (index === 0) return 0;
  return Math.min(REVEAL_SECONDS, scenes[index].durationSeconds / 3, scenes[index - 1].durationSeconds / 3);
}

/** When each slide is fully on screen (its cut), honouring the minimum hold of the slide before. */
export function slideCuts(scenes: ScriptScene[]): number[] {
  return scenes.map((scene, index) => {
    if (index === 0) return 0;
    const prev = scenes[index - 1];
    const prevLast = prev.startSeconds + Math.max(0, ...(prev.visual.itemStartSeconds ?? [0]));
    const desired = scene.startSeconds - CUT_LEAD_SECONDS;
    const earliest = prevLast + MIN_HOLD_SECONDS + revealSeconds(scenes, index);
    return Math.min(Math.max(desired, earliest), scene.startSeconds + MAX_LAG_SECONDS);
  });
}

export function ScriptVideo() {
  const manifest = scriptVideoManifest;
  const fps = manifest.fps;
  const scenes = manifest.scenes;
  const cuts = slideCuts(scenes);

  return (
    <CourseConfigContext.Provider value={courseConfig}>
      <LessonLabelContext.Provider value={manifest.lessonLabel}>
        <AbsoluteFill style={{ backgroundColor: courseConfig.theme.colors.surface }}>
          {/* Voice: continuous, never cut. */}
          {manifest.audioTracks?.map((track) =>
            track.audioSrc ? (
              <Sequence key={track.id} from={Math.round(track.startSeconds * fps)} durationInFrames={Math.max(1, Math.round(track.durationSeconds * fps))} name={`${track.id}-audio`}>
                <Audio src={staticFile(track.audioSrc)} />
              </Sequence>
            ) : null,
          )}
          {scenes.map((scene, index) => {
            const cut = cuts[index];
            const nextCut = index + 1 < scenes.length ? cuts[index + 1] : scene.startSeconds + scene.durationSeconds;
            const reveal = revealSeconds(scenes, index);
            const visualStart = cut - reveal;
            const from = Math.round(visualStart * fps);
            const durationInFrames = Math.max(1, Math.round(nextCut * fps) - from);
            const voiceOffset = scene.startSeconds - visualStart;
            const shifted = {
              ...scene,
              visual: {
                ...scene.visual,
                itemStartSeconds: scene.visual.itemStartSeconds?.map((s) => Math.max(0, s + voiceOffset - ITEM_LEAD_SECONDS)),
              },
            };
            return (
              <React.Fragment key={scene.id}>
                <Sequence from={from} durationInFrames={durationInFrames} name={scene.id}>
                  <SceneTransition sceneIndex={index} revealFrames={Math.round(reveal * fps)} logoOnDark={logoAreaIsDark(scene, index)}>
                    <PrimeScriptScene scene={shifted} lessonLabel={manifest.lessonLabel} sceneIndex={index} />
                  </SceneTransition>
                </Sequence>
                <Sequence from={Math.round(scene.startSeconds * fps)} durationInFrames={Math.max(1, Math.round(scene.durationSeconds * fps))} name={`${scene.id}-captions`}>
                  <SubtitleLayer captions={scene.captions} />
                </Sequence>
              </React.Fragment>
            );
          })}
        </AbsoluteFill>
      </LessonLabelContext.Provider>
    </CourseConfigContext.Provider>
  );
}
