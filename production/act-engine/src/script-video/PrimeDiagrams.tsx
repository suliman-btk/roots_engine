import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../course/CourseContext";

export type DiagramProps = {
  items: string[];
  dark: boolean;
  title?: string;
  itemStartSeconds?: number[];
};

function usePalette(dark: boolean) {
  const theme = useTheme();
  return {
    bg: dark ? theme.colors.deep : theme.colors.surface,
    text: dark ? "#FFFFFF" : theme.colors.navy,
    muted: dark ? "rgba(255,255,255,0.66)" : theme.colors.inkDim,
    card: dark ? "rgba(255,255,255,0.10)" : "#FFFFFF",
    cardSoft: dark ? "rgba(255,255,255,0.055)" : theme.colors.plumSafe,
    border: dark ? "rgba(255,255,255,0.20)" : "rgba(2,1,129,0.14)",
    accent: theme.colors.gold,
    navy: theme.colors.navy,
  };
}

function appear(frame: number, index: number, gap = 5) {
  const p = interpolate(frame, [12 + index * gap, 27 + index * gap], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const e = 1 - Math.pow(1 - p, 3);
  return { opacity: e, transform: `translateY(${Math.round((1 - e) * 22)}px) scale(${0.96 + e * 0.04})` };
}

function activeIndex(frame: number, fps: number, count: number, starts?: number[]) {
  if (count <= 1) return 0;
  if (starts?.length) {
    const elapsed = frame / fps;
    return starts.reduce((latest, start, index) => elapsed >= start ? index : latest, -1);
  }
  return Math.min(count - 1, Math.max(0, Math.floor((frame - 24) / 38)));
}

function itemMotion(frame: number, fps: number, index: number, starts?: number[], gap = 5) {
  if (!starts?.length) return appear(frame, index, gap);
  const elapsed = frame / fps;
  const reached = elapsed >= starts[index];
  const progress = interpolate(elapsed, [starts[index] - 0.12, starts[index] + 0.28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return {
    opacity: reached ? 1 : 0.1 + progress * 0.15,
    transform: `translateY(${Math.round((1 - progress) * 18)}px) scale(${0.97 + progress * 0.03})`,
  };
}

export function ProcessFlow({ items, dark, itemStartSeconds }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const visible = items.slice(0, 5);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  return (
    <div style={{ display: "flex", alignItems: "stretch", justifyContent: "center", width: "100%", gap: 0, padding: "18px 0" }}>
      {visible.map((item, index) => {
        const reached = index <= active;
        const lineStart = itemStartSeconds?.[index] == null ? (24 + index * 38) / fps : itemStartSeconds[index];
        const line = interpolate(frame / fps, [lineStart, lineStart + 0.55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <React.Fragment key={item}>
            <div
              style={{
                ...itemMotion(frame, fps, index, itemStartSeconds),
                position: "relative",
                flex: 1,
                minWidth: 0,
                minHeight: 255,
                padding: "30px 22px 26px",
                borderRadius: 20,
                background: index === active ? colors.card : colors.cardSoft,
                border: `2px solid ${index === active ? colors.accent : colors.border}`,
                boxShadow: index === active ? `0 18px 44px ${dark ? "rgba(0,0,0,0.26)" : "rgba(2,1,129,0.12)"}` : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "center",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 7, background: index === active ? colors.accent : reached ? colors.navy : colors.border }} />
              <div style={{ alignSelf: "flex-start", color: index === active ? colors.accent : dark ? "rgba(255,255,255,0.76)" : colors.navy, fontWeight: 900, fontSize: 38, lineHeight: 1 }}>
                {String(index + 1).padStart(2, "0")}
              </div>
              <div style={{ color: colors.text, fontSize: 26, fontWeight: 750, lineHeight: 1.25, minHeight: 82, display: "flex", alignItems: "center", justifyContent: "center" }}>{item}</div>
              <div style={{ width: 46, height: 4, borderRadius: 3, background: index === active ? colors.accent : colors.border }} />
            </div>
            {index < visible.length - 1 ? (
              <div style={{ width: 54, height: 5, position: "relative", background: colors.border, flexShrink: 0, alignSelf: "center" }}>
                <div style={{ position: "absolute", inset: 0, right: "auto", width: `${line * 100}%`, background: colors.accent }} />
                <div style={{ position: "absolute", right: -2, top: -7, width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: `13px solid ${reached ? colors.accent : colors.border}` }} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function TimelineRoadmap({ items, dark, itemStartSeconds }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const visible = items.slice(0, 6);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const lineProgress = itemStartSeconds?.length
    ? Math.max(0, Math.min(1, (active + 1) / visible.length))
    : interpolate(frame, [18, 44 + visible.length * 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative", width: "100%", height: 480 }}>
      <div style={{ position: "absolute", left: "5%", right: "5%", top: 236, height: 6, borderRadius: 3, background: colors.border }}>
        <div style={{ height: "100%", width: `${lineProgress * 100}%`, borderRadius: 3, background: colors.accent }} />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${visible.length}, 1fr)`, gap: 18 }}>
        {visible.map((item, index) => {
          const top = index % 2 === 0;
          return (
            <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 10), position: "relative" }}>
              <div style={{ position: "absolute", left: "50%", top: 216, transform: "translateX(-50%)", width: index === active ? 36 : 26, height: index === active ? 36 : 26, borderRadius: "50%", background: index <= active ? colors.accent : colors.card, border: `5px solid ${colors.navy}`, boxShadow: index === active ? `0 0 0 10px ${dark ? "rgba(205,172,59,0.16)" : "rgba(2,1,129,0.08)"}` : "none" }} />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  ...(top ? { top: 36 } : { bottom: 20 }),
                  minHeight: 142,
                  padding: "20px 18px",
                  borderRadius: 20,
                  background: index === active ? colors.card : colors.cardSoft,
                  border: `2px solid ${index === active ? colors.accent : colors.border}`,
                  color: colors.text,
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.28,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrbitCycle({ items, dark, title, itemStartSeconds }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const visible = items.slice(0, 6);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const rotation = Math.sin(frame / (fps * 1.7)) * 2.2;
  const radiusX = 560;
  const radiusY = 220;
  return (
    <div style={{ position: "relative", width: "100%", height: 530 }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 1120, height: 440, transform: `translate(-50%, -50%) rotate(${rotation}deg)`, borderRadius: "50%", border: `3px dashed ${colors.border}` }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 230, height: 230, transform: "translate(-50%, -50%)", borderRadius: "50%", background: colors.navy, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 28, fontSize: 29, fontWeight: 800, lineHeight: 1.15, boxShadow: `0 0 0 18px ${dark ? "rgba(255,255,255,0.07)" : "rgba(2,1,129,0.07)"}` }}>
        {title ?? "Cycle"}
      </div>
      {visible.map((item, index) => {
        const angle = (Math.PI * 2 * index) / visible.length - Math.PI / 2;
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;
        const motion = itemMotion(frame, fps, index, itemStartSeconds, 6);
        return (
          <div
            key={item}
            style={{
              opacity: motion.opacity,
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              width: 270,
              minHeight: 94,
              transform: `translate(-50%, -50%) ${motion.transform} scale(${index === active ? 1.06 : 1})`,
              padding: "17px 20px",
              borderRadius: 22,
              background: index === active ? colors.card : colors.cardSoft,
              border: `2px solid ${index === active ? colors.accent : colors.border}`,
              color: colors.text,
              fontSize: 21,
              lineHeight: 1.25,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              boxShadow: index === active ? "0 16px 40px rgba(0,0,0,0.16)" : "none",
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

export function ComparisonPanel({ items, dark, itemStartSeconds }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const visible = items.slice(0, 4);
  const midpoint = Math.ceil(visible.length / 2);
  const left = visible.slice(0, midpoint);
  const right = visible.slice(midpoint);
  const pulse = 1 + Math.sin(frame / 11) * 0.035;
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const column = (entries: string[], offset: number, accent: boolean) => (
    <div style={{ flex: 1, display: "grid", gridTemplateRows: `repeat(${entries.length}, 1fr)`, gap: 20 }}>
      {entries.map((item, index) => (
        <div key={item} style={{ ...itemMotion(frame, fps, index + offset, itemStartSeconds), position: "relative", minHeight: 170, padding: "30px 34px 28px", borderRadius: 20, background: accent ? colors.navy : colors.card, border: `2px solid ${index + offset === active ? colors.accent : accent ? colors.navy : colors.border}`, boxShadow: index + offset === active ? "0 18px 44px rgba(0,0,0,0.16)" : "none", color: accent ? "#FFFFFF" : colors.text, fontSize: 29, fontWeight: 750, lineHeight: 1.25, display: "flex", alignItems: "center", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "0 0 auto", height: 7, background: index + offset === active ? colors.accent : accent ? "rgba(255,255,255,0.26)" : colors.navy }} />
          <div style={{ marginRight: 22, color: index + offset === active ? colors.accent : accent ? "rgba(255,255,255,0.64)" : colors.navy, fontSize: 34, fontWeight: 900 }}>{String(index + offset + 1).padStart(2, "0")}</div>
          <div>{item}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 30, width: "100%", minHeight: 380, padding: "12px 0" }}>
      {column(left, 0, false)}
      <div style={{ alignSelf: "center", width: 94, height: 94, borderRadius: "50%", background: colors.accent, color: colors.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 25, transform: `scale(${pulse})`, boxShadow: "0 14px 36px rgba(0,0,0,0.16)", flexShrink: 0 }}>
        VS
      </div>
      {column(right, midpoint, true)}
    </div>
  );
}

export function CardConstellation({ items, dark, itemStartSeconds }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const visible = items.slice(0, 6);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const columns = visible.length === 4 ? 2 : Math.min(3, visible.length);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 22, width: "100%", maxWidth: columns === 2 ? 1280 : 1660, margin: "0 auto", padding: "14px 0" }}>
      {visible.map((item, index) => {
        const hot = index === active;
        const reached = index <= active;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds), position: "relative", minHeight: visible.length <= 3 ? 260 : 205, padding: "32px 34px 28px", borderRadius: 20, background: hot ? colors.card : colors.cardSoft, border: `2px solid ${hot ? colors.accent : colors.border}`, boxShadow: hot ? "0 20px 50px rgba(2,1,129,0.16)" : "none", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 7, background: hot ? colors.accent : reached ? colors.navy : colors.border }} />
            <div style={{ color: hot ? colors.accent : dark ? "rgba(255,255,255,0.70)" : colors.navy, fontSize: 38, fontWeight: 900, lineHeight: 1 }}>{String(index + 1).padStart(2, "0")}</div>
            <div style={{ color: colors.text, fontSize: visible.length <= 3 ? 34 : 30, fontWeight: 750, lineHeight: 1.25, maxWidth: "94%" }}>{item}</div>
            <div style={{ width: hot ? 92 : 48, height: 4, borderRadius: 3, background: hot ? colors.accent : colors.border }} />
          </div>
        );
      })}
    </div>
  );
}

export function Staircase({ items, dark, itemStartSeconds }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const visible = items.slice(0, 5);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  return (
    <div style={{ width: "100%", height: 500, display: "flex", alignItems: "flex-end", gap: 14, padding: "0 40px" }}>
      {visible.map((item, index) => {
        const height = 170 + index * 58;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 5), flex: 1, height, padding: "22px", borderRadius: "24px 24px 8px 8px", background: index === active ? colors.navy : colors.cardSoft, border: `2px solid ${index === active ? colors.accent : colors.border}`, color: index === active ? "#FFFFFF" : colors.text, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: index === active ? "0 18px 42px rgba(0,0,0,0.18)" : "none" }}>
            <div style={{ color: index === active ? colors.accent : colors.navy, fontSize: 21, fontWeight: 900 }}>0{index + 1}</div>
            <div style={{ fontSize: 22, lineHeight: 1.25, fontWeight: 700 }}>{item}</div>
          </div>
        );
      })}
    </div>
  );
}
