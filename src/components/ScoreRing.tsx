import { BAND_STYLE, scoreBand } from "@/lib/concern-info";

const COLORS = { healthy: "#4f7a5a", fair: "#c58a2b", care: "#b4553f" };

export function ScoreRing({ score, size = 96, label }: { score: number; size?: number; label?: string }) {
  const stroke = size / 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const band = scoreBand(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efe9df" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={COLORS[band]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="leading-none font-semibold tabular-nums" style={{ fontSize: size * 0.3 }}>
          {score}
        </span>
        {label !== "" && (
          <span className={`mt-1 text-[10px] font-medium ${BAND_STYLE[band].text}`}>
            {label ?? BAND_STYLE[band].label}
          </span>
        )}
      </div>
    </div>
  );
}
