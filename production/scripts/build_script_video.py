#!/usr/bin/env python3
"""Build a branded, avatar-free lesson video from one Markdown script.

The script is the narration authority. Markdown headings organize the visuals but are
not spoken; paragraphs and list items are spoken verbatim. The generated Remotion
composition reuses the course theme and never mounts PresenterLayer.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
ENGINE_DIR = REPO_ROOT / "production" / "act-engine"
PUBLIC_DIR = ENGINE_DIR / "public" / "script-videos"
MANIFEST_PATH = ENGINE_DIR / "src" / "data" / "script-video.json"
OUT_DIR = ENGINE_DIR / "out"
COURSE_CONFIG_PATH = REPO_ROOT / "course-config.json"
TICKS_PER_SECOND = 10_000_000
DEFAULT_VOICE = "en-US-AndrewMultilingualNeural"
VISUAL_KINDS = {
    "title", "statement", "question", "checklist", "process", "timeline",
    "cycle", "comparison", "card-grid", "staircase", "outro",
}


@dataclass
class SourceBlock:
    section: str
    narration: str
    items: list[str]


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "script-video"


def lesson_label(course_config: dict[str, Any], title: str) -> str:
    course_id = str(course_config.get("courseId", "ROOTS"))
    template = str(course_config.get("lessonLabelTemplate", f"{course_id} · Lesson {{lesson}}"))
    match = re.search(r"\bLesson\s+(\d+)\b", title, flags=re.IGNORECASE)
    lesson = match.group(1) if match else title
    return template.replace("{lesson}", lesson)


def clean_markdown(value: str) -> str:
    value = re.sub(r"!\[[^]]*\]\([^)]*\)", "", value)
    value = re.sub(r"\[([^]]+)\]\([^)]*\)", r"\1", value)
    # Square-bracketed phrases in production scripts are delivery directions,
    # not narration (for example: [warm], [slow pace], [short pause]).
    value = re.sub(r"\[[^]\n]{1,100}\]", "", value)
    value = re.sub(r"[*_`>#]", "", value)
    return re.sub(r"\s+", " ", value).strip()


def is_non_spoken_metadata(line: str) -> bool:
    """Return true for script-control text that must never reach TTS."""
    if line.startswith(">"):
        return True
    if line.startswith("**"):
        return True
    return bool(re.fullmatch(r"(?:\[[^]]+\]\s*)+", line))


def split_long_paragraph(text: str, max_words: int = 85) -> list[str]:
    if len(text.split()) <= max_words:
        return [text]
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]
    chunks: list[str] = []
    current: list[str] = []
    count = 0
    for sentence in sentences:
        words = len(sentence.split())
        if current and count + words > max_words:
            chunks.append(" ".join(current))
            current, count = [], 0
        current.append(sentence)
        count += words
    if current:
        chunks.append(" ".join(current))
    return chunks or [text]


def parse_markdown(path: Path) -> tuple[str, list[SourceBlock]]:
    raw = path.read_text(encoding="utf-8")
    title = path.stem.replace("-", " ").title()
    section = "Introduction"
    blocks: list[SourceBlock] = []
    paragraph: list[str] = []
    list_items: list[str] = []

    def flush() -> None:
        nonlocal paragraph, list_items
        if paragraph:
            text = clean_markdown(" ".join(paragraph))
            if text:
                # Keep each authored source scene as one uninterrupted TTS call.
                # Visual changes are timed inside it from real word boundaries.
                blocks.append(SourceBlock(section=section, narration=text, items=[]))
            paragraph = []
        if list_items:
            items = [clean_markdown(item) for item in list_items if clean_markdown(item)]
            if items:
                blocks.append(SourceBlock(section=section, narration=" ".join(items), items=items))
            list_items = []

    for raw_line in raw.splitlines():
        line = raw_line.strip()
        h1 = re.match(r"^#\s+(.+)$", line)
        heading = re.match(r"^#{2,6}\s+(.+)$", line)
        bullet = re.match(r"^(?:[-*+]\s+|\d+[.)]\s+)(.+)$", line)
        if h1:
            flush()
            title = clean_markdown(h1.group(1)) or title
        elif heading:
            flush()
            section = clean_markdown(heading.group(1)) or section
        elif bullet:
            if paragraph:
                flush()
            list_items.append(bullet.group(1))
        elif not line:
            flush()
        elif is_non_spoken_metadata(line):
            flush()
        else:
            if list_items:
                flush()
            paragraph.append(line)
    flush()

    if not blocks:
        raise ValueError(f"{path} contains no narration paragraphs or list items.")
    return title, blocks


def short_exact_text(text: str, max_words: int = 14) -> str:
    first = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)[0].strip()
    words = first.split()
    if len(words) <= max_words:
        return first
    return " ".join(words[:max_words]).rstrip(".,;:—-") + "…"


def visual_for(block: SourceBlock, index: int, total: int, title: str) -> dict[str, Any]:
    if index == 0:
        return {"kind": "title", "title": title, "kicker": block.section}
    if block.items:
        # The section heading describes the relationship; individual item words should
        # not accidentally force a layout (for example, a pillar named "Process").
        context = block.section.lower()
        item_text = " ".join(block.items).lower()
        if re.search(r"\b(compare|comparison|versus|\bvs\b|difference|before and after|on the other hand)\b", context) and len(block.items) >= 2:
            kind = "comparison"
        elif re.search(r"\b(cycle|repeat|continuous|iterate|feedback loop|renew)\b", context):
            kind = "cycle"
        elif re.search(r"\b(timeline|milestone|roadmap|journey|year|month|week|phase)\b", context) or re.search(r"\b(?:19|20)\d{2}\b", item_text):
            kind = "timeline"
        elif re.search(r"\b(stair|level|maturity|grow|growth|progress upward|foundation to)\b", context):
            kind = "staircase"
        elif re.search(r"\b(process|step|sequence|first|then|next|finally|workflow|from .* to)\b", context):
            kind = "process"
        elif re.search(r"\b(checklist|check|requirements|required|remember|before you)\b", context):
            kind = "checklist"
        else:
            # Rotate structurally distinct treatments so consecutive list scenes do not
            # collapse into the same stack of cards when the wording is neutral.
            rotation = ["card-grid", "process", "timeline", "cycle", "staircase"]
            kind = rotation[(index - 1) % len(rotation)]
        return {"kind": kind, "title": block.section, "kicker": "Key points", "items": block.items[:6]}
    questions = [q.strip() for q in re.findall(r"[^?]+\?", block.narration) if q.strip()]
    if questions:
        return {"kind": "question", "title": questions[0], "kicker": block.section, "items": questions[:4]}
    if index == total - 1:
        return {"kind": "outro", "title": short_exact_text(block.narration), "kicker": block.section, "items": []}
    return {"kind": "statement", "title": short_exact_text(block.narration), "kicker": block.section}


def validate_visual(visual: Any, context: str) -> dict[str, Any]:
    if not isinstance(visual, dict):
        raise ValueError(f"Visual must be an object: {context}")
    kind = visual.get("kind")
    if kind not in VISUAL_KINDS or not isinstance(visual.get("title"), str):
        raise ValueError(f"Invalid visual: {context}")
    items = visual.get("items")
    if items is not None and (not isinstance(items, list) or not all(isinstance(item, str) for item in items)):
        raise ValueError(f"Visual items must be strings: {context}")
    item_phrases = visual.get("itemPhrases")
    if item_phrases is not None:
        if not isinstance(item_phrases, list) or not all(isinstance(phrase, str) and phrase.strip() for phrase in item_phrases):
            raise ValueError(f"Visual itemPhrases must be non-empty strings: {context}")
        if not isinstance(items, list) or len(item_phrases) != len(items):
            raise ValueError(f"Visual itemPhrases must match items one-for-one: {context}")
    return visual


def load_visual_plan(script_path: Path) -> dict[str, list[dict[str, Any]]]:
    plan_path = script_path.with_suffix(".visuals.json")
    if not plan_path.is_file():
        return {}
    raw = json.loads(plan_path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError(f"Visual plan must be a JSON object: {plan_path}")
    plan: dict[str, list[dict[str, Any]]] = {}
    for section, beats in raw.items():
        if not isinstance(section, str) or not isinstance(beats, list) or not beats:
            raise ValueError(f"Timed visual-plan entry must be a non-empty array: {section}")
        checked: list[dict[str, Any]] = []
        for beat_index, beat in enumerate(beats):
            if not isinstance(beat, dict):
                raise ValueError(f"Invalid beat {beat_index + 1} for {section}")
            at_phrase = beat.get("atPhrase")
            if at_phrase is not None and not isinstance(at_phrase, str):
                raise ValueError(f"atPhrase must be text for {section} beat {beat_index + 1}")
            checked.append({
                "atPhrase": at_phrase,
                "visual": validate_visual(beat.get("visual"), f"{section} beat {beat_index + 1}"),
            })
        if checked[0]["atPhrase"]:
            raise ValueError(f"The first visual beat for {section} must start at scene opening.")
        plan[section] = checked
    return plan


def normalize_token(value: str) -> str:
    return re.sub(r"[^\w]+", "", value, flags=re.UNICODE).casefold()


def resolve_phrase(words: list[dict[str, Any]], phrase: str, context: str) -> float:
    needle = [token for token in (normalize_token(part) for part in phrase.split()) if token]
    haystack = [normalize_token(str(word["text"])) for word in words]
    matches = [
        index for index in range(0, len(haystack) - len(needle) + 1)
        if haystack[index:index + len(needle)] == needle
    ]
    if len(matches) != 1:
        nearby = " ".join(str(word["text"]) for word in words[:80])
        raise ValueError(
            f"Phrase anchor must resolve exactly once ({context}): {phrase!r}; "
            f"matches={len(matches)}; narration words={nearby!r}"
        )
    return float(words[matches[0]]["start"])


def approximate_words(text: str, duration: float) -> list[dict[str, Any]]:
    tokens = text.split()
    if not tokens:
        return []
    each = duration / len(tokens)
    return [
        {"text": token, "start": index * each, "end": (index + 1) * each}
        for index, token in enumerate(tokens)
    ]


def captions_for_interval(
    words: list[dict[str, Any]],
    interval_start: float,
    interval_end: float,
) -> list[dict[str, Any]]:
    local = [
        {
            "text": word["text"],
            "start": max(0.0, float(word["start"]) - interval_start),
            "end": min(interval_end - interval_start, float(word["end"]) - interval_start),
        }
        for word in words
        if float(word["start"]) < interval_end and float(word["end"]) > interval_start
    ]
    return captions_from_words(local, interval_end - interval_start)


def estimated_duration(text: str) -> float:
    return max(4.0, len(text.split()) / 2.45 + 0.8)


def fallback_captions(text: str, duration: float) -> list[dict[str, Any]]:
    words = text.split()
    groups = [words[i : i + 7] for i in range(0, len(words), 7)]
    if not groups:
        return []
    each = duration / len(groups)
    return [
        {"startSeconds": round(i * each, 3), "endSeconds": round(min(duration, (i + 1) * each), 3), "text": " ".join(group)}
        for i, group in enumerate(groups)
    ]


def captions_from_words(words: list[dict[str, Any]], duration: float) -> list[dict[str, Any]]:
    if not words:
        return []
    cues: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []
    for word in words:
        current.append(word)
        boundary = len(current) >= 7 or re.search(r"[.!?]$", str(word["text"]))
        if boundary:
            cues.append({
                "startSeconds": round(float(current[0]["start"]), 3),
                "endSeconds": round(min(duration, float(current[-1]["end"]) + 0.12), 3),
                "text": " ".join(str(item["text"]) for item in current),
            })
            current = []
    if current:
        cues.append({
            "startSeconds": round(float(current[0]["start"]), 3),
            "endSeconds": round(duration, 3),
            "text": " ".join(str(item["text"]) for item in current),
        })
    return cues


async def synthesize_once(text: str, output_path: Path, voice: str) -> list[dict[str, Any]]:
    try:
        import edge_tts  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "edge-tts is not installed. Run: python3 -m pip install -r "
            "production/scripts/requirements-script-video.txt"
        ) from exc

    words: list[dict[str, Any]] = []
    communicate = edge_tts.Communicate(
        text,
        voice,
        rate="-1%",
        pitch="-1Hz",
        boundary="WordBoundary",
    )
    with output_path.open("wb") as audio:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = float(chunk["offset"]) / TICKS_PER_SECOND
                length = float(chunk["duration"]) / TICKS_PER_SECOND
                words.append({"text": chunk["text"], "start": start, "end": start + length})
    return words


async def synthesize(text: str, output_path: Path, voice: str) -> list[dict[str, Any]]:
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            output_path.unlink(missing_ok=True)
            return await asyncio.wait_for(synthesize_once(text, output_path, voice), timeout=90)
        except Exception as exc:  # hosted TTS can throttle or time out transiently
            last_error = exc
            await asyncio.sleep(2 * (attempt + 1))
    raise RuntimeError(f"TTS failed for {output_path.name}: {last_error}")


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def require_command(name: str) -> None:
    if shutil.which(name) is None:
        raise RuntimeError(f"Required command not found: {name}")


def concatenate_narration(audio_dir: Path, scene_paths: list[Path], slug: str) -> Path:
    """Create one convenient review track while retaining per-scene timing audio."""
    require_command("ffmpeg")
    concat_file = audio_dir / "concat.txt"
    concat_file.write_text(
        "".join(f"file '{path.name}'\n" for path in scene_paths),
        encoding="utf-8",
    )
    output = audio_dir / f"{slug}-narration.mp3"
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat_file),
            "-c", "copy", str(output),
        ],
        check=True,
    )
    concat_file.unlink(missing_ok=True)
    return output


def srt_timestamp(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def write_lesson_artifacts(manifest: dict[str, Any]) -> None:
    """Retain the current timing manifest and subtitle sidecar with the lesson."""
    match = re.search(r"\bLesson\s+(\d+)\b", str(manifest.get("title", "")), flags=re.IGNORECASE)
    if not match:
        return
    lesson = match.group(1).zfill(2)
    generated_dir = REPO_ROOT / "lessons" / f"lesson-{lesson}" / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)
    (generated_dir / "script-video-manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    cues: list[str] = []
    cue_index = 1
    for scene in manifest["scenes"]:
        scene_start = float(scene["startSeconds"])
        for caption in scene["captions"]:
            start = scene_start + float(caption["startSeconds"])
            end = scene_start + float(caption["endSeconds"])
            cues.append(
                f"{cue_index}\n{srt_timestamp(start)} --> {srt_timestamp(end)}\n"
                f"{caption['text']}\n"
            )
            cue_index += 1
    (generated_dir / f"lesson-{lesson}.srt").write_text("\n".join(cues), encoding="utf-8")


async def build_manifest(script_path: Path, voice: str, plan_only: bool) -> dict[str, Any]:
    title, blocks = parse_markdown(script_path)
    visual_plan = load_visual_plan(script_path)
    course_config = json.loads(COURSE_CONFIG_PATH.read_text(encoding="utf-8"))
    slug = slugify(script_path.stem)
    audio_dir = PUBLIC_DIR / slug
    if not plan_only:
        require_command("ffprobe")
        audio_dir.mkdir(parents=True, exist_ok=True)

    scenes: list[dict[str, Any]] = []
    audio_tracks: list[dict[str, Any]] = []
    scene_audio_paths: list[Path] = []
    cursor = 0.0
    for source_index, block in enumerate(blocks):
        source_scene_id = f"source-scene-{source_index + 1:03d}"
        if plan_only:
            duration = estimated_duration(block.narration)
            audio_src = None
            words = approximate_words(block.narration, duration)
        else:
            audio_path = audio_dir / f"{source_scene_id}.mp3"
            print(f"Narrating {source_scene_id} ({source_index + 1}/{len(blocks)})", flush=True)
            words = await synthesize(block.narration, audio_path, voice)
            timing_path = audio_dir / f"{source_scene_id}.words.json"
            timing_path.write_text(
                json.dumps(words, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            duration = probe_duration(audio_path)
            audio_src = f"script-videos/{slug}/{source_scene_id}.mp3"
            scene_audio_paths.append(audio_path)
        audio_tracks.append({
            "id": source_scene_id,
            "startSeconds": round(cursor, 3),
            "durationSeconds": round(duration, 3),
            "audioSrc": audio_src,
            "narration": block.narration,
            "section": block.section,
        })

        beats = visual_plan.get(block.section)
        if not beats:
            beats = [{
                "atPhrase": None,
                "visual": visual_for(block, source_index, len(blocks), title),
            }]
        starts = [0.0]
        for beat_index, beat in enumerate(beats[1:], start=2):
            starts.append(resolve_phrase(words, str(beat["atPhrase"]), f"{block.section} beat {beat_index}"))
        if any(right <= left for left, right in zip(starts, starts[1:])):
            raise ValueError(f"Visual phrase anchors are not strictly increasing in {block.section}")
        ends = [*starts[1:], duration]
        for beat_index, (beat, beat_start, beat_end) in enumerate(zip(beats, starts, ends), start=1):
            beat_words = [str(word["text"]) for word in words if beat_start <= float(word["start"]) < beat_end]
            captions = captions_for_interval(words, beat_start, beat_end)
            visual = dict(beat["visual"])
            item_phrases = visual.pop("itemPhrases", None)
            if item_phrases:
                item_starts = [
                    max(0.0, resolve_phrase(words, phrase, f"{block.section} beat {beat_index} item {item_index}" ) - beat_start)
                    for item_index, phrase in enumerate(item_phrases, start=1)
                ]
                if any(right < left for left, right in zip(item_starts, item_starts[1:])):
                    raise ValueError(f"Item phrase anchors are not in narration order in {block.section} beat {beat_index}")
                if any(start >= beat_end - beat_start for start in item_starts):
                    raise ValueError(f"Item phrase anchor falls outside its visual beat in {block.section} beat {beat_index}")
                visual["itemStartSeconds"] = [round(start, 3) for start in item_starts]
            scenes.append({
                "id": f"scene-{source_index + 1:03d}-beat-{beat_index:02d}",
                "sourceSceneId": source_scene_id,
                "startSeconds": round(cursor + beat_start, 3),
                "durationSeconds": round(beat_end - beat_start, 3),
                "audioSrc": None,
                "narration": " ".join(beat_words),
                "section": block.section,
                "background": "dark" if source_index > 0 and source_index % 2 == 0 else "light",
                "visual": visual,
                "captions": captions,
            })
        cursor += duration

    narration_audio_src = None
    if not plan_only:
        narration_path = concatenate_narration(audio_dir, scene_audio_paths, slug)
        narration_audio_src = f"script-videos/{slug}/{narration_path.name}"
        print(f"Narration: {narration_path}")

    return {
        "version": 1,
        "slug": slug,
        "title": title,
        "lessonLabel": lesson_label(course_config, title),
        "fps": 30,
        "width": 1920,
        "height": 1080,
        "totalDurationSeconds": round(cursor, 3),
        "narrationAudioSrc": narration_audio_src,
        "audioTracks": audio_tracks,
        "scenes": scenes,
    }


def refresh_manifest_visuals(script_path: Path) -> dict[str, Any]:
    """Update only lesson visual data while preserving approved audio and timings."""
    if not MANIFEST_PATH.is_file():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    title, blocks = parse_markdown(script_path)
    raise ValueError("Timed visual plans use phrase anchors; rebuild narration to refresh visuals safely.")
    course_config = json.loads(COURSE_CONFIG_PATH.read_text(encoding="utf-8"))
    manifest["title"] = title
    manifest["lessonLabel"] = lesson_label(course_config, title)
    return manifest


def render_video(manifest: dict[str, Any], final: bool, approved_by: str | None) -> Path:
    require_command("npx")
    if final and not approved_by:
        raise ValueError("Final render requires --approved-by NAME after review approval.")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    suffix = "" if final else "-review"
    output = OUT_DIR / f"{manifest['slug']}{suffix}.mp4"
    crf = "16" if final else "23"
    subprocess.run(
        [
            "npx", "remotion", "render", "src/index.ts", "ScriptVideo", str(output),
            "--codec=h264", f"--crf={crf}", "--audio-codec=aac",
        ],
        cwd=ENGINE_DIR,
        check=True,
    )
    if final:
        approval = OUT_DIR / f"{manifest['slug']}-approval.json"
        approval.write_text(json.dumps({"approvedBy": approved_by}, indent=2) + "\n", encoding="utf-8")
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a NAMA/ACT-themed video from one Markdown narration script.")
    parser.add_argument("script", type=Path, help="Markdown script. H1 is the title; H2 headings organize scenes.")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Edge multilingual voice name.")
    parser.add_argument("--plan-only", action="store_true", help="Build the visual manifest without TTS or rendering.")
    parser.add_argument("--no-render", action="store_true", help="Generate narration and the manifest, but no review MP4.")
    parser.add_argument("--refresh-visuals", action="store_true", help="Update visuals only; preserve existing narration, captions, and timing.")
    parser.add_argument("--final", action="store_true", help="Render the approved CRF 16 final instead of a review MP4.")
    parser.add_argument("--approved-by", help="Reviewer name required with --final.")
    return parser.parse_args()


async def async_main() -> int:
    args = parse_args()
    script_path = args.script.expanduser().resolve()
    if not script_path.is_file():
        raise FileNotFoundError(f"Script not found: {script_path}")
    if sum(bool(value) for value in (args.plan_only, args.refresh_visuals, args.final)) > 1:
        raise ValueError("--plan-only, --refresh-visuals, and --final cannot be combined.")

    manifest = refresh_manifest_visuals(script_path) if args.refresh_visuals else await build_manifest(script_path, args.voice, args.plan_only)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_lesson_artifacts(manifest)
    print(f"Manifest: {MANIFEST_PATH}")

    if args.plan_only or args.no_render or args.refresh_visuals:
        return 0
    output = render_video(manifest, args.final, args.approved_by)
    print(f"Video: {output}")
    return 0


def main() -> int:
    try:
        return asyncio.run(async_main())
    except (ValueError, FileNotFoundError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
