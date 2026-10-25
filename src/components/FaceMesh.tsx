import mesh from "@/data/face-mesh.json";

// Abstract face map drawn from 478 face-landmark points (extracted once from a
// synthetic face; no photo is shipped). Used as the brand visual for "skin
// mapping": hero, scan intro and the scanning state.

type Pt = [number, number, number];
const P = mesh.points as Pt[];

const xs = P.map((p) => p[0]);
const ys = P.map((p) => p[1]);
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);
const PAD = 0.06;
const W = 300;
const scale = W / ((maxX - minX) * (1 + PAD * 2));
const H = Math.round((maxY - minY) * (1 + PAD * 2) * scale);
const px = (i: number) => (P[i][0] - minX + (maxX - minX) * PAD) * scale;
const py = (i: number) => (P[i][1] - minY + (maxY - minY) * PAD) * scale;

function path(edges: number[][]) {
  return edges.map(([a, b]) => `M${px(a).toFixed(1)} ${py(a).toFixed(1)}L${px(b).toFixed(1)} ${py(b).toFixed(1)}`).join("");
}
const TESS = path(mesh.tesselation);
const CONTOURS = path([...mesh.oval, ...mesh.lips, ...mesh.leftEye, ...mesh.rightEye, ...mesh.leftBrow, ...mesh.rightBrow]);

// Landmark indices for concern hotspots.
export const SPOTS = {
  forehead: 151,
  leftCheek: 50,
  rightCheek: 280,
  underEyeR: 374,
  underEyeL: 145,
  nose: 4,
  chin: 152,
  jaw: 397,
} as const;

export interface Hotspot {
  at: keyof typeof SPOTS;
  label: string;
  value?: string | number;
  side?: "left" | "right";
}

export function FaceMesh({
  tone = "light",
  hotspots = [],
  sweep = true,
  className = "",
}: {
  tone?: "light" | "dark";
  hotspots?: Hotspot[];
  sweep?: boolean;
  className?: string;
}) {
  const line = tone === "light" ? "#8a6d45" : "#e8dcc4";
  const accent = tone === "light" ? "#2f3b2e" : "#ffffff";
  const id = `fm-${tone}`;
  return (
    <svg viewBox={`-95 -10 ${W + 190} ${H + 20}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tone === "light" ? "#a8875a" : "#ffffff"} stopOpacity="0" />
          <stop offset="0.5" stopColor={tone === "light" ? "#a8875a" : "#ffffff"} stopOpacity="0.35" />
          <stop offset="1" stopColor={tone === "light" ? "#a8875a" : "#ffffff"} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor={tone === "light" ? "#ffffff" : "#a8875a"} stopOpacity={tone === "light" ? 0.9 : 0.18} />
          <stop offset="1" stopColor={tone === "light" ? "#ffffff" : "#a8875a"} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>
      <ellipse cx={W / 2} cy={H / 2} rx={W * 0.6} ry={H * 0.55} fill={`url(#${id}-glow)`} />
      <path d={TESS} stroke={line} strokeWidth={0.35} strokeOpacity={tone === "light" ? 0.32 : 0.28} fill="none" />
      <path d={CONTOURS} stroke={line} strokeWidth={0.9} strokeOpacity={0.75} fill="none" strokeLinecap="round" />
      {P.filter((_, i) => i % 3 === 0).map((_, k) => {
        const i = k * 3;
        return <circle key={i} cx={px(i)} cy={py(i)} r={0.7} fill={line} opacity={0.55} />;
      })}
      {sweep && (
        <g clipPath={`url(#${id}-clip)`}>
          <rect className="sweep" x="-10" y="0" width={W + 20} height={H * 0.22} fill={`url(#${id}-sweep)`} />
        </g>
      )}
      {hotspots.map((h, n) => {
        const i = SPOTS[h.at];
        const x = px(i);
        const y = py(i);
        const right = (h.side ?? (x > W / 2 ? "right" : "left")) === "right";
        const lx = right ? W + 8 : -8;
        return (
          <g key={h.at} style={{ animationDelay: `${n * 0.3}s` }}>
            <circle className="pulse-ring" cx={x} cy={y} r={3} fill="none" stroke={accent} strokeWidth={0.8} style={{ animationDelay: `${n * 0.4}s` }} />
            <circle cx={x} cy={y} r={2.6} fill={accent} />
            <path d={`M${x} ${y} L${right ? x + 14 : x - 14} ${y - 10} L${lx} ${y - 10}`} stroke={accent} strokeWidth={0.6} fill="none" opacity={0.7} />
            <text x={lx + (right ? 3 : -3)} y={y - 13} textAnchor={right ? "start" : "end"} fontSize="8" fill={tone === "light" ? "#776d63" : "#e8dcc4"} fontFamily="var(--font-body)" letterSpacing="0.8">
              {h.label.toUpperCase()}
            </text>
            {h.value !== undefined && (
              <text x={lx + (right ? 3 : -3)} y={y + 2} textAnchor={right ? "start" : "end"} fontSize="15" fill={accent} fontFamily="var(--font-display), serif">
                {h.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
