import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTheme } from "../course/CourseContext";
import { BrandWatermark } from "../brand/BrandWatermark";

/**
 * Incoming-scene reveal. The new scene starts a little before the cut and is revealed
 * ON TOP of the previous scene (which keeps playing underneath), so the screen is never
 * covered or blank: one diagram hands over to the next. The style rotates per cut.
 * The NAMA logo lives inside the revealed layer, so it always matches the background
 * of the scene it sits on (colour on light, white on dark).
 */
export type RevealStyle = "wipe-right" | "iris" | "slide-up" | "diagonal" | "zoom-fade";
const ROTATION: RevealStyle[] = ["wipe-right", "slide-up", "iris", "diagonal", "zoom-fade"];

const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

export function SceneTransition({
  children,
  sceneIndex,
  revealFrames,
  logoOnDark,
}: {
  children: React.ReactNode;
  sceneIndex: number;
  /** Frames over which this scene is revealed over the previous one (0 = hard cut). */
  revealFrames: number;
  logoOnDark: boolean;
}) {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const gold = theme.colors.gold;
  const style = ROTATION[(sceneIndex - 1 + ROTATION.length) % ROTATION.length];
  const raw = sceneIndex > 0 && revealFrames > 0 ? Math.min(1, frame / revealFrames) : 1;
  const p = easeInOut(raw);
  const revealing = raw < 1;

  let layer: React.CSSProperties = {};
  let edge: React.ReactNode = null;
  if (revealing) {
    switch (style) {
      case "wipe-right":
        layer = { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
        edge = <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${p * 100}% - 5px)`, width: 10, background: gold, boxShadow: `0 0 30px ${gold}` }} />;
        break;
      case "slide-up":
        layer = { transform: `translateY(${(1 - p) * 100}%)`, boxShadow: "0 -30px 60px rgba(0,0,0,0.25)" };
        break;
      case "iris":
        layer = { clipPath: `circle(${p * 78}% at 50% 55%)` };
        break;
      case "diagonal":
        layer = { clipPath: `polygon(0 0, ${p * 135}% 0, ${p * 135 - 35}% 100%, 0 100%)` };
        break;
      case "zoom-fade":
      default:
        layer = { opacity: p, transform: `scale(${1.06 - p * 0.06})` };
        break;
    }
  }

  return (
    <AbsoluteFill>
      <AbsoluteFill style={layer}>
        {children}
        <BrandWatermark variant={logoOnDark ? "dark" : "light"} />
      </AbsoluteFill>
      {edge}
    </AbsoluteFill>
  );
}
