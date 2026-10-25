"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Lightbulb, PackageX, Radio, Store } from "lucide-react";
import { DEMO_PRODUCTS, DEMO_STORE } from "@/data/demo-store";
import { BAND_STYLE, CATEGORY_INFO, CONCERN_INFO, scoreBand } from "@/lib/concern-info";
import { loadCatalog, loadEvents, type ImportedCatalog } from "@/lib/events";
import {
  averages,
  concernSupply,
  funnel,
  gapAnalysis,
  recommendationCounts,
  scansPerDay,
  skinTypeMix,
  type ScanEvent,
} from "@/lib/insights";
import { simulateScans } from "@/lib/simulate";
import { CONCERN_LABELS, type Product } from "@/lib/types";
import { InfoTip } from "../InfoTip";
import { ProductArt } from "../ProductArt";
import { Bar, LineChart, MARK, Sparkline } from "./charts";

const DAYS = 30;
const GAP = "#c4553d"; // status: under-stocked (always shown with icon + label)

// A concern is a stocking gap when many shoppers need it and few products serve it.
const isGap = (demandPct: number, supply: number) => demandPct >= 20 && supply <= 2;

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const dayLabel = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function Dashboard() {
  const [live, setLive] = useState<ScanEvent[]>([]);
  const [imported, setImported] = useState<ImportedCatalog | null>(null);
  const [view, setView] = useState<"demo" | "imported">("demo");
  const [now, setNow] = useState<number>();

  useEffect(() => {
    setNow(Date.now());
    setLive(loadEvents());
    setImported(loadCatalog());
  }, []);

  const catalog: Product[] = view === "imported" && imported ? imported.products : DEMO_PRODUCTS;
  const storeName = view === "imported" && imported ? imported.source : DEMO_STORE.name;

  const data = useMemo(() => {
    if (!now) return null;
    const simulated = simulateScans(catalog, { now, days: DAYS });
    // Live scans were matched against the demo shelf, so only mix them into that view.
    const scans = view === "demo" ? [...live, ...simulated].sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)) : simulated;
    const daily = scansPerDay(scans, DAYS, now);
    const half = Math.floor(DAYS / 2);
    const recent = daily.slice(half).reduce((s, d) => s + d.scans, 0);
    const prior = daily.slice(0, half).reduce((s, d) => s + d.scans, 0);
    return {
      scans,
      daily,
      growth: prior ? Math.round(((recent - prior) / prior) * 100) : 0,
      f: funnel(scans),
      gaps: gapAnalysis(scans, catalog),
      supply: concernSupply(catalog),
      types: skinTypeMix(scans),
      avg: averages(scans),
      recs: recommendationCounts(scans, catalog),
    };
  }, [now, live, catalog, view]);

  if (!data) return <div className="mx-auto max-w-6xl px-4 py-24 text-center text-muted">Loading insights…</div>;

  const liveCount = view === "demo" ? live.length : 0;
  const topGaps = data.gaps.filter((g) => isGap(g.demandPct, g.supply)).slice(0, 3);
  // Fill the remaining slots with what the shelf already serves well.
  const covered = [...data.gaps]
    .filter((g) => !isGap(g.demandPct, g.supply) && g.supply >= 3)
    .sort((a, b) => b.demandPct - a.demandPct)
    .slice(0, 3 - topGaps.length);
  const byDemand = [...data.gaps].sort((a, b) => b.demandPct - a.demandPct);
  const maxDemand = Math.max(...byDemand.map((g) => g.demandPct), 1);
  const scanTrend = data.daily.map((d) => d.scans);

  return (
    <main className="mx-auto max-w-[1240px] px-5 pt-8 pb-24 sm:px-8 lg:px-10 lg:pt-10">
      {/* Title */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold">Skin match insights</p>
          <h1 className="mt-3 font-serif text-5xl leading-none">{storeName}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            Last {DAYS} days · {data.scans.length} skin scans
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage">
                <Radio className="size-3" /> {liveCount} live from this browser
              </span>
            )}
            <InfoTip label="About this data" align="start" side="bottom">
              This demo has no database, so it shows {data.scans.length - liveCount} simulated shoppers. Each one
              gets realistic skin scores and runs through the real routine engine. Scans you make on the
              storefront in this browser are added live.
            </InfoTip>
          </p>
        </div>
        {imported && (
          <div className="flex rounded-full border border-sand bg-white p-1 text-sm" role="tablist" aria-label="Store">
            {(["demo", "imported"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`rounded-full px-4 py-1.5 transition ${view === v ? "bg-ink text-ivory" : "text-muted hover:text-ink"}`}
              >
                {v === "demo" ? "Demo store" : imported.source}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Skin scans"
          value={String(data.f.scans)}
          sub={`${data.growth >= 0 ? "+" : ""}${data.growth}% vs previous 15 days`}
          tip="Shoppers who completed a selfie skin analysis on your store."
          spark={scanTrend}
        />
        <Kpi
          label="Scan → cart"
          value={`${data.f.conversionPct}%`}
          sub={`${data.f.carts} shoppers added a routine`}
          tip="Share of scans where the shopper added recommended products to their bag."
        />
        <Kpi
          label="Avg routine order"
          value={money(data.f.avgCart)}
          sub="per shopper who added to bag"
          tip="Average value of recommended products added to the bag after a scan."
        />
        <Kpi
          label="Routine revenue"
          value={money(data.f.revenue)}
          sub={`last ${DAYS} days`}
          tip="Total value of recommended products added to bags. Actual checkout depends on your store."
        />
      </section>

      {/* Gap finder + skin types */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Gap finder"
          tip="Concerns that are a top-3 focus for many shoppers but that few of your products treat. Each gap is a stocking or marketing opportunity."
          action={<span className="text-xs text-muted">What your shelf is missing</span>}
        >
          {topGaps.length === 0 ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted">
              <CheckCircle2 className="size-5 text-sage" /> No major gaps. Your shelf covers what your shoppers need.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {topGaps.map((g) => {
                const info = CONCERN_INFO[g.concern];
                const shoppers = Math.round((g.demandPct / 100) * data.f.scans);
                return (
                  <div key={g.concern} className="flex flex-col rounded-xl border border-clay/20 bg-clay/[0.04] p-4">
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-semibold text-clay">
                      <AlertTriangle className="size-3" /> Gap
                    </span>
                    <p className="mt-3 font-serif text-2xl">{CONCERN_LABELS[g.concern]}</p>
                    <p className="mt-1 text-sm text-muted">
                      <span className="font-semibold text-ink">{g.demandPct}%</span> of shoppers need it, but only{" "}
                      <span className="font-semibold text-ink">{g.supply}</span> {g.supply === 1 ? "product" : "products"} treat it.
                    </p>
                    <p className="mt-3 flex gap-1.5 border-t border-clay/15 pt-3 text-xs text-muted">
                      <Lightbulb className="size-3.5 shrink-0 text-amber" />
                      <span>
                        Stock {article(info.benefit)} {info.benefit.toLowerCase()} product with{" "}
                        {info.helps.slice(0, 2).join(" or ")}. {shoppers} shoppers this month would have matched it.
                      </span>
                    </p>
                  </div>
                );
              })}
              {covered.map((g) => (
                <div key={g.concern} className="flex flex-col rounded-xl border border-sage/20 bg-sage/[0.04] p-4">
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-semibold text-sage">
                    <CheckCircle2 className="size-3" /> Well covered
                  </span>
                  <p className="mt-3 font-serif text-2xl">{CONCERN_LABELS[g.concern]}</p>
                  <p className="mt-1 text-sm text-muted">
                    <span className="font-semibold text-ink">{g.demandPct}%</span> of shoppers need it, and{" "}
                    <span className="font-semibold text-ink">{g.supply}</span> products treat it.
                  </p>
                  <p className="mt-3 border-t border-sage/15 pt-3 text-xs text-muted">
                    A strength to feature in ads and on product pages.
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ivory px-4 py-3 text-xs text-muted">
            <span>
              A <span className="font-medium text-clay">gap</span> is a concern in the top 3 for at least 20% of shoppers,
              with 2 or fewer products that treat it.
            </span>
            <span className="font-medium text-ink">
              {topGaps.reduce((s, g) => s + Math.round((g.demandPct / 100) * data.f.scans), 0)} shoppers affected this month
            </span>
          </div>
        </Card>

        <Card title="Shopper skin types" tip="Estimated from each shopper's oiliness, hydration and redness scores.">
          <ul className="space-y-1">
            {data.types.map((t) => (
              <li key={t.type}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{t.type}</span>
                  <span className="text-muted tabular-nums">{t.pct}%</span>
                </div>
                <Bar value={t.pct} max={Math.max(...data.types.map((x) => x.pct))} tip={`${t.n} shoppers · ${t.pct}%`} height={8} />
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-sand pt-4 text-center">
            <div>
              <p className="font-serif text-4xl tabular-nums">{data.avg.score ?? "—"}</p>
              <p className="text-xs text-muted">Avg skin score</p>
            </div>
            <div>
              <p className="font-serif text-4xl tabular-nums">{data.avg.skinAge ?? "—"}</p>
              <p className="text-xs text-muted">Avg skin age</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Demand vs shelf */}
      <Card
        className="mt-4"
        title="What shoppers need vs what you stock"
        tip="Demand: share of shoppers with this concern in their top 3. Shelf: your products that treat it strongly (match 0.5 or more)."
      >
        <div className="text-sm">
          <div className="hidden grid-cols-[10rem_1fr_9rem] gap-x-4 pb-1 sm:grid">
            <span className="text-xs font-medium tracking-wide text-muted uppercase">Concern</span>
            <span className="text-xs font-medium tracking-wide text-muted uppercase">Shopper demand</span>
            <span className="text-right text-xs font-medium tracking-wide text-muted uppercase">On your shelf</span>
          </div>
          {byDemand.map((g) => {
            const gap = isGap(g.demandPct, g.supply);
            return (
              <div
                key={g.concern}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-sand/60 py-1.5 last:border-0 sm:grid-cols-[10rem_1fr_9rem] sm:border-0 sm:py-0"
              >
                <span className="sm:py-1">{CONCERN_LABELS[g.concern]}</span>
                <div className="order-last col-span-2 flex items-center gap-2 sm:order-none sm:col-span-1">
                  <Bar
                    value={g.demandPct}
                    max={maxDemand}
                    color={gap ? GAP : MARK}
                    tip={`${g.demandPct}% of shoppers · ${Math.round((g.demandPct / 100) * data.f.scans)} people`}
                  />
                  <span className="w-9 shrink-0 text-right text-muted tabular-nums">{g.demandPct}%</span>
                </div>
                <span className="flex items-center justify-end gap-1.5 tabular-nums">
                  {gap && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-clay/10 px-1.5 py-0.5 text-[10px] font-semibold text-clay">
                      <AlertTriangle className="size-3" /> Gap
                    </span>
                  )}
                  {g.supply} {g.supply === 1 ? "product" : "products"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Trend + products */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Skin scans per day" tip="Completed skin analyses per day. Hover for daily detail.">
          <LineChart
            points={data.daily.map((d) => ({
              x: d.day,
              y: d.scans,
              label: dayLabel(d.day),
              detail: `${d.carts} added a routine to bag`,
            }))}
            format={(y) => `${y} scans`}
          />
        </Card>

        <Card title="Most recommended products" tip="How often each product appeared in a shopper's routine.">
          <ul className="space-y-2.5">
            {data.recs.top.map(({ product, count }) => (
              <li key={product.id} className="flex items-center gap-3">
                <ProductArt product={product} className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{product.title}</span>
                    <span className="shrink-0 text-muted tabular-nums">{count}</span>
                  </div>
                  <Bar value={count} max={data.recs.top[0]?.count ?? 1} tip={`In ${count} routines`} height={6} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Never recommended"
          tip="Products no shopper was matched to. They may be mis-tagged, too niche, or worth bundling or discounting."
          action={<span className="text-xs text-muted">{data.recs.never.length} products</span>}
        >
          {data.recs.never.length === 0 ? (
            <p className="py-4 text-sm text-muted">Every product was recommended at least once.</p>
          ) : (
            <ul className="divide-y divide-sand">
              {data.recs.never.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <PackageX className="size-4 shrink-0 text-muted" />
                  <span className="flex-1 truncate">{p.title}</span>
                  <span className="text-xs text-muted">{p.tags ? CATEGORY_INFO[p.tags.category].label : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent scans" tip="The latest anonymous scans. No photos or personal data are stored, only scores.">
          <ul className="divide-y divide-sand">
            {data.scans.slice(0, 6).map((s, i) => (
              <li key={`${s.ts}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted">{timeAgo(s.ts ?? now ?? 0, now ?? 0)}</span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                  {s.priorities.slice(0, 2).map((c) => (
                    <span key={c} className="rounded-full bg-cream px-2 py-0.5 text-[11px]">
                      {CONCERN_LABELS[c]}
                    </span>
                  ))}
                  {s.live && (
                    <span className="rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-medium text-sage">You</span>
                  )}
                </div>
                {s.overall !== undefined && (
                  <span className={`shrink-0 text-xs font-medium tabular-nums ${BAND_STYLE[scoreBand(s.overall)].text}`}>
                    {s.overall}
                  </span>
                )}
                <span className={`w-20 shrink-0 text-right text-xs ${s.addedToCart ? "font-medium text-ink" : "text-muted"}`}>
                  {s.addedToCart ? money(s.cartValue) : "Browsed"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* CTAs */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/demo"
          className="group flex items-center justify-between rounded-[1.25rem] bg-brand px-7 py-6 text-ivory transition hover:bg-ink"
        >
          <span>
            <span className="block font-serif text-2xl">Try a scan on the storefront</span>
            <span className="text-sm text-ivory/60">Your scan shows up here instantly</span>
          </span>
          <ArrowRight className="size-5 transition group-hover:translate-x-1" />
        </Link>
        <Link
          href="/onboard"
          className="group flex items-center justify-between rounded-[1.25rem] border border-sand bg-white px-7 py-6 shadow-soft transition hover:border-stone"
        >
          <span>
            <span className="flex items-center gap-2 font-serif text-2xl">
              <Store className="size-5 text-gold" /> Connect your own store
            </span>
            <span className="text-sm text-muted">Paste a Shopify URL and see your gaps</span>
          </span>
          <ArrowRight className="size-5 transition group-hover:translate-x-1" />
        </Link>
      </section>
    </main>
  );
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

function timeAgo(ts: number, now: number) {
  const m = Math.max(0, Math.round((now - ts) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function Card({
  title,
  tip,
  action,
  className = "",
  children,
}: {
  title: string;
  tip?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-[1.25rem] border border-sand bg-white p-6 shadow-soft ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1 font-serif text-2xl">
          {title}
          {tip && (
            <InfoTip label={`About ${title}`} align="start">
              {tip}
            </InfoTip>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, sub, tip, spark }: { label: string; value: string; sub: string; tip: string; spark?: number[] }) {
  return (
    <div className="rounded-[1.25rem] border border-sand bg-white p-5 shadow-soft">
      <p className="flex items-center gap-1 text-sm text-muted">
        {label}
        <InfoTip label={`About ${label}`} align="start">
          {tip}
        </InfoTip>
      </p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="font-serif text-[2.9rem] leading-none tabular-nums">{value}</p>
        {spark && <Sparkline values={spark} />}
      </div>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}
