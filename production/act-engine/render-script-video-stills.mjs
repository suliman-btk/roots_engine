/** Render three review stills for every generated script-video timing segment. */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const lesson = (process.argv[2] ?? "01").padStart(2, "0");
const root = process.cwd();
const repo = path.resolve(root, "../..");
const manifestPath = path.join(root, "src", "data", "script-video.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const outDir = path.join(repo, "lessons", `lesson-${lesson}`, "qa", "scene-stills-revision-06-card-redesign");
const contactSheet = path.join(repo, "lessons", `lesson-${lesson}`, "qa", "revision-06-card-redesign-contact-sheet.jpg");
fs.mkdirSync(outDir, { recursive: true });

console.log("Bundling once...");
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  onProgress: (progress) => process.stdout.write(`\r  bundling ${Math.round(progress)}%    `),
});
console.log("\nBundled.");

const composition = await selectComposition({ serveUrl, id: "ScriptVideo" });
const shots = [];
for (const scene of manifest.scenes) {
  const start = Number(scene.startSeconds);
  const end = start + Number(scene.durationSeconds);
  shots.push([`${scene.id}-opening`, Math.min(end - 0.1, start + 0.8)]);
  shots.push([`${scene.id}-middle`, (start + end) / 2]);
  shots.push([`${scene.id}-ending`, Math.max(start + 0.1, end - 0.8)]);
}

for (const [name, seconds] of shots) {
  const frame = Math.max(0, Math.min(composition.durationInFrames - 1, Math.round(seconds * composition.fps)));
  const output = path.join(outDir, `${name}.png`);
  await renderStill({ composition, serveUrl, output, frame, imageFormat: "png" });
  console.log(`${name} (${seconds.toFixed(3)}s, frame ${frame})`);
}

const columns = 8;
const rows = Math.ceil(shots.length / columns);
const ffmpeg = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y", "-pattern_type", "glob",
  "-i", path.join(outDir, "scene-*.png"), "-vf", `scale=240:135,tile=${columns}x${rows}:padding=4:margin=4:color=white`,
  "-frames:v", "1", contactSheet,
], { stdio: "inherit" });
if (ffmpeg.status !== 0) throw new Error("ffmpeg contact-sheet generation failed");
console.log(`Wrote ${shots.length} stills and ${contactSheet}`);
