"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Hand-rolled, single-series charts. One series per chart (no legend needed;
// the card title names it). Mark color validated for the light surface.
export const MARK = "#3d8b5f";
export const MARK_SOFT = "#3d8b5f26";

/** Horizontal bar with a hover tooltip. Value is 0–max on a shared scale. */
export function Bar({
  value,
  max,
  color = MARK,
  tip,
  height = 10,
}: {
  value: number;
  max: number;
  color?: string;
  tip?: ReactNode;
  height?: number;
}) {
  const [hover, setHover] = useState(false);
  const pct = max > 0 ? Math.max(1.5, (value / max) * 100) : 0;
  return (
    <div
      className="relative w-full py-1.5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="w-full rounded-r-[4px] bg-sand/60" style={{ height }}>
        <div
          className="h-full rounded-r-[4px] transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color, opacity: hover ? 1 : 0.9 }}
        />
      </div>
      {hover && tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full z-20 mb-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
          style={{ left: `min(${pct}%, calc(100% - 10rem))` }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}

/** Tiny trend line for KPI tiles. Decorative: the tile states the number. */
export function Sparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - (v / max) * (height - 4)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={MARK_SOFT} />
      <path d={d} fill="none" stroke={MARK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Daily line chart with a crosshair + tooltip. */
export function LineChart({
  points,
  height = 180,
  format,
}: {
  points: { x: number; y: number; label: string; detail?: string }[];
  height?: number;
  format?: (y: number) => string;
}) {
  const [hover, setHover] = useState<number>();
  // Draw at the real pixel width so axis text stays readable on phones.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { l: 28, r: 8, t: 10, b: 22 };
  const max = Math.max(4, ...points.map((p) => p.y));
  const niceMax = Math.ceil(max / 4) * 4;
  const x = (i: number) => pad.l + (i / Math.max(1, points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const ticks = [0, niceMax / 2, niceMax];
  const hp = hover !== undefined ? points[hover] : undefined;

  return (
    <div ref={box} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block w-full"
        role="img"
        aria-label="Scans per day"
        onMouseLeave={() => setHover(undefined)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (points.length - 1));
          setHover(Math.min(points.length - 1, Math.max(0, i)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#efe9df" strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#6b625a">
              {t}
            </text>
          </g>
        ))}
        {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="#6b625a">
            {points[i]?.label}
          </text>
        ))}
        <path d={`${d} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={MARK_SOFT} />
        <path d={d} fill="none" stroke={MARK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hp && hover !== undefined && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#1f1b16" strokeOpacity={0.25} strokeWidth={1} />
            <circle cx={x(hover)} cy={y(hp.y)} r={5} fill={MARK} stroke="#fff" strokeWidth={2} />
          </g>
        )}
        {/* full-height hit area */}
        <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} fill="transparent" />
      </svg>
      {hp && hover !== undefined && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-0 z-20 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: hover > points.length * 0.6 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
          }}
        >
          <span className="font-medium">{hp.label}</span> · {format ? format(hp.y) : hp.y}
          {hp.detail && <span className="block text-white/70">{hp.detail}</span>}
        </div>
      )}
    </div>
  );
}
