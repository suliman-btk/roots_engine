import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { useBrand } from "../course/CourseContext";

/**
 * The course brand mark, on screen for the WHOLE video.
 *
 * It used to be drawn inside SlideFrame, which put it underneath the presenter layer — so once
 * the presenter became a panel it was hidden behind the video, and during full-bleed stretches
 * there was no slide to draw it at all. It is therefore mounted at the top of the composition,
 * above both the slides and the presenter, and owns no layout of its own.
 *
 * White artwork with a soft drop shadow so it survives both the flat navy slides and bright
 * footage behind it.
 *
 * The logo filename is read from the course config (`brand.watermarkLogo`), so different
 * courses can use different logos without editing engine code.
 */
export function BrandWatermark({
  size = 138,
  opacity = 0.98,
  variant = "auto",
}: {
  size?: number;
  opacity?: number;
  variant?: "auto" | "light" | "dark";
}) {
  const brand = useBrand();
  const useColored = variant === "light";
  const logoFile = useColored ? brand.watermarkLogoColored ?? brand.watermarkLogo : brand.watermarkLogo;
  const wideCard = brand.watermarkStyle === "wide-card";
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      <div
        style={{
          position: "absolute",
          top: wideCard ? 24 : 34,
          right: wideCard ? 38 : 52,
          width: wideCard ? Math.max(size, 260) : size,
          opacity,
          padding: wideCard ? "10px 14px" : 0,
          borderRadius: wideCard ? 14 : 0,
          background: wideCard ? "rgba(255,255,255,0.96)" : "transparent",
          boxShadow: wideCard ? "0 8px 28px rgba(0,0,0,0.14)" : "none",
          filter: wideCard ? "none" : useColored ? "drop-shadow(0 2px 6px rgba(0,0,0,0.06))" : "drop-shadow(0 6px 20px rgba(0,0,0,0.65))",
        }}
      >
        <Img src={staticFile(`brand/${logoFile}`)} style={{ width: "100%", display: "block" }} />
      </div>
    </AbsoluteFill>
  );
}
