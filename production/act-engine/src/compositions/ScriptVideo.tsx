import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import manifestJson from "../data/script-video.json";
import courseConfigRaw from "../../../../course-config.json";
import { BrandWatermark } from "../brand/BrandWatermark";
import { CourseConfigContext } from "../course/CourseContext";
import { parseCourseConfig } from "../course/schema";
import { LessonLabelContext } from "../slides/SlideFrame";
import { PrimeScriptScene } from "../script-video/PrimeScriptScene";
import { SubtitleLayer } from "../script-video/SubtitleLayer";
import { validateScriptVideoManifest } from "../script-video/schema";

const courseConfig = parseCourseConfig(courseConfigRaw);
export const scriptVideoManifest = validateScriptVideoManifest(manifestJson);

export function ScriptVideo() {
  const manifest = scriptVideoManifest;

  return (
    <CourseConfigContext.Provider value={courseConfig}>
      <LessonLabelContext.Provider value={manifest.lessonLabel}>
        <AbsoluteFill style={{ backgroundColor: courseConfig.theme.colors.surface }}>
          {manifest.audioTracks?.map((track) => {
            const from = Math.round(track.startSeconds * manifest.fps);
            const durationInFrames = Math.max(1, Math.round(track.durationSeconds * manifest.fps));
            return track.audioSrc ? (
              <Sequence key={track.id} from={from} durationInFrames={durationInFrames} name={`${track.id}-audio`}>
                <Audio src={staticFile(track.audioSrc)} />
              </Sequence>
            ) : null;
          })}
          {manifest.scenes.map((scene, sceneIndex) => {
            const from = Math.round(scene.startSeconds * manifest.fps);
            const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * manifest.fps));
            return (
              <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
                <PrimeScriptScene scene={scene} lessonLabel={manifest.lessonLabel} sceneIndex={sceneIndex} />
                {!manifest.audioTracks && scene.audioSrc ? <Audio src={staticFile(scene.audioSrc)} /> : null}
                <BrandWatermark variant={(scene.background ?? (sceneIndex > 0 && sceneIndex % 2 === 0 ? "dark" : "light")) === "dark" ? "dark" : "light"} />
                <SubtitleLayer captions={scene.captions} />
              </Sequence>
            );
          })}
        </AbsoluteFill>
      </LessonLabelContext.Provider>
    </CourseConfigContext.Provider>
  );
}
