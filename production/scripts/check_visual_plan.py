#!/usr/bin/env python3
"""Check a lesson's .visuals.json against its narration script — no TTS, no rendering.

Usage:  python3 production/scripts/check_visual_plan.py video-scripts/roots/ROOTS-Lesson-02-....md

Reports, per lesson:
  - phrase anchors that are missing or not unique in their section
  - items whose phrase does not appear in the section's narration
  - cards that would appear together (estimated < 0.45 s apart)
  - list kinds whose item count does not suit the design
  - a summary of design variety (most-used kinds)
Exit code 1 if anything must be fixed.
"""
from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_script_video as b  # noqa: E402

LIMITS = {
    "venn": (2, 3), "quadrant": (4, 4), "comparison": (2, 6), "before-after": (2, 6),
    "pyramid": (3, 5), "layer-stack": (3, 5), "target": (3, 5), "process": (3, 5),
    "staircase": (3, 5), "roadmap-path": (3, 6), "timeline": (3, 6), "cycle": (3, 6),
    "card-grid": (2, 6), "mind-map": (3, 6), "donut": (2, 6), "bar-chart": (2, 6), "checklist": (2, 6),
}


def main(script: Path) -> int:
    _, blocks = b.parse_markdown(script)
    plan = b.load_visual_plan(script)
    errors: list[str] = []
    warnings: list[str] = []
    kinds: Counter[str] = Counter()
    for block in blocks:
        beats = plan.get(block.section)
        if not beats:
            warnings.append(f"{block.section}: no visual plan (auto layout will be used)")
            continue
        # One "word" per spoken token (TTS splits on dashes too); time = token index.
        tokens = re.findall(r"[^\s—–]+", block.narration)
        words = [{"text": t, "start": float(i), "end": float(i + 1)} for i, t in enumerate(tokens)]
        duration = float(len(tokens))
        try:
            starts = [0.0] + [b.resolve_phrase(words, str(x["atPhrase"]), block.section) for x in beats[1:]]
        except ValueError as exc:
            errors.append(str(exc).split(";")[0])
            continue
        ends = starts[1:] + [duration]
        for k, (beat, s0, e0) in enumerate(zip(beats, starts, ends)):
            v = beat["visual"]
            kinds[v["kind"]] += 1
            items = v.get("items") or []
            lo_hi = LIMITS.get(v["kind"])
            if lo_hi and not lo_hi[0] <= len(items) <= lo_hi[1]:
                errors.append(f"{block.section} beat {k}: {v['kind']} needs {lo_hi[0]}–{lo_hi[1]} items, has {len(items)}")
            if v["kind"] == "title" and (block is not blocks[0] or k > 0):
                warnings.append(f"{block.section} beat {k}: mid-video title renders as a section divider (no logo) — intended?")
            phrases = v.get("itemPhrases") or []
            if items and not phrases:
                warnings.append(f"{block.section} beat {k}: items have no itemPhrases — cards will not sync to the voice")
            times = []
            for item, phrase in zip(items, phrases):
                try:
                    t = b.resolve_item_start(words, phrase, item, f"{block.section} beat {k} item {item!r}")
                except ValueError as exc:
                    errors.append(str(exc).split(";")[0])
                    continue
                if not s0 <= t < e0:
                    errors.append(f"{block.section} beat {k}: item {item!r} is spoken outside its slide")
                times.append((t, item))
            times.sort()
            for (t1, a), (t2, c) in zip(times, times[1:]):
                # Together = same word, or the very next word with no pause (comma, "and", "or") between.
                gap = int(t2 - t1)
                pause = gap == 1 and (re.search(r"[,;:.!?]$", tokens[int(t1)]) is not None)
                if gap == 0 or (gap == 1 and not pause):
                    errors.append(f"{block.section} beat {k}: {a!r} and {c!r} would appear together — give each its own phrase")
    print(f"Design use: {', '.join(f'{k}×{n}' for k, n in kinds.most_common())}")
    top = kinds.most_common(1)
    if top and sum(kinds.values()) and top[0][1] / sum(kinds.values()) > 0.3 and top[0][0] not in {"statement"}:
        warnings.append(f"'{top[0][0]}' is used for over 30% of slides — vary the designs")
    for w in warnings:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    print("OK — ready to render" if not errors else f"{len(errors)} error(s) to fix")
    return 1 if errors else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(Path(sys.argv[1])))
