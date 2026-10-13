import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../course/CourseContext";
import type { ScriptCaption } from "./schema";

export function SubtitleLayer({ captions }: { captions: ScriptCaption[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const now = frame / fps;
  const cue = captions.find((caption) => now >= caption.startSeconds && now < caption.endSeconds);

  if (!cue) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-end", alignItems: "center" }}>
      <div
        style={{
          marginBottom: 54,
          maxWidth: 1320,
          padding: "14px 26px 16px",
          borderRadius: 14,
          color: theme.colors.cream,
          background: "rgba(18,20,47,0.90)",
          border: `1px solid ${theme.colors.panelEdge}`,
          boxShadow: "0 12px 34px rgba(0,0,0,0.28)",
          fontFamily: theme.bodyFamily,
          fontSize: 31,
          fontWeight: 650,
          lineHeight: 1.25,
          textAlign: "center",
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
}
