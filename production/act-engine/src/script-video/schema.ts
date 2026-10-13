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
    | "bar-chart"
    | "donut"
    | "pyramid"
    | "venn"
    | "mind-map"
    | "target"
    | "quadrant"
    | "roadmap-path"
    | "layer-stack"
    | "before-after"
    | "outro";
  title: string;
  kicker?: string;
  items?: string[];
  itemStartSeconds?: number[];
  /** Optional numbers for bar-chart / donut, one per item. */
  values?: number[];
  /** Suffix shown after values, e.g. "%". */
  unit?: string;
  /** Centre label for venn overlap / mind-map hub / donut middle. */
  center?: string;
  /** Column headings for before-after (defaults: "Avoid" / "Aim for"). */
  leftLabel?: string;
  rightLabel?: string;
  /** comparison / before-after: how many items go in the left column. */
  leftCount?: number;
  /** comparison: badge between the columns (default "VS"; e.g. "+" or "?"). */
  joiner?: string;
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
