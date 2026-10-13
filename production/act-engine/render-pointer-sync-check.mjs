import {bundle} from "@remotion/bundler";
import {renderStill, selectComposition} from "@remotion/renderer";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const repo = path.resolve(root, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/data/script-video.json"), "utf8"));
const scene = manifest.scenes.find((entry) => entry.id === "scene-004-beat-02");
if (!scene?.visual?.itemStartSeconds) throw new Error("Pointer-sync scene or timings not found");

const outDir = path.join(repo, "lessons/lesson-01/qa/revision-06-card-sequence");
const contactSheet = path.join(repo, "lessons/lesson-01/qa/revision-06-card-sequence.jpg");
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(root, "src/index.ts")});
const composition = await selectComposition({serveUrl, id: "ScriptVideo"});
for (let index = 0; index < scene.visual.items.length; index++) {
  const seconds = scene.startSeconds + scene.visual.itemStartSeconds[index] + 0.12;
  const frame = Math.round(seconds * composition.fps);
  const label = scene.visual.items[index].toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await renderStill({
    composition,
    serveUrl,
    output: path.join(outDir, `${String(index + 1).padStart(2, "0")}-${label}.png`),
    frame,
    imageFormat: "png",
  });
}

const result = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y", "-pattern_type", "glob",
  "-i", path.join(outDir, "*.png"), "-vf", "scale=640:360,tile=3x2:padding=8:margin=8:color=white",
  "-frames:v", "1", contactSheet,
], {stdio: "inherit"});
if (result.status !== 0) throw new Error("Could not build pointer-sync contact sheet");
console.log(contactSheet);
