import type { Category, Product } from "@/lib/types";

// Studio-style product renders for the demo store (it has no photography).
// Each product gets category-shaped packaging, a palette and cap finish
// derived from its id, and a printed label with its own name. Real stores
// pass imageUrl and get their product photo instead.

const HUES = [
  { bg: "#f1e8de", body: "#f3e3d3", tint: "#e2bfa0", deep: "#b07f5a" }, // apricot
  { bg: "#ebece4", body: "#e3e8da", tint: "#bccbab", deep: "#6f8560" }, // sage
  { bg: "#f2e9e6", body: "#f1dedb", tint: "#ddb3ab", deep: "#a86e66" }, // blush
  { bg: "#e9edee", body: "#dfe8ea", tint: "#b3c9cf", deep: "#5f8590" }, // mist
  { bg: "#ece8f0", body: "#e5def0", tint: "#c7bad9", deep: "#7c6a9c" }, // lilac
  { bg: "#f3eedf", body: "#f3e9c9", tint: "#e3cd8a", deep: "#a88a33" }, // butter
  { bg: "#ece8e2", body: "#e7e0d6", tint: "#cbbfae", deep: "#85765f" }, // stone
];

const CAPS = [
  { a: "#1f1c19", b: "#4a443d", c: "#26221f" }, // matte black
  { a: "#9a7646", b: "#ead6a8", c: "#a8865a" }, // brushed gold
  { a: "#d8cfc1", b: "#fbf8f2", c: "#ddd4c6" }, // ivory ceramic
];

type Shape = "dropper" | "pump" | "bottle" | "jar" | "tube" | "mini";

function shapeFor(category: Category, title: string): Shape {
  switch (category) {
    case "cleanser":
      return "pump";
    case "toner":
      return "bottle";
    case "serum":
      return "dropper";
    case "treatment":
      return /mask|paste|patch|sleeping|gel/i.test(title) ? "jar" : "dropper";
    case "moisturizer":
      return "jar";
    case "spf":
      return "tube";
    case "eye":
      return "mini";
  }
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const GENERIC = /\b(cleanser|serum|moisturizer|treatment|toner|essence|mist|cream|spf|\d+%?|night|day|eye|gel|lotion|wash)\b/gi;

/** Two short label lines from the product name, e.g. "Oat Milk" / "Cleanser". */
function labelLines(title: string): [string, string] {
  const words = title.split(/\s+/);
  const distinctive = title.replace(GENERIC, "").trim().split(/\s+/).filter(Boolean);
  const pick = distinctive.length ? distinctive : words;
  const line1 = pick.slice(0, 2).join(" ");
  const kind = words.find((w) => new RegExp(`^${GENERIC.source}$`, "i").test(w));
  return [line1.length > 14 ? pick[0] : line1, (kind ?? pick.slice(2).join(" ")).toUpperCase()];
}

export function ProductArt({ product, className = "" }: { product: Product; className?: string }) {
  if (product.imageUrl && !product.imageUrl.startsWith("swatch:")) {
    return (
      <div className={`overflow-hidden bg-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt="" className="size-full object-contain p-[6%]" loading="lazy" />
      </div>
    );
  }
  const category = product.tags?.category ?? "serum";
  const h = hash(product.id);
  const hue = HUES[h % HUES.length];
  const cap = CAPS[(h >>> 4) % CAPS.length];
  const shape = shapeFor(category, product.title);
  const id = `pa-${product.id.replace(/[^a-z0-9]/gi, "")}`;
  const brand = (product.brand ?? "Dewdrop").split(" ")[0].toUpperCase();
  const [name, kind] = labelLines(product.title);

  const label = (x: number, y: number, w: number, hgt: number) => (
    <g>
      <rect x={x} y={y} width={w} height={hgt} rx={1.5} fill="#fffdf9" opacity={0.94} />
      <text x={x + w / 2} y={y + 8} textAnchor="middle" fontSize="4" letterSpacing="1.4" fill="#2a2621" fontFamily="var(--font-body)">
        {brand}
      </text>
      <line x1={x + w * 0.3} x2={x + w * 0.7} y1={y + 11} y2={y + 11} stroke={hue.deep} strokeWidth={0.6} />
      <text x={x + w / 2} y={y + hgt * 0.56} textAnchor="middle" fontSize={name.length > 10 ? 6 : 7} fill="#1c1915" fontFamily="var(--font-display), serif">
        {name}
      </text>
      <text x={x + w / 2} y={y + hgt * 0.56 + 7} textAnchor="middle" fontSize="3.4" letterSpacing="0.8" fill="#776d63" fontFamily="var(--font-body)">
        {kind}
      </text>
      <text x={x + w / 2} y={y + hgt - 3.5} textAnchor="middle" fontSize="3" fill="#9a9087" fontFamily="var(--font-body)">
        {category === "moisturizer" || shape === "jar" ? "50 ml" : category === "eye" ? "15 ml" : "30 ml"}
      </text>
    </g>
  );

  const capFill = `url(#${id}-cap)`;
  const glass = (
    <>
      <stop offset="0" stopColor="#ffffff" stopOpacity="0.0" />
      <stop offset="0.12" stopColor="#ffffff" stopOpacity="0.55" />
      <stop offset="0.22" stopColor="#ffffff" stopOpacity="0.05" />
      <stop offset="0.85" stopColor="#000000" stopOpacity="0.04" />
      <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
    </>
  );

  return (
    <div className={`overflow-hidden ${className}`}>
      <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
        <defs>
          <radialGradient id={`${id}-bg`} cx="50%" cy="38%" r="75%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="0.55" stopColor={hue.bg} />
            <stop offset="1" stopColor={hue.bg} />
          </radialGradient>
          <linearGradient id={`${id}-cap`} x1="0" x2="1">
            <stop offset="0" stopColor={cap.a} />
            <stop offset="0.45" stopColor={cap.b} />
            <stop offset="1" stopColor={cap.c} />
          </linearGradient>
          <linearGradient id={`${id}-sheen`} x1="0" x2="1">
            {glass}
          </linearGradient>
          <linearGradient id={`${id}-liquid`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hue.tint} stopOpacity="0.75" />
            <stop offset="1" stopColor={hue.deep} stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={`${id}-body`} x1="0" x2="1">
            <stop offset="0" stopColor={hue.body} />
            <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="0.6" stopColor={hue.body} />
            <stop offset="1" stopColor={hue.tint} />
          </linearGradient>
          <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <rect width="200" height="200" fill={`url(#${id}-bg)`} />
        <ellipse cx="100" cy="172" rx={shape === "jar" ? 56 : 40} ry="6" fill="#3b2f22" opacity="0.18" filter={`url(#${id}-blur)`} />

        {shape === "dropper" && (
          <g>
            <rect x="90" y="28" width="20" height="38" rx="10" fill={cap.a === "#1f1c19" ? "#2a2622" : "#3a342e"} />
            <rect x="84" y="60" width="32" height="20" rx="3" fill={capFill} />
            <rect x="88" y="78" width="24" height="10" fill={hue.tint} opacity="0.55" />
            <rect x="68" y="86" width="64" height="84" rx="15" fill={hue.tint} opacity="0.35" />
            <rect x="72" y="102" width="56" height="64" rx="11" fill={`url(#${id}-liquid)`} />
            <rect x="68" y="86" width="64" height="84" rx="15" fill={`url(#${id}-sheen)`} />
            {label(78, 112, 44, 40)}
          </g>
        )}

        {shape === "pump" && (
          <g>
            <rect x="86" y="36" width="34" height="10" rx="3" fill={capFill} />
            <rect x="116" y="38" width="22" height="6" rx="3" fill={capFill} />
            <rect x="96" y="44" width="8" height="20" fill={capFill} />
            <rect x="85" y="62" width="30" height="18" rx="3" fill={capFill} />
            <rect x="62" y="78" width="76" height="92" rx="18" fill={`url(#${id}-body)`} />
            <rect x="62" y="78" width="76" height="92" rx="18" fill={`url(#${id}-sheen)`} opacity="0.7" />
            {label(74, 106, 52, 46)}
          </g>
        )}

        {shape === "bottle" && (
          <g>
            <rect x="81" y="36" width="38" height="32" rx="5" fill={capFill} />
            <rect x="70" y="66" width="60" height="104" rx="12" fill={hue.tint} opacity="0.3" />
            <rect x="74" y="84" width="52" height="82" rx="9" fill={`url(#${id}-liquid)`} opacity="0.85" />
            <rect x="70" y="66" width="60" height="104" rx="12" fill={`url(#${id}-sheen)`} />
            {label(79, 104, 42, 44)}
          </g>
        )}

        {shape === "jar" && (
          <g>
            <rect x="46" y="88" width="108" height="28" rx="7" fill={capFill} />
            <rect x="46" y="88" width="108" height="6" rx="3" fill="#ffffff" opacity="0.25" />
            <rect x="50" y="112" width="100" height="58" rx="16" fill={`url(#${id}-body)`} />
            <rect x="50" y="112" width="100" height="58" rx="16" fill={`url(#${id}-sheen)`} opacity="0.6" />
            <g transform="translate(0,-3)">{label(70, 124, 60, 38)}</g>
          </g>
        )}

        {(shape === "tube" || shape === "mini") && (
          <g transform={shape === "mini" ? "translate(20,30) scale(0.8)" : undefined}>
            <rect x="68" y="26" width="64" height="9" rx="1.5" fill={hue.body} />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={i} x1={74 + i * 10} x2={74 + i * 10} y1="27" y2="34" stroke={hue.tint} strokeWidth="1" />
            ))}
            <path d="M70 35 H130 L121 140 Q100 144 79 140 Z" fill={`url(#${id}-body)`} />
            <path d="M70 35 H130 L121 140 Q100 144 79 140 Z" fill={`url(#${id}-sheen)`} opacity="0.6" />
            <rect x="79" y="138" width="42" height="32" rx="5" fill={capFill} />
            {label(80, 56, 40, 50)}
          </g>
        )}
      </svg>
    </div>
  );
}
