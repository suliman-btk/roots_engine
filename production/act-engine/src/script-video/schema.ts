export type ScriptCaption = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type ScriptVisual = {
  kind:
    | "title"
    | "statement"
    | "question"
    | "checklist"
    | "process"
    | "timeline"
    | "cycle"
    | "comparison"
    | "card-grid"
    | "staircase"
    | "outro";
  title: string;
  kicker?: string;
  items?: string[];
  itemStartSeconds?: number[];
};

export type ScriptScene = {
  id: string;
  sourceSceneId?: string;
  startSeconds: number;
  durationSeconds: number;
  audioSrc: string | null;
  narration: string;
  section: string;
  background?: "light" | "dark";
  visual: ScriptVisual;
  captions: ScriptCaption[];
};

export type ScriptAudioTrack = {
  id: string;
  startSeconds: number;
  durationSeconds: number;
  audioSrc: string | null;
  narration: string;
  section: string;
};

export type ScriptVideoManifest = {
  version: 1;
  slug: string;
  title: string;
  lessonLabel: string;
  fps: number;
  width: number;
  height: number;
  totalDurationSeconds: number;
  audioTracks?: ScriptAudioTrack[];
  scenes: ScriptScene[];
};

export function validateScriptVideoManifest(value: unknown): ScriptVideoManifest {
  if (!value || typeof value !== "object") {
    throw new Error("Script-video manifest must be an object.");
  }

  const manifest = value as Partial<ScriptVideoManifest>;
  if (manifest.version !== 1 || !manifest.title || !Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
    throw new Error("Invalid script-video manifest. Re-run the script-video builder.");
  }
  if (!manifest.totalDurationSeconds || manifest.totalDurationSeconds <= 0) {
    throw new Error("Script-video manifest has no positive duration.");
  }
  return manifest as ScriptVideoManifest;
}
