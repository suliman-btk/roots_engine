import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ActiveSheen, NumberBadge, activeIndex, itemMotion, usePalette } from "./PrimeDiagrams";
import type { DiagramProps } from "./PrimeDiagrams";

export type ChartProps = DiagramProps & {
  values?: number[];
  unit?: string;
  center?: string;
};

/** Frame at which item `index` should start animating (spoken phrase or staggered). */
function startFrame(fps: number, index: number, starts?: number[], gap = 8) {
  return starts?.length ? Math.round(starts[index] * fps) - 4 : 14 + index * gap;
}

function grow(frame: number, fps: number, from: number) {
  return spring({ frame: frame - from, fps, config: { damping: 18, mass: 0.9, stiffness: 90 } });
}

function seriesColors(dark: boolean, navy: string, gold: string) {
  return dark
    ? ["#FFFFFF", gold, "#9C9CF0", "#E4C862", "#6C6CD8", "#C9C9F5"]
    : [navy, gold, "#4A4AB8", "#E4C862", "#8B8BD6", "#B08F28"];
}

/* 1 ─ Animated horizontal bar chart (count-up values when provided) */
export function BarChart({ items, dark, itemStartSeconds, values, unit }: ChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 6);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const max = values?.length ? Math.max(...values.slice(0, visible.length), 1) : 1;
  return (
    <div style={{ width: "100%", maxWidth: 1500, display: "flex", flexDirection: "column", gap: visible.length > 4 ? 18 : 28 }}>
      {visible.map((item, index) => {
        const value = values?.[index];
        const target = value == null ? 1 : value / max;
        const g = grow(frame, fps, startFrame(fps, index, itemStartSeconds));
        const width = Math.max(0, Math.min(1.02, g)) * target;
        const hot = index === active;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 8), display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ width: 400, flexShrink: 0, textAlign: "right", color: c.text, fontSize: 27, fontWeight: 750, lineHeight: 1.2 }}>{item}</div>
            <div style={{ position: "relative", flex: 1, height: 64, borderRadius: 16, background: c.cardSoft, border: `2px solid ${hot ? c.accent : c.border}`, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${width * 100}%`, borderRadius: 14, background: hot ? `linear-gradient(90deg, ${c.navy}, ${c.accent})` : dark ? "rgba(255,255,255,0.55)" : c.navy }} />
              <ActiveSheen active={hot} dark={dark} />
            </div>
            <div style={{ width: 120, flexShrink: 0, color: hot ? c.accent : c.muted, fontSize: 34, fontWeight: 900 }}>
              {value == null ? String(index + 1).padStart(2, "0") : `${Math.round(Math.min(1, g) * value)}${unit ?? ""}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* 2 ─ Donut chart: segments draw in one by one, legend on the right */
export function DonutChart({ items, dark, itemStartSeconds, values, unit, center, title }: ChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 6);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const vals = visible.map((_, i) => values?.[i] ?? 1);
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  const colors = seriesColors(dark, c.navy, c.accent);
  const r = 170;
  const circ = 2 * Math.PI * r;
  const gap = visible.length > 1 ? 6 : 0;
  let offset = 0;
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 90 }}>
      <div style={{ position: "relative", width: 460, height: 460, flexShrink: 0 }}>
        <svg width={460} height={460} viewBox="0 0 460 460" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={230} cy={230} r={r} fill="none" stroke={c.cardSoft} strokeWidth={58} />
          {visible.map((item, index) => {
            const len = (vals[index] / total) * circ;
            const g = Math.min(1, grow(frame, fps, startFrame(fps, index, itemStartSeconds, 10)));
            const seg = Math.max(0, len - gap) * g;
            const el = (
              <circle
                key={item}
                cx={230}
                cy={230}
                r={r}
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth={index === active ? 74 : 58}
                strokeDasharray={`${seg} ${circ}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 120 }}>
          {values?.length && active >= 0 ? (
            <div style={{ color: c.accent, fontSize: 58, fontWeight: 900, lineHeight: 1 }}>{`${values[active]}${unit ?? ""}`}</div>
          ) : null}
          <div style={{ color: c.text, fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginTop: 8 }}>{center ?? (active >= 0 ? visible[active] : title)}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 520 }}>
        {visible.map((item, index) => (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 10), position: "relative", display: "flex", alignItems: "center", gap: 20, padding: "16px 22px", borderRadius: 16, background: index === active ? c.card : "transparent", border: `2px solid ${index === active ? c.accent : "transparent"}`, overflow: "hidden" }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: colors[index % colors.length], flexShrink: 0, border: dark ? "none" : `1px solid ${c.border}` }} />
            <div style={{ color: c.text, fontSize: 27, fontWeight: 720, lineHeight: 1.25 }}>{item}</div>
            <ActiveSheen active={index === active} dark={dark} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* 3 ─ Pyramid: builds from the foundation (first item) up to a true peak (last item) */
export function Pyramid({ items, dark, itemStartSeconds }: ChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 5);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const H = 540;
  const baseW = 1500;
  const GAP = 7;
  // Straight pyramid faces: width grows linearly with depth from the apex.
  // The peak layer is taller so its label has room inside the triangle.
  const peakH = n > 1 ? H * 0.3 : H;
  const restH = n > 1 ? (H - peakH) / (n - 1) : 0;
  const widthAt = (depth: number) => (baseW * depth) / H;
  return (
    <div style={{ position: "relative", width: baseW, height: H + (n - 1) * GAP }}>
      {visible.map((item, index) => {
        const level = n - 1 - index; // 0 = peak
        const dTop = level === 0 ? 0 : peakH + (level - 1) * restH;
        const dBot = level === 0 ? peakH : dTop + restH;
        const wTop = widthAt(dTop);
        const wBot = widthAt(dBot);
        const inset = ((wBot - wTop) / 2 / wBot) * 100;
        const from = startFrame(fps, index, itemStartSeconds, 9);
        const raw = grow(frame, fps, from);
        const g = Math.min(1, raw);
        const hot = index === active;
        const reached = !itemStartSeconds?.length || frame >= from;
        const peak = level === 0;
        return (
          <div
            key={item}
            style={{
              position: "absolute",
              left: (baseW - wBot) / 2,
              width: wBot,
              top: dTop + level * GAP,
              height: dBot - dTop,
              opacity: reached ? g : 0.3,
              transform: `translateY(${reached ? (1 - raw) * 50 : 0}px)`,
              clipPath: peak ? "polygon(50% 0, 100% 100%, 0 100%)" : `polygon(${inset}% 0, ${100 - inset}% 0, 100% 100%, 0 100%)`,
              background: hot
                ? `linear-gradient(90deg, ${c.accent}, #E4C862)`
                : reached
                  ? (dark ? `rgba(255,255,255,${0.12 + level * 0.03})` : level % 2 ? c.navy : "#25258F")
                  : c.cardSoft,
              display: "flex",
              alignItems: peak ? "flex-end" : "center",
              justifyContent: "center",
              paddingBottom: peak ? 22 : 0,
              color: hot ? c.navy : reached ? "#FFFFFF" : c.text,
              fontSize: peak ? 24 : 26,
              fontWeight: 850,
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}

/* 4 ─ Venn: 2–3 overlapping circles; the overlap holds the shared idea */
export function Venn({ items, dark, itemStartSeconds, center }: ChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 3);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const R = n === 3 ? 215 : 250;
  const positions = n === 3
    ? [{ x: -150, y: -85 }, { x: 150, y: -85 }, { x: 0, y: 165 }]
    : [{ x: -170, y: 0 }, { x: 170, y: 0 }];
  const fills = dark ? ["rgba(255,255,255,0.16)", "rgba(205,172,59,0.30)", "rgba(156,156,240,0.28)"] : ["rgba(2,1,129,0.13)", "rgba(205,172,59,0.26)", "rgba(74,74,184,0.16)"];
  const centerFrom = startFrame(fps, n - 1, itemStartSeconds, 12) + 6;
  const centerP = n > 0 && frame >= centerFrom ? Math.min(1, grow(frame, fps, centerFrom)) : 0;
  return (
    <div style={{ position: "relative", width: 1000, height: n === 3 ? 640 : 520 }}>
      {visible.map((item, index) => {
        const p = positions[index];
        const g = grow(frame, fps, startFrame(fps, index, itemStartSeconds, 12));
        const hot = index === active;
        const labelDir: { dx?: number; dy?: number } = n === 3 ? (index === 2 ? { dy: 95 } : { dy: -80, dx: index === 0 ? -70 : 70 }) : { dx: index === 0 ? -95 : 95, dy: 0 };
        return (
          <div
            key={item}
            style={{
              position: "absolute",
              left: `calc(50% + ${p.x}px)`,
              top: `calc(${n === 3 ? 45 : 50}% + ${p.y}px)`,
              width: R * 2,
              height: R * 2,
              transform: `translate(-50%, -50%) scale(${(0.6 + Math.min(1.04, g) * 0.4).toFixed(4)})`,
              opacity: itemStartSeconds?.length && frame < startFrame(fps, index, itemStartSeconds) ? 0.34 : Math.min(1, g),
              borderRadius: "50%",
              background: fills[index],
              border: `${hot ? 5 : 3}px solid ${hot ? c.accent : c.border}`,
              boxShadow: hot ? `0 0 0 14px ${dark ? "rgba(205,172,59,0.10)" : "rgba(205,172,59,0.12)"}` : "none",
            }}
          >
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 230, transform: `translate(calc(-50% + ${labelDir.dx ?? 0}px), calc(-50% + ${labelDir.dy ?? 0}px))`, textAlign: "center", color: c.text, fontSize: 27, fontWeight: 800, lineHeight: 1.2 }}>
              {item}
            </div>
          </div>
        );
      })}
      {center ? (
        <div style={{ position: "absolute", left: "50%", top: n === 3 ? "47%" : "50%", transform: `translate(-50%, -50%) scale(${centerP})`, padding: "12px 20px", borderRadius: 999, background: c.accent, color: c.navy, fontSize: 21, fontWeight: 900, whiteSpace: "nowrap", boxShadow: "0 10px 28px rgba(0,0,0,0.18)" }}>
          {center}
        </div>
      ) : null}
    </div>
  );
}

/* 5 ─ Mind map: a central idea with branches drawn out to each item */
export function MindMap({ items, dark, itemStartSeconds, title, center }: ChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 6);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const W = 1700;
  const H = 560;
  const cx = W / 2;
  const cy = H / 2;
  const leftCount = Math.ceil(visible.length / 2);
  const nodes = visible.map((item, index) => {
    const left = index < leftCount;
    const k = left ? index : index - leftCount;
    const count = left ? leftCount : visible.length - leftCount;
    const y = count === 1 ? cy : 70 + (k * (H - 140)) / (count - 1);
    const x = left ? 230 : W - 230;
    return { item, x, y, left };
  });
  const hub = Math.min(1, grow(frame, fps, 4));
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {nodes.map((node, index) => {
          const sx = cx + (node.left ? -150 : 150);
          const ex = node.x + (node.left ? 200 : -200);
          const mid = (sx + ex) / 2;
          const p = interpolate(frame, [startFrame(fps, index, itemStartSeconds, 9), startFrame(fps, index, itemStartSeconds, 9) + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <path
              key={node.item}
              d={`M ${sx} ${cy} C ${mid} ${cy}, ${mid} ${node.y}, ${ex} ${node.y}`}
              fill="none"
              stroke={index === active ? c.accent : c.border}
              strokeWidth={index === active ? 6 : 4}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - p}
            />
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: cx, top: cy, width: 300, minHeight: 150, transform: `translate(-50%, -50%) scale(${hub})`, borderRadius: 30, background: c.navy, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px 28px", fontSize: 30, fontWeight: 850, lineHeight: 1.15, boxShadow: `0 0 0 16px ${dark ? "rgba(255,255,255,0.07)" : "rgba(2,1,129,0.07)"}, 0 22px 50px rgba(0,0,0,0.20)` }}>
        {center ?? title}
      </div>
      {nodes.map((node, index) => {
        const hot = index === active;
        return (
          <div
            key={node.item}
            style={{
              ...itemMotion(frame, fps, index, itemStartSeconds, 9),
              position: "absolute",
              left: node.x - 200,
              top: node.y - 52,
              width: 400,
              minHeight: 96,
              padding: "16px 30px",
              borderRadius: 999,
              background: hot ? c.card : c.cardSoft,
              border: `2px solid ${hot ? c.accent : c.border}`,
              boxShadow: hot ? "0 16px 40px rgba(0,0,0,0.14)" : "none",
              display: "flex",
              alignItems: "center",
              gap: 16,
              overflow: "hidden",
              color: c.text,
              fontSize: 24,
              fontWeight: 750,
              lineHeight: 1.22,
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: hot ? c.accent : c.navy, flexShrink: 0, border: dark ? "2px solid rgba(255,255,255,0.6)" : "none" }} />
            <div>{node.item}</div>
            <ActiveSheen active={hot} dark={dark} />
          </div>
        );
      })}
    </div>
  );
}

export type MoreChartProps = ChartProps & { leftLabel?: string; rightLabel?: string };

function reachedAt(frame: number, fps: number, index: number, starts?: number[], gap = 9) {
  return frame >= startFrame(fps, index, starts, gap);
}

/* 6 ─ Target: outer rings lead inward to the goal (last item = bullseye) */
export function Target({ items, dark, itemStartSeconds }: MoreChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 5);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const RMAX = 310;
  const RCENTER = 118;
  const band = n > 1 ? (RMAX - RCENTER) / (n - 1) : RMAX;
  return (
    <div style={{ position: "relative", width: RMAX * 2 + 40, height: RMAX * 2 + 20 }}>
      {visible.map((item, index) => {
        const r = index === n - 1 ? RCENTER : RMAX - index * band; // index 0 = outermost
        const hot = index === active;
        const shown = !itemStartSeconds?.length || reachedAt(frame, fps, index, itemStartSeconds);
        const g = Math.min(1.03, grow(frame, fps, startFrame(fps, index, itemStartSeconds, 9)));
        const fill = hot
          ? c.accent
          : shown
            ? (index % 2 === 0 ? (dark ? "rgba(255,255,255,0.16)" : c.navy) : (dark ? "rgba(255,255,255,0.08)" : "#3A3AA6"))
            : c.cardSoft;
        const isCenter = index === n - 1;
        return (
          <div key={item} style={{ position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2, transform: `translate(-50%, -50%) scale(${(0.55 + g * 0.45).toFixed(4)})`, opacity: shown ? Math.min(1, g + 0.2) : 0.4, borderRadius: "50%", background: fill, border: `3px solid ${dark ? "rgba(255,255,255,0.25)" : "#FFFFFF"}`, boxShadow: hot ? "0 0 0 10px rgba(205,172,59,0.22)" : "none" }}>
            <div style={{ position: "absolute", left: "50%", top: isCenter ? "50%" : band / 2, transform: "translate(-50%, -50%)", width: isCenter ? r * 1.7 : r * 1.3, textAlign: "center", color: hot ? c.navy : shown ? "#FFFFFF" : c.text, fontSize: isCenter ? 25 : 21, fontWeight: 850, lineHeight: 1.1, whiteSpace: isCenter ? "normal" : "nowrap" }}>
              {item}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* 7 ─ Quadrant: four areas around one shared centre */
export function Quadrant({ items, dark, itemStartSeconds, center }: MoreChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 4);
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const hub = Math.min(1, grow(frame, fps, 6));
  const radii = ["26px 6px 6px 6px", "6px 26px 6px 6px", "6px 6px 6px 26px", "6px 6px 26px 6px"];
  return (
    <div style={{ position: "relative", width: 1380, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
      {visible.map((item, index) => {
        const hot = index === active;
        const fill = hot ? (dark ? "#FFFFFF" : c.navy) : c.card;
        const ink = hot ? (dark ? c.navy : "#FFFFFF") : c.text;
        const right = index % 2 === 1;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 8), position: "relative", minHeight: 210, borderRadius: radii[index], background: fill, border: `2px solid ${hot ? c.accent : c.border}`, boxShadow: hot ? "0 26px 60px rgba(2,1,129,0.22)" : "0 6px 18px rgba(2,1,129,0.05)", padding: right ? "34px 44px 34px 140px" : "34px 140px 34px 44px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, overflow: "hidden", textAlign: right ? "left" : "right", alignItems: right ? "flex-start" : "flex-end" }}>
            <ActiveSheen active={hot} dark={!dark} />
            <NumberBadge n={index + 1} hot={hot} onDark={dark && !hot} size={56} />
            <div style={{ color: ink, fontSize: 34, fontWeight: 800, lineHeight: 1.2 }}>{item}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 200, height: 200, transform: `translate(-50%, -50%) scale(${hub})`, borderRadius: "50%", background: c.accent, color: c.navy, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, fontSize: 25, fontWeight: 900, lineHeight: 1.12, boxShadow: `0 0 0 14px ${dark ? c.bg : "#F7F7FB"}, 0 20px 44px rgba(0,0,0,0.20)` }}>
        {center ?? ""}
      </div>
    </div>
  );
}

/* 8 ─ Roadmap path: a winding road that draws itself to each milestone */
export function RoadmapPath({ items, dark, itemStartSeconds }: MoreChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 6);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const clipId = `road-${React.useId().replace(/:/g, "")}`;
  const W = 1700;
  const H = 540;
  const xs = visible.map((_, i) => (n === 1 ? W / 2 : 170 + (i * (W - 340)) / (n - 1)));
  const yAt = (x: number) => H / 2 + Math.sin(((x - xs[0]) / Math.max(1, xs[n - 1] - xs[0])) * Math.PI * 2) * 62;
  const pts: string[] = [];
  for (let x = xs[0] - 50; x <= xs[n - 1] + 50; x += 10) pts.push(`${x},${yAt(x).toFixed(1)}`);
  const targetX = active < 0 ? 40 : xs[active];
  const prevX = active <= 0 ? 40 : xs[active - 1];
  const t = active < 0 ? 0 : Math.min(1, grow(frame, fps, startFrame(fps, active, itemStartSeconds, 18)));
  const revealX = itemStartSeconds?.length ? prevX + (targetX - prevX) * t + 20 : interpolate(frame, [10, 10 + n * 18], [40, W], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id={clipId}><rect x={0} y={0} width={revealX} height={H} /></clipPath>
        </defs>
        <polyline points={pts.join(" ")} fill="none" stroke={c.cardSoft} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pts.join(" ")} fill="none" stroke={c.border} strokeWidth={3} strokeDasharray="14 14" />
        <g clipPath={`url(#${clipId})`}>
          <polyline points={pts.join(" ")} fill="none" stroke={dark ? "rgba(255,255,255,0.85)" : c.navy} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={pts.join(" ")} fill="none" stroke={c.accent} strokeWidth={4} strokeDasharray="14 14" />
        </g>
      </svg>
      {visible.map((item, index) => {
        const x = xs[index];
        const y = yAt(x);
        const hot = index === active;
        const above = index % 2 === 0; // alternate above / below, always clear of the road
        return (
          <React.Fragment key={item}>
            <div style={{ position: "absolute", left: x, top: y, width: hot ? 58 : 46, height: hot ? 58 : 46, transform: "translate(-50%, -50%)", borderRadius: "50%", background: hot ? c.accent : index <= active ? c.navy : c.card, border: `4px solid ${dark ? "#FFFFFF" : "#FFFFFF"}`, boxShadow: hot ? "0 0 0 10px rgba(205,172,59,0.25)" : "0 6px 14px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: hot ? c.navy : index <= active ? "#FFFFFF" : c.text, fontWeight: 900, fontSize: 18 }}>
              {index + 1}
            </div>
            <div style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 18), position: "absolute", left: x - 145, top: above ? y - 200 : y + 66, width: 290, minHeight: 104, padding: "16px 20px", borderRadius: 18, background: hot ? (dark ? "#FFFFFF" : c.navy) : c.card, border: `2px solid ${hot ? c.accent : c.border}`, boxShadow: hot ? "0 18px 40px rgba(2,1,129,0.20)" : "none", color: hot ? (dark ? c.navy : "#FFFFFF") : c.text, fontSize: 24, fontWeight: 800, lineHeight: 1.2, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <ActiveSheen active={hot} dark={!dark} />
              {item}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* 9 ─ Layer stack: 3D plates drop onto each other (first item = base layer) */
export function LayerStack({ items, dark, itemStartSeconds }: MoreChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 5);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const W = 1500;
  const H = 560;
  const cx = 420;
  const w = 300;
  const h = 78;
  const thick = 24;
  const gap = Math.min(110, (H - 2 * h - thick - 40) / Math.max(1, n - 1));
  const baseY = H - h - thick - 20;
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {visible.map((item, index) => {
          const shown = !itemStartSeconds?.length || reachedAt(frame, fps, index, itemStartSeconds);
          const g = grow(frame, fps, startFrame(fps, index, itemStartSeconds, 9));
          const drop = shown ? (1 - Math.min(1, g)) * -90 : -30;
          const cy = baseY - index * gap + drop;
          const hot = index === active;
          const top = hot ? c.accent : shown ? (dark ? "rgba(255,255,255,0.30)" : index % 2 === 0 ? c.navy : "#3A3AA6") : (dark ? "rgba(255,255,255,0.06)" : "#E6E6F4");
          const side = hot ? "#A88A26" : shown ? (dark ? "rgba(255,255,255,0.16)" : "#01005F") : (dark ? "rgba(255,255,255,0.04)" : "#D5D5EA");
          const op = shown ? Math.min(1, g + 0.15) : 0.5;
          return (
            <g key={item} opacity={op}>
              <polygon points={`${cx - w},${cy} ${cx},${cy + h} ${cx},${cy + h + thick} ${cx - w},${cy + thick}`} fill={side} />
              <polygon points={`${cx + w},${cy} ${cx},${cy + h} ${cx},${cy + h + thick} ${cx + w},${cy + thick}`} fill={side} opacity={0.8} />
              <polygon points={`${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`} fill={top} stroke={dark ? "rgba(255,255,255,0.35)" : "#FFFFFF"} strokeWidth={2} />
              <line x1={cx + w} y1={cy} x2={cx + w + 90} y2={cy} stroke={hot ? c.accent : c.border} strokeWidth={3} strokeDasharray={hot ? undefined : "6 6"} />
            </g>
          );
        })}
      </svg>
      {visible.map((item, index) => {
        const hot = index === active;
        const cy = baseY - index * gap;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 9), position: "absolute", left: cx + w + 100, top: cy - 40, width: 640, minHeight: 80, padding: "14px 24px", borderRadius: 16, background: hot ? (dark ? "#FFFFFF" : c.navy) : c.card, border: `2px solid ${hot ? c.accent : c.border}`, color: hot ? (dark ? c.navy : "#FFFFFF") : c.text, fontSize: 27, fontWeight: 800, lineHeight: 1.2, display: "flex", alignItems: "center", gap: 18, overflow: "hidden" }}>
            <ActiveSheen active={hot} dark={!dark} />
            <NumberBadge n={index + 1} hot={hot} onDark={dark && !hot} size={46} />
            {item}
          </div>
        );
      })}
    </div>
  );
}

/* 10 ─ Before / after: "Avoid" items are struck through as their "Aim for" pair is spoken */
export function BeforeAfter({ items, dark, itemStartSeconds, leftLabel, rightLabel, leftCount }: MoreChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 6);
  const half = leftCount ?? Math.ceil(visible.length / 2);
  const left = visible.slice(0, half);
  const right = visible.slice(half);
  const tall = Math.max(left.length, right.length) > 2;
  const cardH = tall ? 96 : 130;
  const font = tall ? 28 : 33;
  const active = activeIndex(frame, fps, visible.length, itemStartSeconds);
  const divider = Math.min(1, grow(frame, fps, 4));
  const header = (text: string, strong: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, color: strong ? c.accent : c.muted, fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: strong ? c.accent : c.cardSoft, color: strong ? c.navy : c.muted, fontSize: 20, letterSpacing: 0 }}>{strong ? "✓" : "✕"}</div>
      {text}
    </div>
  );
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 1600, display: "flex", alignItems: "center", gap: 90 }}>
      <div style={{ flex: 1 }}>
        {header(leftLabel ?? "Avoid", false)}
        <div style={{ display: "flex", flexDirection: "column", gap: tall ? 14 : 18 }}>
          {left.map((item, index) => {
            // Struck through once it AND its "aim for" counterpart are both on screen.
            const pair = half + Math.min(index, right.length - 1);
            const strikeFrom = Math.max(startFrame(fps, index, itemStartSeconds, 9), startFrame(fps, pair, itemStartSeconds, 9)) + 10;
            const struck = frame >= strikeFrom;
            const strikeP = struck ? Math.min(1, grow(frame, fps, strikeFrom)) : 0;
            const hot = index === active;
            return (
              <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 9), position: "relative", minHeight: cardH, padding: "20px 30px", borderRadius: 20, background: c.cardSoft, border: `2px dashed ${hot ? c.accent : c.border}`, color: c.text, fontSize: font, fontWeight: 750, lineHeight: 1.2, display: "flex", alignItems: "center", opacity: struck ? 1 - strikeP * 0.45 : undefined }}>
                <span style={{ position: "relative" }}>
                  {item}
                  <span style={{ position: "absolute", left: -6, top: "54%", height: 4, borderRadius: 2, width: `calc(${strikeP} * (100% + 12px))`, background: c.accent }} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 6, borderRadius: 3, transform: `translateX(-50%) scaleY(${divider})`, transformOrigin: "top", background: c.accent }} />
      <div style={{ flex: 1 }}>
        {header(rightLabel ?? "Aim for", true)}
        <div style={{ display: "flex", flexDirection: "column", gap: tall ? 14 : 18 }}>
          {right.map((item, index) => {
            const i = half + index;
            const hot = i === active;
            return (
              <div key={item} style={{ ...itemMotion(frame, fps, i, itemStartSeconds, 9), position: "relative", minHeight: cardH, padding: "20px 30px", borderRadius: 20, background: hot ? c.accent : dark ? "#FFFFFF" : c.navy, border: `2px solid ${hot ? c.accent : "transparent"}`, boxShadow: hot ? "0 22px 50px rgba(0,0,0,0.20)" : "0 8px 20px rgba(2,1,129,0.10)", color: hot ? c.navy : dark ? c.navy : "#FFFFFF", fontSize: font, fontWeight: 850, lineHeight: 1.2, display: "flex", alignItems: "center", gap: 18, overflow: "hidden" }}>
                <ActiveSheen active={hot} dark />
                {item}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
