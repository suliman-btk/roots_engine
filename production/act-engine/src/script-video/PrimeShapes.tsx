import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ActiveSheen, NumberBadge, activeIndex, itemMotion, usePalette } from "./PrimeDiagrams";
import type { MoreChartProps } from "./PrimeCharts";

/*
 * Purpose-driven designs. Each one answers a specific narration pattern:
 *   funnel         – narrowing many things down to one focus / result
 *   spectrum       – degrees on a continuum between two poles (not either/or)
 *   balance        – weighing / keeping two sides in balance
 *   decision-tree  – "if this, then that" choices driven by evidence
 *   iceberg        – what is visible vs. what lies beneath the surface
 *   stat-tiles     – memorable numbers that are spoken in the narration
 *   gears          – parts that drive each other (interdependence)
 *   definition     – a key term and what it means
 */

type P = MoreChartProps;

function startAt(fps: number, index: number, starts?: number[], gap = 9) {
  return starts?.length ? Math.round(starts[index] * fps) - 4 : 14 + index * gap;
}

function grow(frame: number, fps: number, from: number) {
  return spring({ frame: frame - from, fps, config: { damping: 18, mass: 0.9, stiffness: 90 } });
}

function shownAt(frame: number, fps: number, index: number, starts?: number[], gap = 9) {
  return frame >= startAt(fps, index, starts, gap);
}

/** "5|Domains" → ["5", "Domains"]; "Understood | Continue" → ["Understood", "Continue"]. */
function splitPair(text: string): [string, string] {
  const at = text.indexOf("|");
  return at < 0 ? [text.trim(), ""] : [text.slice(0, at).trim(), text.slice(at + 1).trim()];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* 11 ─ Funnel: many considerations narrow to one focus (last item = the narrow end) */
export function Funnel({ items, dark, itemStartSeconds, center }: P) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 5);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const W = 1500;
  const bandH = n > 4 ? 78 : 92;
  const gap = 10;
  const total = n * bandH + (n - 1) * gap;
  const topW = 1260;
  const botW = 470;
  const widthAt = (y: number) => topW - (topW - botW) * (y / total);
  const shades = ["#9C9CF0", "#7A7ADF", "#5656C4", "#3434A8", "#020181"].slice(-n);
  const lastFrom = startAt(fps, n - 1, itemStartSeconds) + 10;
  const out = center ? clamp01(grow(frame, fps, lastFrom)) : 0;
  return (
    <div style={{ position: "relative", width: W, height: total + (center ? 130 : 0) }}>
      {visible.map((item, index) => {
        const y0 = index * (bandH + gap);
        const w0 = widthAt(y0);
        const w1 = widthAt(y0 + bandH);
        const inset = (w0 - w1) / 2;
        const hot = index === active;
        return (
          <React.Fragment key={item}>
            <div style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 9), position: "absolute", left: (W - w0) / 2 - 86, top: y0 + bandH / 2 - 26 }}>
              <NumberBadge n={index + 1} hot={hot} onDark={dark} size={52} />
            </div>
            <div
              style={{
                ...itemMotion(frame, fps, index, itemStartSeconds, 9),
                position: "absolute",
                left: (W - w0) / 2,
                top: y0,
                width: w0,
                height: bandH,
                clipPath: `polygon(0 0, ${w0}px 0, ${w0 - inset}px 100%, ${inset}px 100%)`,
                background: hot ? `linear-gradient(90deg, ${c.accent}, #E4C862, ${c.accent})` : shades[index],
                color: hot ? c.navy : "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: n > 4 ? 27 : 30,
                fontWeight: 850,
                letterSpacing: 0.2,
                overflow: "hidden",
              }}
            >
              <ActiveSheen active={hot} dark />
              <span style={{ padding: `0 ${inset + 24}px`, textAlign: "center", lineHeight: 1.15 }}>{item}</span>
            </div>
          </React.Fragment>
        );
      })}
      {center ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: total + 14, display: "flex", flexDirection: "column", alignItems: "center", opacity: out, transform: `translateY(${(1 - out) * -30}px)` }}>
          <div style={{ width: 0, height: 0, borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderTop: `22px solid ${c.accent}` }} />
          <div style={{ marginTop: 10, padding: "16px 44px", borderRadius: 999, background: dark ? "#FFFFFF" : c.navy, color: dark ? c.navy : "#FFFFFF", fontSize: 30, fontWeight: 900, boxShadow: "0 16px 36px rgba(2,1,129,0.22)", border: `3px solid ${c.accent}` }}>
            {center}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* 12 ─ Spectrum: items sit at their place on a continuum; a knob slides to the one being spoken */
export function Spectrum({ items, dark, itemStartSeconds, values, leftLabel, rightLabel }: P) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 5);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const W = 1580;
  const H = 520;
  const x0 = 290;
  const x1 = W - 290;
  const ty = 270;
  const pos = (i: number) => clamp01((values?.[i] ?? ((i + 1) / (n + 1)) * 100) / 100);
  const xAt = (i: number) => x0 + pos(i) * (x1 - x0);
  const track = clamp01(grow(frame, fps, 2));
  // Knob: glide from the previously spoken item to the current one.
  let knobX = -1;
  if (active >= 0) {
    const order = visible.map((_, i) => i).sort((a, b) => startAt(fps, a, itemStartSeconds) - startAt(fps, b, itemStartSeconds));
    const k = order.indexOf(active);
    const prev = k > 0 ? order[k - 1] : active;
    const p = clamp01(grow(frame, fps, startAt(fps, active, itemStartSeconds)));
    knobX = xAt(prev) + (xAt(active) - xAt(prev)) * p;
  }
  const pole = (text: string | undefined, side: "left" | "right") => (
    <div style={{ position: "absolute", [side]: 0, top: ty - 48, width: 250, height: 96, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 16px", background: side === "left" ? (dark ? "rgba(255,255,255,0.14)" : c.navy) : c.accent, color: side === "left" ? "#FFFFFF" : c.navy, fontSize: 25, fontWeight: 900, lineHeight: 1.15, opacity: track }}>
      {text ?? (side === "left" ? "Less" : "More")}
    </div>
  );
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      {pole(leftLabel, "left")}
      {pole(rightLabel, "right")}
      <div style={{ position: "absolute", left: x0, top: ty - 10, height: 20, width: (x1 - x0) * track, borderRadius: 10, background: `linear-gradient(90deg, ${dark ? "rgba(255,255,255,0.55)" : c.navy}, ${c.accent})` }} />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <div key={t} style={{ position: "absolute", left: x0 + t * (x1 - x0) - 2, top: ty + 18, width: 4, height: 16, borderRadius: 2, background: c.border, opacity: track }} />
      ))}
      {visible.map((item, index) => {
        const x = xAt(index);
        const above = index % 2 === 0;
        const hot = index === active;
        const shown = shownAt(frame, fps, index, itemStartSeconds);
        return (
          <React.Fragment key={item}>
            <div style={{ position: "absolute", left: x - 2, top: above ? ty - 112 : ty + 12, width: 4, height: 100, background: hot ? c.accent : c.border, opacity: shown ? 1 : 0.35 }} />
            <div style={{ position: "absolute", left: x - 15, top: ty - 15, width: 30, height: 30, borderRadius: "50%", background: shown ? (hot ? c.accent : dark ? "#FFFFFF" : c.navy) : c.cardSoft, border: `4px solid ${dark ? c.bg : "#FFFFFF"}`, boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }} />
            <div style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 9), position: "absolute", left: x - 150, top: above ? ty - 222 : ty + 112, width: 300, minHeight: 104, padding: "14px 18px", borderRadius: 18, background: hot ? (dark ? "#FFFFFF" : c.navy) : c.card, border: `2px solid ${hot ? c.accent : c.border}`, color: hot ? (dark ? c.navy : "#FFFFFF") : c.text, fontSize: 25, fontWeight: 800, lineHeight: 1.2, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: hot ? "0 18px 40px rgba(2,1,129,0.20)" : "none" }}>
              <ActiveSheen active={hot} dark={!dark} />
              {item}
            </div>
          </React.Fragment>
        );
      })}
      {knobX >= 0 ? (
        <div style={{ position: "absolute", left: knobX - 30, top: ty - 30, width: 60, height: 60, borderRadius: "50%", border: `5px solid ${c.accent}`, boxShadow: `0 0 0 8px ${dark ? "rgba(205,172,59,0.18)" : "rgba(205,172,59,0.22)"}` }} />
      ) : null}
    </div>
  );
}

/* 13 ─ Balance scale: each spoken item drops into its pan and tips the beam; equal sides level out */
export function Balance({ items, dark, itemStartSeconds, leftCount, leftLabel, rightLabel, center }: P) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 6);
  const half = Math.min(3, leftCount ?? Math.ceil(visible.length / 2));
  const left = visible.slice(0, half);
  const right = visible.slice(half, half + 3);
  const all = [...left, ...right];
  const active = activeIndex(frame, fps, all.length, itemStartSeconds);
  const W = 1500;
  const H = 580;
  const px = W / 2;
  const py = 92;
  const L = 470;
  const hang = 300;
  // Each landed item adds weight to its side (spring), so the beam tips and settles.
  let tilt = 0;
  all.forEach((_, i) => {
    const g = shownAt(frame, fps, i, itemStartSeconds) ? grow(frame, fps, startAt(fps, i, itemStartSeconds)) : 0;
    tilt += (i < half ? 1 : -1) * 4 * g;
  });
  tilt = Math.max(-10, Math.min(10, tilt));
  const rad = (tilt * Math.PI) / 180;
  const ends = [
    { x: px - L * Math.cos(rad), y: py + L * Math.sin(rad) },
    { x: px + L * Math.cos(rad), y: py - L * Math.sin(rad) },
  ];
  const allShown = all.every((_, i) => shownAt(frame, fps, i, itemStartSeconds));
  const level = allShown && left.length === right.length;
  const levelP = level ? clamp01(grow(frame, fps, Math.max(...all.map((_, i) => startAt(fps, i, itemStartSeconds))) + 18)) : 0;
  const stroke = dark ? "rgba(255,255,255,0.75)" : c.navy;
  const cardH = 64;
  const panW = 380;
  const side = (list: string[], offset: number, end: { x: number; y: number }, label?: string, gold = false) => {
    const panY = end.y + hang;
    return (
      <>
        {list.map((item, k) => {
          const i = offset + k;
          const hot = i === active;
          return (
            <div key={item} style={{ ...itemMotion(frame, fps, i, itemStartSeconds, 9), position: "absolute", left: end.x - 165, top: panY - 10 - (k + 1) * (cardH + 8), width: 330, height: cardH, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 14px", background: hot ? c.accent : gold ? (dark ? "#FFFFFF" : "#3434A8") : dark ? "rgba(255,255,255,0.88)" : c.navy, color: hot ? c.navy : gold && !dark ? "#FFFFFF" : dark ? c.navy : "#FFFFFF", fontSize: 24, fontWeight: 850, lineHeight: 1.1, boxShadow: "0 10px 22px rgba(2,1,129,0.18)", overflow: "hidden" }}>
              <ActiveSheen active={hot} dark />
              {item}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: end.x - panW / 2, top: panY + 34, width: panW, textAlign: "center", color: gold ? c.accent : c.muted, fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" }}>{label}</div>
      </>
    );
  };
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <polygon points={`${px},${py} ${px - 70},${H - 20} ${px + 70},${H - 20}`} fill={dark ? "rgba(255,255,255,0.10)" : "rgba(2,1,129,0.07)"} stroke={c.border} strokeWidth={2} />
        <rect x={px - 150} y={H - 24} width={300} height={14} rx={7} fill={stroke} />
        {ends.map((end, k) => {
          const panY = end.y + hang;
          return (
            <g key={k}>
              <line x1={end.x} y1={end.y} x2={end.x - panW / 2 + 10} y2={panY} stroke={c.border} strokeWidth={3} />
              <line x1={end.x} y1={end.y} x2={end.x + panW / 2 - 10} y2={panY} stroke={c.border} strokeWidth={3} />
              <path d={`M ${end.x - panW / 2} ${panY} Q ${end.x} ${panY + 56} ${end.x + panW / 2} ${panY} Z`} fill={k === 0 ? stroke : c.accent} opacity={0.92} />
            </g>
          );
        })}
        <line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} stroke={stroke} strokeWidth={14} strokeLinecap="round" />
        <circle cx={px} cy={py} r={20 + levelP * 6} fill={level ? c.accent : stroke} stroke={dark ? c.bg : "#FFFFFF"} strokeWidth={5} />
      </svg>
      {side(left, 0, ends[0], leftLabel)}
      {side(right, half, ends[1], rightLabel, true)}
      {center ? (
        <div style={{ position: "absolute", left: px - 170, top: py - 82, width: 340, textAlign: "center", opacity: levelP, transform: `scale(${0.85 + 0.15 * levelP})` }}>
          <span style={{ display: "inline-block", padding: "10px 26px", borderRadius: 999, background: c.accent, color: c.navy, fontSize: 24, fontWeight: 900 }}>{center}</span>
        </div>
      ) : null}
    </div>
  );
}

/* 15 ─ Decision tree: a question node branches into "condition | action" paths */
export function DecisionTree({ items, dark, itemStartSeconds, center, title }: P) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 4);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const W = 1580;
  const H = 540;
  const cy = H / 2;
  const dx = 250;
  const size = 330;
  const rowGap = Math.min(150, 470 / Math.max(1, n));
  const rowY = (i: number) => cy + (i - (n - 1) / 2) * rowGap;
  const node = clamp01(grow(frame, fps, 0));
  const tip = dx + size / 2 * Math.SQRT2 * 0.72;
  const elbow = tip + 110;
  const cardX = 930;
  const line = dark ? "rgba(255,255,255,0.75)" : c.navy;
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {visible.map((item, index) => {
          const y = rowY(index);
          const g = shownAt(frame, fps, index, itemStartSeconds) ? clamp01(grow(frame, fps, startAt(fps, index, itemStartSeconds) - 6)) : 0;
          const d = `M ${tip} ${cy} L ${elbow - 30} ${cy} Q ${elbow} ${cy} ${elbow} ${cy + Math.sign(y - cy) * Math.min(30, Math.abs(y - cy))} L ${elbow} ${y - Math.sign(y - cy) * Math.min(30, Math.abs(y - cy))} Q ${elbow} ${y} ${elbow + 30} ${y} L ${cardX - 18} ${y}`;
          const hot = index === active;
          return (
            <g key={item}>
              <path d={d} fill="none" stroke={c.border} strokeWidth={5} strokeDasharray="8 10" />
              <path d={d} fill="none" stroke={hot ? c.accent : line} strokeWidth={6} strokeLinecap="round" strokeDasharray={1000} strokeDashoffset={1000 * (1 - g)} />
              <polygon points={`${cardX - 22},${y - 12} ${cardX - 2},${y} ${cardX - 22},${y + 12}`} fill={hot ? c.accent : line} opacity={g} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: dx - size / 2, top: cy - size / 2, width: size, height: size, transform: `scale(${0.6 + 0.4 * node}) rotate(45deg) scale(0.72)`, borderRadius: 34, background: dark ? "#FFFFFF" : c.navy, border: `5px solid ${c.accent}`, boxShadow: "0 22px 50px rgba(2,1,129,0.25)", opacity: node }} />
      <div style={{ position: "absolute", left: dx - 130, top: cy - 90, width: 260, height: 180, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: dark ? c.navy : "#FFFFFF", fontSize: 27, fontWeight: 900, lineHeight: 1.15, opacity: node }}>
        {center ?? title}
      </div>
      {visible.map((item, index) => {
        const [cond, action] = splitPair(item);
        const y = rowY(index);
        const hot = index === active;
        const motion = itemMotion(frame, fps, index, itemStartSeconds, 9);
        return (
          <React.Fragment key={item}>
            {action ? (
              <div style={{ ...motion, position: "absolute", left: (elbow + cardX) / 2 - 135 + 14, top: y - 25, width: 270, height: 50, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: hot ? c.accent : dark ? c.bg : "#FFFFFF", border: `2px solid ${hot ? c.accent : c.border}`, color: hot ? c.navy : c.text, fontSize: 22, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 16px" }}>
                {cond}
              </div>
            ) : null}
            <div style={{ ...motion, position: "absolute", left: cardX, top: y - Math.min(56, rowGap / 2 - 8), width: 620, height: Math.min(112, rowGap - 16), borderRadius: 20, display: "flex", alignItems: "center", gap: 20, padding: "0 28px", background: hot ? (dark ? "#FFFFFF" : c.navy) : c.card, border: `2px solid ${hot ? c.accent : c.border}`, color: hot ? (dark ? c.navy : "#FFFFFF") : c.text, fontSize: 28, fontWeight: 850, lineHeight: 1.18, boxShadow: hot ? "0 18px 40px rgba(2,1,129,0.22)" : "none", overflow: "hidden" }}>
              <ActiveSheen active={hot} dark={!dark} />
              <NumberBadge n={index + 1} hot={hot} onDark={hot ? !dark : dark} size={46} />
              {action || cond}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* 16 ─ Iceberg: a small visible tip above the water, the larger hidden part beneath */
export function Iceberg({ items, dark, itemStartSeconds, leftCount, leftLabel, rightLabel }: P) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 6);
  const top = Math.max(1, Math.min(2, leftCount ?? 1));
  const above = visible.slice(0, top);
  const below = visible.slice(top, top + 4);
  const all = [...above, ...below];
  const active = activeIndex(frame, fps, all.length, itemStartSeconds);
  const W = 1580;
  const H = 610;
  const sea = 196;
  const cx = 860;
  const bob = Math.sin(frame / 38) * 4;
  const appearP = clamp01(grow(frame, fps, 0));
  const wave = (offset: number) => {
    let d = `M 0 ${sea}`;
    for (let x = 0; x <= W; x += 40) d += ` L ${x} ${sea + Math.sin((x + frame * 2 + offset) / 60) * 5}`;
    return d;
  };
  const chip = (item: string, i: number, x: number, y: number, w: number, deep: boolean) => {
    const hot = i === active;
    return (
      <div key={item} style={{ ...itemMotion(frame, fps, i, itemStartSeconds, 9), position: "absolute", left: x - w / 2, top: y + bob, width: w, height: 62, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 18px", background: hot ? c.accent : deep ? "#FFFFFF" : dark ? "#FFFFFF" : c.navy, color: hot ? c.navy : deep ? c.navy : dark ? c.navy : "#FFFFFF", fontSize: 25, fontWeight: 850, lineHeight: 1.1, boxShadow: deep ? "0 10px 24px rgba(1,0,60,0.28)" : "0 10px 24px rgba(2,1,129,0.18)", overflow: "hidden" }}>
        <ActiveSheen active={hot} dark />
        {item}
      </div>
    );
  };
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="ice-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3434A8" stopOpacity={dark ? 0.45 : 0.16} />
            <stop offset="1" stopColor="#020181" stopOpacity={dark ? 0.75 : 0.42} />
          </linearGradient>
          <linearGradient id="ice-deep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C9C9F5" stopOpacity={0.85} />
            <stop offset="1" stopColor="#7A7ADF" stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <rect x={0} y={sea} width={W} height={H - sea} rx={24} fill="url(#ice-sea)" opacity={appearP} />
        <g transform={`translate(0 ${bob})`} opacity={appearP}>
          <polygon points={`${cx - 300},${sea} ${cx - 520},${sea + 150} ${cx - 430},${sea + 340} ${cx - 110},${sea + 400} ${cx + 260},${sea + 370} ${cx + 470},${sea + 190} ${cx + 300},${sea}`} fill="url(#ice-deep)" />
          <polygon points={`${cx - 330},${sea} ${cx - 150},${sea - 120} ${cx - 40},${sea - 190} ${cx + 70},${sea - 150} ${cx + 160},${sea - 80} ${cx + 330},${sea}`} fill={dark ? "#FFFFFF" : "#F4F4FF"} stroke={dark ? "transparent" : c.navy} strokeWidth={3} />
        </g>
        <path d={wave(0)} fill="none" stroke={dark ? "rgba(255,255,255,0.7)" : c.navy} strokeWidth={4} opacity={appearP} />
      </svg>
      <div style={{ position: "absolute", left: 30, top: 40, color: c.text, fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", opacity: appearP }}>▲ {leftLabel ?? "What we see"}</div>
      <div style={{ position: "absolute", left: 30, top: sea + 30, color: dark ? c.accent : c.navy, fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", opacity: appearP }}>▼ {rightLabel ?? "Beneath the surface"}</div>
      {above.map((item, k) => chip(item, k, cx - 20, sea - 136 + k * 68 + (above.length === 1 ? 40 : 0), 270, false))}
      {below.map((item, k) => {
        const i = top + k;
        const two = below.length > 2;
        const x = two ? cx - 70 + (k % 2 === 0 ? -170 : 170) : cx - 40;
        const y = two ? sea + 70 + Math.floor(k / 2) * 110 + (k % 2) * 40 : sea + 80 + k * 110;
        return chip(item, i, x, y, two ? 320 : 380, true);
      })}
    </div>
  );
}

const WORD_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, "twenty-five": 25 };

/* 18 ─ Stat tiles: a number spoken in the narration counts up, its units fill in as dots */
export function StatTiles({ items, dark, itemStartSeconds }: P) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 4);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const gap = 36;
  const W = 1560;
  const tileW = (W - gap * (n - 1)) / n;
  return (
    <div style={{ width: W, display: "flex", gap }}>
      {visible.map((item, index) => {
        const [raw, label] = splitPair(item);
        const num = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw.toLowerCase()];
        const g = shownAt(frame, fps, index, itemStartSeconds) ? clamp01(grow(frame, fps, startAt(fps, index, itemStartSeconds))) : 0;
        const hot = index === active;
        const shownNum = num == null ? raw : String(Math.round(num * g));
        const dots = num != null && num <= 30 ? num : 0;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 9), position: "relative", width: tileW, height: 420, borderRadius: 30, padding: "40px 34px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: hot ? (dark ? "#FFFFFF" : c.navy) : c.card, border: `2px solid ${hot ? c.accent : c.border}`, boxShadow: hot ? "0 26px 60px rgba(2,1,129,0.25)" : "0 10px 26px rgba(2,1,129,0.08)", overflow: "hidden" }}>
            <ActiveSheen active={hot} dark={!dark} />
            <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: c.accent, opacity: hot ? 0.22 : 0.1 }} />
            <div style={{ color: c.accent, fontSize: n > 3 ? 132 : 168, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4 }}>{shownNum}</div>
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 22, minHeight: 20 }}>
                {Array.from({ length: dots }, (_, d) => (
                  <div key={d} style={{ width: 18, height: 18, borderRadius: "50%", background: d < Math.round(dots * g) ? c.accent : hot ? "rgba(255,255,255,0.22)" : c.cardSoft, border: d < Math.round(dots * g) ? "none" : `2px solid ${c.border}` }} />
                ))}
              </div>
              <div style={{ color: hot ? (dark ? c.navy : "#FFFFFF") : c.text, fontSize: n > 3 ? 30 : 36, fontWeight: 850, lineHeight: 1.15 }}>{label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function gearPath(R: number, r: number, teeth: number) {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let t = 0; t < teeth; t++) {
    const a = t * step;
    const seq: [number, number][] = [
      [a - step * 0.5, r],
      [a - step * 0.22, r],
      [a - step * 0.14, R],
      [a + step * 0.14, R],
      [a + step * 0.22, r],
    ];
    seq.forEach(([ang, rad]) => pts.push(`${(Math.cos(ang) * rad).toFixed(1)},${(Math.sin(ang) * rad).toFixed(1)}`));
  }
  return `M ${pts.join(" L ")} Z`;
}

/* 19 ─ Gears: interlocking parts — every engaged part makes the whole system turn faster */
export function Gears({ items, dark, itemStartSeconds }: P) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 4);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const R = 192;
  const r = 164;
  const teeth = 14;
  const dist = R + r + 6;
  const W = 1560;
  const H = 600;
  const ang = (26 * Math.PI) / 180;
  const centers: { x: number; y: number }[] = [];
  const spanX = (n - 1) * dist * Math.cos(ang);
  for (let i = 0; i < n; i++) {
    centers.push({ x: W / 2 - spanX / 2 + i * dist * Math.cos(ang), y: H / 2 + (i % 2 === 0 ? -1 : 1) * (dist * Math.sin(ang)) / 2 });
  }
  // Rotation grows with each engaged gear (closed-form integral of speed over time).
  let A = 0;
  visible.forEach((_, i) => {
    const s = startAt(fps, i, itemStartSeconds);
    if (frame > s) A += (0.9 / n) * (frame - s);
  });
  const toothDeg = 360 / teeth;
  const phase: number[] = [0];
  for (let i = 1; i < n; i++) {
    const line = (Math.atan2(centers[i].y - centers[i - 1].y, centers[i].x - centers[i - 1].x) * 180) / Math.PI;
    phase.push(-phase[i - 1] + 2 * line + toothDeg / 2);
  }
  const path = gearPath(R, r, teeth);
  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {visible.map((item, i) => {
          const shown = shownAt(frame, fps, i, itemStartSeconds);
          const hot = i === active;
          const rot = (i % 2 === 0 ? 1 : -1) * A + phase[i];
          const fill = hot ? c.accent : shown ? (dark ? "#FFFFFF" : i % 2 === 0 ? c.navy : "#3434A8") : dark ? "rgba(255,255,255,0.08)" : "#E6E6F4";
          return (
            <g key={item} transform={`translate(${centers[i].x} ${centers[i].y}) rotate(${rot})`}>
              <path d={path} fill={fill} stroke={dark ? "rgba(255,255,255,0.25)" : "#FFFFFF"} strokeWidth={3} />
              <circle r={r - 34} fill="none" stroke={hot ? c.navy : shown ? (dark ? c.navy : "rgba(255,255,255,0.35)") : c.border} strokeWidth={2} strokeDasharray="6 10" opacity={0.6} />
            </g>
          );
        })}
      </svg>
      {visible.map((item, i) => {
        const shown = shownAt(frame, fps, i, itemStartSeconds);
        const hot = i === active;
        return (
          <div key={item} style={{ ...itemMotion(frame, fps, i, itemStartSeconds, 9), position: "absolute", left: centers[i].x - 120, top: centers[i].y - 70, width: 240, height: 140, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: hot ? c.navy : shown ? (dark ? c.navy : "#FFFFFF") : c.text, fontSize: 29, fontWeight: 900, lineHeight: 1.12 }}>
            {item}
          </div>
        );
      })}
    </div>
  );
}

/* 20 ─ Definition: a key term on the left, its meaning highlighted part by part */
export function Definition({ items, dark, itemStartSeconds, center, title, joiner }: P) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette(dark);
  const visible = items.slice(0, 5);
  const n = visible.length;
  const active = activeIndex(frame, fps, n, itemStartSeconds);
  const card = clamp01(grow(frame, fps, 0));
  return (
    <div style={{ width: "100%", maxWidth: 1600, display: "flex", alignItems: "stretch", gap: 70 }}>
      <div style={{ position: "relative", width: 620, flexShrink: 0, borderRadius: 34, padding: "54px 50px", background: dark ? "#FFFFFF" : c.navy, color: dark ? c.navy : "#FFFFFF", boxShadow: "0 30px 70px rgba(2,1,129,0.28)", opacity: card, transform: `perspective(1100px) rotateY(${(1 - card) * 18}deg)`, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ position: "absolute", right: 30, top: -40, color: c.accent, fontSize: 300, fontWeight: 900, opacity: 0.22, lineHeight: 1 }}>“</div>
        <div style={{ color: c.accent, fontSize: 21, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", marginBottom: 22 }}>Key term</div>
        <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.05 }}>{center ?? title}</div>
        <div style={{ width: 90, height: 6, borderRadius: 3, background: c.accent, marginTop: 30 }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: n > 4 ? 14 : 20 }}>
        <div style={{ color: c.muted, fontSize: 28, fontStyle: "italic", fontWeight: 700, marginBottom: 6, opacity: card }}>{joiner ?? "means"} …</div>
        {visible.map((item, index) => {
          const hot = index === active;
          const shown = shownAt(frame, fps, index, itemStartSeconds);
          const g = shown ? clamp01(grow(frame, fps, startAt(fps, index, itemStartSeconds))) : 0;
          return (
            <div key={item} style={{ ...itemMotion(frame, fps, index, itemStartSeconds, 9), display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, transform: "rotate(45deg)", background: shown ? c.accent : c.border, flexShrink: 0 }} />
              <span style={{ position: "relative", color: c.text, fontSize: n > 4 ? 34 : 40, fontWeight: hot ? 900 : 750, lineHeight: 1.2, padding: "2px 10px" }}>
                <span style={{ position: "absolute", left: 0, bottom: 4, height: "46%", width: `${g * 100}%`, borderRadius: 6, background: c.accent, opacity: hot ? 0.55 : 0.28, zIndex: 0 }} />
                <span style={{ position: "relative" }}>{item}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
