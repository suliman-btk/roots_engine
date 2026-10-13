import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../course/CourseContext";

export type DiagramProps = {
  items: string[];
  dark: boolean;
  title?: string;
  itemStartSeconds?: number[];
  leftCount?: number;
  leftLabel?: string;
  rightLabel?: string;
  joiner?: string;
};

export function usePalette(dark: boolean) {
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

/** Spring entrance with a slight 3D tilt — cards "land" instead of sliding linearly. */
function springMotion(frame: number, fps: number, startFrame: number) {
  const p = spring({ frame: frame - startFrame, fps, config: { damping: 13, mass: 0.75, stiffness: 120 } });
  const clamped = Math.min(1, p);
  return {
    opacity: clamped,
    transform: `perspective(1100px) translateY(${Math.round((1 - p) * 34)}px) rotateX(${((1 - p) * -24).toFixed(2)}deg) scale(${(0.92 + p * 0.08).toFixed(4)})`,
  };
}

function appear(frame: number, index: number, gap = 5, fps = 30) {
  return springMotion(frame, fps, 10 + index * gap);
}

export function activeIndex(frame: number, fps: number, count: number, starts?: number[]) {
  if (count <= 1) return 0;
  if (starts?.length) {
    // The active item is the one whose spoken moment was most recent (items may be
    // laid out in a different order than they are spoken, e.g. before/after columns).
    const elapsed = frame / fps;
    let best = -1;
    starts.forEach((start, index) => {
      if (elapsed >= start && (best < 0 || start >= starts[best])) best = index;
    });
    return best;
  }
  return Math.min(count - 1, Math.max(0, Math.floor((frame - 24) / 38)));
}

export function itemMotion(frame: number, fps: number, index: number, starts?: number[], gap = 5) {
  if (!starts?.length) return appear(frame, index, gap, fps);
  const startFrame = Math.round(starts[index] * fps) - 4;
  if (frame < startFrame) {
    // Ghost preview: the viewer sees the structure, the item lands when it is spoken.
    return { opacity: 0.34, transform: "perspective(1100px) translateY(10px) scale(0.97)", filter: "saturate(0.4)" };
  }
  const m = springMotion(frame, fps, startFrame);
  return { opacity: 0.34 + m.opacity * 0.66, transform: m.transform };
}

/** Soft light sweep across the card that is currently being spoken about. */
export function ActiveSheen({ active, dark }: { active: boolean; dark: boolean }) {
  const frame = useCurrentFrame();
  if (!active) return null;
  const x = ((frame % 96) / 96) * 260 - 80;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
        background: `linear-gradient(105deg, transparent ${x - 18}%, ${dark ? "rgba(255,255,255,0.10)" : "rgba(205,172,59,0.13)"} ${x}%, transparent ${x + 18}%)`,
      }}
    />
  );
}

/** Round numbered badge used on every card type. */
export function NumberBadge({ n, hot, onDark, size = 62 }: { n: number; hot: boolean; onDark: boolean; size?: number }) {
  const theme = useTheme();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 900,
        background: hot ? theme.colors.gold : onDark ? "rgba(255,255,255,0.12)" : "rgba(2,1,129,0.08)",
        color: hot ? theme.colors.navy : onDark ? "#FFFFFF" : theme.colors.navy,
        boxShadow: hot ? "0 8px 22px rgba(205,172,59,0.35)" : "none",
      }}
    >
      {String(n).padStart(2, "0")}
    </div>
  );
}

export function ProcessFlow({ items, dark, itemStartSeconds }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const theme = useTheme();
  const visible = items.slice(0, 5);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const notch = 46;
  return (
    <div style={{ display: "flex", width: "100%", padding: "30px 0" }}>
      {visible.map((item, index) => {
        const hot = index === active;
        const reached = index <= active;
        const first = index === 0;
        const clip = first
          ? `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%)`
          : `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%, ${notch}px 50%)`;
        const bg = hot
          ? `linear-gradient(135deg, ${theme.colors.gold}, ${theme.colors.goldLight})`
          : reached
            ? `linear-gradient(135deg, ${theme.colors.mid}, ${theme.colors.navy})`
            : dark ? "rgba(255,255,255,0.10)" : "#E9E9F6";
        const ink = hot ? theme.colors.navy : reached ? "#FFFFFF" : colors.text;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds), flex: 1, minWidth: 0, marginLeft: first ? 0 : -18, filter: hot ? "drop-shadow(0 18px 30px rgba(205,172,59,0.35))" : "drop-shadow(0 8px 16px rgba(2,1,129,0.10))", zIndex: hot ? 2 : 1 }}>
            <div style={{ position: "relative", height: hot ? 330 : 300, marginTop: hot ? 0 : 15, clipPath: clip, background: bg, padding: `0 ${notch + 18}px 0 ${first ? 34 : notch + 22}px`, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, overflow: "hidden" }}>
              <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: hot ? "rgba(2,1,129,0.35)" : reached ? "rgba(255,255,255,0.30)" : dark ? "rgba(255,255,255,0.25)" : "rgba(2,1,129,0.18)" }}>{String(index + 1).padStart(2, "0")}</div>
              <div style={{ color: ink, fontSize: visible.length > 4 ? 28 : 32, fontWeight: 850, lineHeight: 1.2 }}>{item}</div>
            </div>
          </div>
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
                  fontSize: 26,
                  fontWeight: 750,
                  lineHeight: 1.25,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item}
                <div style={{ position: "absolute", left: "50%", ...(top ? { bottom: -13 } : { top: -13 }), width: 24, height: 24, transform: "translateX(-50%) rotate(45deg)", background: index === active ? colors.card : colors.cardSoft, borderRight: top ? `2px solid ${index === active ? colors.accent : colors.border}` : "none", borderBottom: top ? `2px solid ${index === active ? colors.accent : colors.border}` : "none", borderLeft: top ? "none" : `2px solid ${index === active ? colors.accent : colors.border}`, borderTop: top ? "none" : `2px solid ${index === active ? colors.accent : colors.border}` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrbitCycle({ items, dark, itemStartSeconds }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const theme = useTheme();
  const visible = items.slice(0, 6);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const spin = frame * 0.12;
  const radiusX = 600;
  const radiusY = 245;
  const node = visible.length > 4 ? 176 : 200;
  return (
    <div style={{ position: "relative", width: "100%", height: 700 }}>
      <svg width={1240} height={520} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", overflow: "visible" }}>
        <ellipse cx={620} cy={260} rx={radiusX} ry={radiusY} fill="none" stroke={colors.border} strokeWidth={3} strokeDasharray="10 12" strokeDashoffset={-spin * 4} />
      </svg>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 170, height: 170, transform: `translate(-50%, -50%) rotate(${spin}deg)`, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, ${theme.colors.mid}, ${theme.colors.navy})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 16px ${dark ? "rgba(255,255,255,0.07)" : "rgba(2,1,129,0.07)"}, 0 20px 44px rgba(0,0,0,0.20)` }}>
        {/* circular-arrows icon: the hub says "cycle" without repeating the title */}
        <svg width={92} height={92} viewBox="0 0 100 100">
          <path d="M50 14 A36 36 0 0 1 86 50" fill="none" stroke={theme.colors.gold} strokeWidth={9} strokeLinecap="round" />
          <path d="M50 86 A36 36 0 0 1 14 50" fill="none" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" />
          <polygon points="86,62 96,44 76,44" fill={theme.colors.gold} />
          <polygon points="14,38 4,56 24,56" fill="#FFFFFF" />
        </svg>
      </div>
      {visible.map((item, index) => {
        const angle = (Math.PI * 2 * index) / visible.length - Math.PI / 2;
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;
        const motion = itemMotion(frame, fps, index, itemStartSeconds, 6);
        const hot = index === active;
        const reached = index <= active;
        return (
          <div key={item} style={{ opacity: motion.opacity, position: "absolute", left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, width: node, height: node, transform: `translate(-50%, -50%) ${motion.transform} scale(${hot ? 1.1 : 1})`, borderRadius: "50%", background: hot ? `linear-gradient(145deg, ${theme.colors.goldLight}, ${theme.colors.gold})` : reached ? (dark ? "#FFFFFF" : "#FFFFFF") : colors.cardSoft, border: `${hot ? 0 : 3}px solid ${reached ? theme.colors.navy : colors.border}`, boxShadow: hot ? "0 0 0 12px rgba(205,172,59,0.22), 0 20px 40px rgba(0,0,0,0.18)" : "0 8px 20px rgba(2,1,129,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 26, gap: 6 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: hot ? theme.colors.navy : theme.colors.gold, letterSpacing: 2 }}>{String(index + 1).padStart(2, "0")}</div>
            <div style={{ color: hot || reached ? theme.colors.navy : colors.text, fontSize: 24, lineHeight: 1.15, fontWeight: 850 }}>{item}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ComparisonPanel({ items, dark, itemStartSeconds, leftCount, leftLabel, rightLabel, joiner }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const visible = items.slice(0, 6);
  const midpoint = leftCount ?? Math.ceil(visible.length / 2);
  const left = visible.slice(0, midpoint);
  const right = visible.slice(midpoint);
  const pulse = 1 + Math.sin(frame / 11) * 0.035;
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const tall = Math.max(midpoint, visible.length - midpoint) > 2;
  const column = (entries: string[], offset: number, strong: boolean, label?: string) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: tall ? 16 : 22 }}>
      {label ? <div style={{ color: strong ? colors.accent : colors.muted, fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", paddingLeft: 26 }}>{label}</div> : null}
      {entries.map((item, index) => {
        const i = index + offset;
        const hot = i === active;
        const bg = strong ? (dark ? "#FFFFFF" : colors.navy) : colors.card;
        const ink = strong ? (dark ? colors.navy : "#FFFFFF") : colors.text;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, i, itemStartSeconds), position: "relative", minHeight: tall ? 104 : 150, padding: "22px 44px 22px 26px", borderRadius: 999, background: bg, border: `${hot ? 3 : 2}px solid ${hot ? colors.accent : strong ? "transparent" : colors.border}`, boxShadow: hot ? "0 24px 56px rgba(0,0,0,0.20)" : "0 6px 18px rgba(2,1,129,0.05)", color: ink, fontSize: tall ? 29 : 34, fontWeight: 800, lineHeight: 1.22, display: "flex", alignItems: "center", gap: 26, overflow: "hidden" }}>
            <ActiveSheen active={hot} dark={strong ? !dark : dark} />
            <NumberBadge n={i + 1} hot={hot} onDark={strong ? !dark : dark} />
            <div>{item}</div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 34, width: "100%", minHeight: 440, padding: "12px 0" }}>
      {column(left, 0, false, leftLabel)}
      <div style={{ alignSelf: "center", width: 108, height: 108, borderRadius: "50%", background: colors.accent, color: colors.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: (joiner ?? "VS").length > 2 ? 22 : 34, transform: `scale(${pulse})`, boxShadow: `0 0 0 12px ${dark ? "rgba(205,172,59,0.14)" : "rgba(205,172,59,0.18)"}, 0 16px 40px rgba(0,0,0,0.18)`, flexShrink: 0 }}>
        {joiner ?? "VS"}
      </div>
      {column(right, midpoint, true, rightLabel)}
    </div>
  );
}

export function CardConstellation({ items, dark, itemStartSeconds }: DiagramProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePalette(dark);
  const theme = useTheme();
  const visible = items.slice(0, 6);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const columns = visible.length === 4 ? 2 : Math.min(3, visible.length);
  const few = visible.length <= 3;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, columnGap: 36, rowGap: 30, width: "100%", maxWidth: columns === 2 ? 1380 : 1700, margin: "0 auto", paddingBottom: 30 }}>
      {visible.map((item, index) => {
        const hot = index === active;
        const reached = index <= active;
        const body = hot
          ? `linear-gradient(150deg, ${theme.colors.mid}, ${theme.colors.navy})`
          : dark ? "rgba(255,255,255,0.09)" : "#FFFFFF";
        const ink = hot ? "#FFFFFF" : colors.text;
        const lift = index % 2 === 1 ? 30 : 0; // staggered columns
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds), position: "relative", marginTop: lift, paddingTop: 44 }}>
            {/* folder tab */}
            <div style={{ position: "absolute", left: 0, top: 0, height: 52, minWidth: 130, padding: "0 22px", borderRadius: "18px 18px 0 0", background: hot ? theme.colors.gold : reached ? theme.colors.navy : dark ? "rgba(255,255,255,0.16)" : "#E3E3F3", color: hot ? theme.colors.navy : reached ? "#FFFFFF" : colors.text, display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>
              {String(index + 1).padStart(2, "0")}
            </div>
            <div style={{ position: "relative", minHeight: few ? 300 : 190, padding: few ? "44px 40px" : "32px 34px", borderRadius: "0 26px 26px 26px", background: body, border: `2px solid ${hot ? theme.colors.gold : colors.border}`, boxShadow: hot ? "0 30px 60px rgba(2,1,129,0.28)" : "0 10px 24px rgba(2,1,129,0.06)", overflow: "hidden", display: "flex", alignItems: "center" }}>
              <ActiveSheen active={hot} dark />
              <div style={{ position: "absolute", right: -60, bottom: -60, width: 180, height: 180, borderRadius: "50%", border: `22px solid ${hot ? "rgba(205,172,59,0.30)" : dark ? "rgba(255,255,255,0.05)" : "rgba(2,1,129,0.05)"}` }} />
              <div style={{ position: "relative", color: ink, fontSize: few ? 42 : 34, fontWeight: 800, lineHeight: 1.2 }}>{item}</div>
            </div>
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
        const height = 200 + index * 62;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 5), flex: 1, height, padding: "22px", borderRadius: "24px 24px 8px 8px", background: index === active ? colors.navy : colors.cardSoft, border: `2px solid ${index === active ? colors.accent : colors.border}`, color: index === active ? "#FFFFFF" : colors.text, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: index === active ? "0 18px 42px rgba(0,0,0,0.18)" : "none" }}>
            <div style={{ color: index === active ? colors.accent : colors.navy, fontSize: 21, fontWeight: 900 }}>0{index + 1}</div>
            <div style={{ fontSize: 27, lineHeight: 1.22, fontWeight: 780 }}>{item}</div>
          </div>
        );
      })}
    </div>
  );
}
