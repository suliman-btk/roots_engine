import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useBrand, useTheme } from "../course/CourseContext";
import {
  CardConstellation,
  ComparisonPanel,
  OrbitCycle,
  ProcessFlow,
  Staircase,
  TimelineRoadmap,
} from "./PrimeDiagrams";
import type { ScriptScene } from "./schema";

function enter(frame: number, delay = 0, duration = 14) {
  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eased = 1 - Math.pow(1 - progress, 3);
  return { opacity: eased, transform: `translateY(${Math.round((1 - eased) * 22)}px)` };
}

function AmbientMotion({ dark }: { dark: boolean }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const driftX = Math.sin(frame / 42) * 18;
  const driftY = Math.cos(frame / 51) * 14;
  const sweep = interpolate(frame, [0, 36], [-18, 118], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: `${sweep}%`, top: 0, bottom: 0, width: 8, transform: "skewX(-12deg)", background: dark ? "rgba(255,255,255,0.07)" : "rgba(2,1,129,0.05)" }} />
      <div style={{ position: "absolute", right: -120 + driftX, bottom: 70 + driftY, width: 390, height: 390, borderRadius: "50%", border: `42px solid ${dark ? "rgba(255,255,255,0.045)" : theme.colors.plumSafe}`, transform: `rotate(${frame * 0.08}deg)` }} />
      <div style={{ position: "absolute", right: 350 - driftX * 0.4, top: 115 + driftY * 0.5, width: 18, height: 18, borderRadius: "50%", background: theme.colors.gold, opacity: 0.7 + Math.sin(frame / 12) * 0.18 }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 124, height: 1, background: dark ? "rgba(255,255,255,0.06)" : "rgba(2,1,129,0.06)" }} />
    </div>
  );
}

function AnimatedHeadline({ text, dark, size = 64 }: { text: string; dark: boolean; size?: number }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  return (
    <div style={{ color: dark ? "#FFFFFF" : theme.colors.navy, fontFamily: theme.headingFamily, fontWeight: theme.headingWeight, fontSize: size, lineHeight: 1.15, maxWidth: 1450 }}>
      {text.split(" ").map((word, index) => (
        <span key={`${word}-${index}`} style={{ ...enter(frame, 5 + index * 1.7, 12), display: "inline-block", marginRight: "0.26em" }}>
          {word}
        </span>
      ))}
    </div>
  );
}

function CourseChrome({
  section,
  label,
  dark = false,
  labelOnDark = false,
}: {
  section: string;
  label: string;
  dark?: boolean;
  labelOnDark?: boolean;
}) {
  const theme = useTheme();
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 54,
          color: dark ? "#FFFFFF" : theme.colors.navy,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: 3.2,
          textTransform: "uppercase",
        }}
      >
        {section}
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 28,
          color: dark || labelOnDark ? "rgba(255,255,255,0.68)" : "rgba(1,0,95,0.48)",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: theme.colors.gold }} />
    </>
  );
}

function PrimeTitle({ title, section, label }: { title: string; section: string; label: string }) {
  const theme = useTheme();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const logoFile = brand.titleLogo ?? "prime-logo.png";
  const panelWidth = interpolate(frame, [0, 18], [0, 47], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: theme.colors.surface, fontFamily: theme.bodyFamily, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          right: "auto",
          width: `${panelWidth}%`,
          background: `linear-gradient(155deg, ${theme.colors.mid}, ${theme.colors.navy})`,
        }}
      />
      <div
        style={{
          ...enter(frame, 12, 18),
          position: "absolute",
          left: "4%",
          top: "50%",
          width: 650,
          transform: `${enter(frame, 12, 18).transform} translateY(-50%)`,
          background: "#FFFFFF",
          padding: "38px 44px 32px",
          borderRadius: 26,
          boxShadow: "0 26px 70px rgba(0,0,0,0.24)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Img src={staticFile(`brand/${logoFile}`)} style={{ width: "96%", height: 310, objectFit: "contain" }} />
      </div>
      <div style={{ position: "absolute", left: "52%", right: "7%", top: "46%", transform: "translateY(-50%)" }}>
        <div style={{ ...enter(frame, 24), color: theme.colors.gold, fontSize: 21, fontWeight: 800, letterSpacing: 3.4, textTransform: "uppercase", marginBottom: 18 }}>
          {section}
        </div>
        <div style={{ ...enter(frame, 30, 18), color: theme.colors.navy, fontFamily: theme.headingFamily, fontSize: 60, fontWeight: theme.headingWeight, lineHeight: 1.13 }}>
          {title}
        </div>
        <div style={{ width: interpolate(frame, [42, 62], [0, 150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), height: 6, borderRadius: 3, background: theme.colors.gold, marginTop: 28 }} />
      </div>
      <CourseChrome section="" label={label} labelOnDark />
    </AbsoluteFill>
  );
}

function LightStatement({ scene, label, dark }: { scene: ScriptScene; label: string; dark: boolean }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: dark ? theme.colors.deep : theme.colors.surface, fontFamily: theme.bodyFamily }}>
      <AmbientMotion dark={dark} />
      <div style={{ position: "absolute", left: 84, right: 230, top: 238 }}>
        <AnimatedHeadline text={scene.visual.title} dark={dark} size={68} />
        <div style={{ ...enter(frame, 22), marginTop: 42, display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 72, height: 6, borderRadius: 3, background: theme.colors.gold }} />
          <div style={{ color: dark ? "rgba(255,255,255,0.66)" : theme.colors.inkDim, fontSize: 24, lineHeight: 1.45 }}>A focused idea from this section</div>
        </div>
      </div>
      <CourseChrome section={scene.section} label={label} dark={dark} />
    </AbsoluteFill>
  );
}

function Checklist({ scene, label, dark }: { scene: ScriptScene; label: string; dark: boolean }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = scene.visual.items ?? [];
  const starts = scene.visual.itemStartSeconds;
  const elapsed = frame / fps;
  const active = starts
    ? starts.reduce((latest, start, index) => elapsed >= start ? index : latest, -1)
    : Math.min(items.length - 1, Math.max(0, Math.floor((frame - 24) / 38)));
  return (
    <AbsoluteFill style={{ background: dark ? theme.colors.deep : theme.colors.surface, fontFamily: theme.bodyFamily }}>
      <AmbientMotion dark={dark} />
      <div style={{ position: "absolute", left: 84, right: 120, top: 148, bottom: 132, display: "flex", flexDirection: "column" }}>
        <div style={{ ...enter(frame, 4), color: dark ? "#FFFFFF" : theme.colors.navy, fontFamily: theme.headingFamily, fontSize: 52, fontWeight: theme.headingWeight, marginBottom: 14 }}>
          {scene.visual.title}
        </div>
        <div style={{ width: 108, height: 6, borderRadius: 4, background: theme.colors.gold, marginBottom: 20 }} />
        <div style={{ flex: 1, display: "grid", alignContent: "center", gridTemplateColumns: items.length > 3 ? "1fr 1fr" : "1fr", gap: 20 }}>
          {items.map((item, index) => (
            <div
              key={item}
              style={{
                ...(starts
                  ? {
                      opacity: index <= active ? 1 : 0.12,
                      transform: `translateY(${index <= active ? 0 : 14}px) scale(${index === active ? 1.02 : 1})`,
                    }
                  : enter(frame, 14 + index * 7)),
                display: "flex",
                alignItems: "center",
                gap: 20,
                minHeight: 126,
                padding: "22px 28px",
                background: dark ? (index === active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)") : (index === active ? "#FFFFFF" : theme.colors.plumSafe),
                border: `2px solid ${index === active ? theme.colors.gold : dark ? "rgba(255,255,255,0.13)" : "rgba(2,1,129,0.06)"}`,
                borderRadius: 20,
                boxShadow: index === active ? "0 14px 34px rgba(2,1,129,0.10)" : "none",
              }}
            >
              <div style={{ color: index === active ? theme.colors.gold : dark ? "rgba(255,255,255,0.68)" : theme.colors.navy, fontWeight: 900, fontSize: 34, flexShrink: 0 }}>
                {String(index + 1).padStart(2, "0")}
              </div>
              <div style={{ color: dark ? "#FFFFFF" : theme.colors.deep, fontSize: 27, lineHeight: 1.32, fontWeight: 650 }}>{item}</div>
            </div>
          ))}
        </div>
      </div>
      <CourseChrome section={scene.section} label={label} dark={dark} />
    </AbsoluteFill>
  );
}

function BrandBeat({ scene, label, dark, closing = false }: { scene: ScriptScene; label: string; dark: boolean; closing?: boolean }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: dark ? `linear-gradient(145deg, ${theme.colors.navy}, ${theme.colors.deep})` : theme.colors.surface, fontFamily: theme.bodyFamily }}>
      <AmbientMotion dark={dark} />
      <div style={{ position: "absolute", left: 110, top: 190, right: 180 }}>
        <div style={{ ...enter(frame, 4), color: theme.colors.gold, fontSize: closing ? 22 : 116, fontWeight: 800, lineHeight: 1, marginBottom: 30 }}>
          {closing ? "KEY TAKEAWAY" : "?"}
        </div>
        <div style={{ ...enter(frame, 12, 18), color: dark ? "#FFFFFF" : theme.colors.navy, fontFamily: theme.headingFamily, fontWeight: theme.headingWeight, fontSize: closing ? 64 : 58, lineHeight: 1.18, maxWidth: 1450 }}>
          {scene.visual.title}
        </div>
        <div style={{ ...enter(frame, 30), width: 130, height: 6, borderRadius: 3, background: theme.colors.gold, marginTop: 38 }} />
      </div>
      <CourseChrome section={scene.section} label={label} dark={dark} />
    </AbsoluteFill>
  );
}

function DiagramScene({ scene, label, dark }: { scene: ScriptScene; label: string; dark: boolean }) {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const items = scene.visual.items ?? [];
  const common = { items, dark, title: scene.visual.title, itemStartSeconds: scene.visual.itemStartSeconds };
  const diagram = (() => {
    switch (scene.visual.kind) {
      case "process": return <ProcessFlow {...common} />;
      case "timeline": return <TimelineRoadmap {...common} />;
      case "cycle": return <OrbitCycle {...common} />;
      case "comparison": return <ComparisonPanel {...common} />;
      case "staircase": return <Staircase {...common} />;
      case "card-grid":
      default: return <CardConstellation {...common} />;
    }
  })();
  return (
    <AbsoluteFill style={{ background: dark ? theme.colors.deep : theme.colors.surface, fontFamily: theme.bodyFamily }}>
      <AmbientMotion dark={dark} />
      <div style={{ position: "absolute", left: 84, right: 100, top: 146, bottom: 132, display: "flex", flexDirection: "column" }}>
        <div style={{ ...enter(frame, 2), color: dark ? "#FFFFFF" : theme.colors.navy, fontFamily: theme.headingFamily, fontWeight: theme.headingWeight, fontSize: 50, lineHeight: 1.15, marginBottom: 14 }}>
          {scene.visual.title}
        </div>
        <div style={{ width: 110, height: 6, borderRadius: 4, background: theme.colors.gold }} />
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 18 }}>
          {diagram}
        </div>
      </div>
      <CourseChrome section={scene.section} label={label} dark={dark} />
    </AbsoluteFill>
  );
}

export function PrimeScriptScene({ scene, lessonLabel, sceneIndex }: { scene: ScriptScene; lessonLabel: string; sceneIndex: number }) {
  const dark = scene.background ? scene.background === "dark" : sceneIndex > 0 && sceneIndex % 2 === 0;
  const displaySection = scene.visual.kicker ?? scene.section;
  const displayScene = { ...scene, section: displaySection };
  switch (scene.visual.kind) {
    case "title":
      return <PrimeTitle title={scene.visual.title} section={displaySection} label={lessonLabel} />;
    case "checklist":
      return <Checklist scene={displayScene} label={lessonLabel} dark={dark} />;
    case "process":
    case "timeline":
    case "cycle":
    case "comparison":
    case "card-grid":
    case "staircase":
      return <DiagramScene scene={displayScene} label={lessonLabel} dark={dark} />;
    case "question":
      return <BrandBeat scene={displayScene} label={lessonLabel} dark={dark} />;
    case "outro":
      return <BrandBeat scene={displayScene} label={lessonLabel} dark={dark} closing />;
    case "statement":
    default:
      return <LightStatement scene={displayScene} label={lessonLabel} dark={dark} />;
  }
}
