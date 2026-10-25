"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Check, FileUp, Link2, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { CATEGORY_INFO, CONCERN_INFO } from "@/lib/concern-info";
import { saveCatalog } from "@/lib/events";
import { concernSupply } from "@/lib/insights";
import { CATEGORIES, CONCERNS, CONCERN_LABELS, type Category, type Concern, type Product } from "@/lib/types";
import { InfoTip } from "./InfoTip";
import { ProductArt } from "./ProductArt";
import { Bar } from "./dashboard/charts";

interface ImportResult {
  source: string;
  tagger: "claude" | "keywords";
  found: number;
  truncated: boolean;
  tagged: Product[];
  skipped: string[];
  failed: string[];
}

const STEPS = ["Reading your catalog", "Finding skincare products", "Tagging skin concerns", "Building your shelf map"];
const EXAMPLES = ["byoma.com", "glossier.com"];

export function Onboard() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ImportResult>();
  const [products, setProducts] = useState<Product[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1600);
    return () => clearInterval(t);
  }, [busy]);

  async function run(init: RequestInit) {
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const res = await fetch("/api/import", { method: "POST", ...init });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      if (!data.tagged.length) throw new Error("We didn't find any face skincare products in that catalog.");
      setResult(data);
      setProducts(data.tagged);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const importUrl = (value = url) => {
    if (!value.trim()) return;
    setUrl(value);
    run({ headers: { "content-type": "application/json" }, body: JSON.stringify({ url: value.trim() }) });
  };

  const importCsv = (file?: File) => {
    if (!file) return;
    const body = new FormData();
    body.set("csv", file);
    run({ body });
  };

  function save(next: string) {
    if (!result) return;
    saveCatalog({ source: result.source, importedAt: Date.now(), tagger: result.tagger, products });
    router.push(next);
  }

  const setCategory = (id: string, category: Category) =>
    setProducts((ps) => ps.map((p) => (p.id === id && p.tags ? { ...p, tags: { ...p.tags, category } } : p)));
  const remove = (id: string) => setProducts((ps) => ps.filter((p) => p.id !== id));

  const supply = concernSupply(products);
  const maxSupply = Math.max(1, ...Object.values(supply));

  return (
    <main className="mx-auto max-w-[1240px] px-5 pt-8 pb-24 sm:px-8 lg:px-10 lg:pt-10">
      <div className="max-w-2xl">
        <p className="eyebrow text-gold">Add your store</p>
        <h1 className="mt-3 font-serif text-5xl leading-[1.02] sm:text-6xl">Live in about <em>sixty seconds.</em></h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Paste your Shopify store address. We read your public catalog, keep the face skincare, and tag every product
          by the skin concerns it treats. No app install, no manual tagging.
        </p>
      </div>

      <div className="mt-9 rounded-[1.5rem] border border-sand bg-white p-5 shadow-soft sm:p-7">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            importUrl();
          }}
        >
          <label className="relative flex-1">
            <span className="sr-only">Store URL</span>
            <Link2 className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourstore.com or yourstore.myshopify.com"
              className="w-full rounded-full border border-sand bg-ivory py-4 pr-4 pl-11 text-base outline-none focus:border-gold/60 focus:ring-4 focus:ring-gold/10"
              disabled={busy}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 font-medium text-ivory shadow-lift transition hover:bg-ink disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Import & tag
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          Try:
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={busy}
              onClick={() => importUrl(ex)}
              className="rounded-full border border-sand bg-ivory px-3 py-1 text-ink hover:border-stone"
            >
              {ex}
            </button>
          ))}
          <span className="mx-1">·</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-ink"
          >
            <FileUp className="size-3.5" /> Upload a CSV instead
          </button>
          <InfoTip label="CSV format" align="start">
            Any export with <b>title</b> and <b>price</b> columns works. Optional: description or ingredients, brand,
            image, url, product type.
          </InfoTip>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => importCsv(e.target.files?.[0])} />
        </div>

        {busy && (
          <ol className="mt-6 grid gap-2 sm:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${i <= step ? "bg-sage/10 text-ink" : "bg-cream text-muted"}`}
              >
                {i < step ? (
                  <Check className="size-4 text-sage" />
                ) : i === step ? (
                  <Loader2 className="size-4 animate-spin text-brand" />
                ) : (
                  <span className="size-4" />
                )}
                {s}
              </li>
            ))}
          </ol>
        )}
        {error && <p className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>}
      </div>

      {!result && !busy && (
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Read your catalog", "We fetch your store's public product feed. Nothing to install, no admin access, no passwords."],
            ["Tag every product", "Each face-care product is mapped to YouCam's 12 skin concerns, with key actives and skin types."],
            ["Go live", "Preview the skin match on your own products and see which concerns your shelf under-serves."],
          ].map(([title, body], i) => (
            <div key={title} className="rounded-[1.25rem] border border-sand bg-white/70 p-6">
              <span className="font-serif text-5xl text-stone">0{i + 1}</span>
              <h3 className="mt-6 font-serif text-2xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </section>
      )}

      {result && (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Products found" value={result.found} sub={result.truncated ? "first 250 imported" : result.source} />
            <Stat label="Skincare tagged" value={products.length} sub="ready for routines" />
            <Stat label="Skipped" value={result.skipped.length} sub="makeup, body, merch, sets" />
            <div className="rounded-[1.25rem] border border-sand bg-white p-5 shadow-soft">
              <p className="flex items-center gap-1 text-sm text-muted">
                Tagged by
                <InfoTip label="About tagging" align="end">
                  {result.tagger === "claude"
                    ? "Claude read each product's title and description and mapped it to YouCam's 12 skin concerns."
                    : "Keyword rules matched product types and known actives (niacinamide, retinol, BHA…). Add an Anthropic key for AI tagging, which handles unusual wording far better."}
                </InfoTip>
              </p>
              <p className="mt-2 flex items-center gap-2 font-serif text-2xl">
                {result.tagger === "claude" ? <Bot className="size-5 text-brand" /> : <Sparkles className="size-5 text-amber" />}
                {result.tagger === "claude" ? "Claude AI" : "Keyword rules"}
              </p>
              <p className="mt-1 text-xs text-muted">review and fix below</p>
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[1.25rem] border border-sand bg-white p-6 shadow-soft">
              <h2 className="flex items-center gap-1 font-serif text-2xl">
                Your shelf coverage
                <InfoTip label="About shelf coverage" align="start">
                  How many of your products strongly treat each concern. Concerns with zero products can&apos;t be
                  matched for shoppers who need them.
                </InfoTip>
              </h2>
              <ul className="mt-4 space-y-0.5">
                {CONCERNS.map((c) => (
                  <li key={c} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-sm">
                    <span className={supply[c] === 0 ? "text-clay" : ""}>{CONCERN_LABELS[c]}</span>
                    <Bar value={supply[c]} max={maxSupply} tip={`${supply[c]} products`} height={8} />
                    <span className="text-right text-muted tabular-nums">{supply[c] || "—"}</span>
                  </li>
                ))}
              </ul>
              {CONCERNS.some((c) => supply[c] === 0) && (
                <p className="mt-4 rounded-xl bg-clay/[0.06] px-3 py-2 text-xs text-clay">
                  Not covered: {CONCERNS.filter((c) => supply[c] === 0).map((c) => CONCERN_LABELS[c].toLowerCase()).join(", ")}.
                </p>
              )}
            </div>

            <div className="rounded-[1.25rem] border border-sand bg-white p-6 shadow-soft lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1 font-serif text-2xl">
                  Review tags
                  <InfoTip label="About reviewing tags" align="start">
                    Fix a category or remove a product before going live. Changes apply to your storefront preview
                    and insights.
                  </InfoTip>
                </h2>
                <span className="text-xs text-muted">{products.length} products</span>
              </div>
              <ul className="mt-3 max-h-[28rem] divide-y divide-sand overflow-y-auto pr-1">
                {products.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <ProductArt product={p} className="size-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-lg leading-tight">{p.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {topConcerns(p).map((c) => (
                          <span key={c} className="rounded-full bg-cream px-2 py-0.5 text-[11px]">
                            {CONCERN_INFO[c].benefit}
                          </span>
                        ))}
                        {topConcerns(p).length === 0 && <span className="text-[11px] text-muted">Basic care</span>}
                      </div>
                    </div>
                    <select
                      aria-label={`Category for ${p.title}`}
                      value={p.tags?.category}
                      onChange={(e) => setCategory(p.id, e.target.value as Category)}
                      className="rounded-lg border border-sand bg-cream px-2 py-1.5 text-xs"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_INFO[c].label}
                        </option>
                      ))}
                    </select>
                    <span className="hidden w-12 text-right text-sm text-muted tabular-nums sm:block">${p.price}</span>
                    <button
                      onClick={() => remove(p.id)}
                      aria-label={`Remove ${p.title}`}
                      className="grid size-8 place-items-center rounded-full text-muted hover:bg-clay/10 hover:text-clay"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => save("/demo?store=mine")}
              disabled={!products.length}
              className="flex flex-1 items-center justify-between rounded-[1.25rem] bg-brand px-7 py-6 text-left text-ivory transition hover:bg-ink disabled:opacity-50"
            >
              <span>
                <span className="block font-serif text-2xl">Preview skin match on your catalog</span>
                <span className="text-sm text-ivory/60">Take a selfie and get a routine from your products</span>
              </span>
              <ArrowRight className="size-5" />
            </button>
            <button
              onClick={() => save("/dashboard")}
              disabled={!products.length}
              className="flex flex-1 items-center justify-between rounded-[1.25rem] border border-sand bg-white px-7 py-6 text-left shadow-soft transition hover:border-stone disabled:opacity-50"
            >
              <span>
                <span className="block font-serif text-2xl">See your gap analysis</span>
                <span className="text-sm text-muted">Which concerns your shelf under-serves</span>
              </span>
              <ArrowRight className="size-5" />
            </button>
          </section>
        </>
      )}
    </main>
  );
}

function topConcerns(p: Product): Concern[] {
  return Object.entries(p.tags?.concerns ?? {})
    .filter(([, s]) => (s ?? 0) >= 0.5)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([c]) => c as Concern);
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-[1.25rem] border border-sand bg-white p-5 shadow-soft">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-serif text-[2.9rem] leading-none tabular-nums">{value}</p>
      <p className="mt-1 truncate text-xs text-muted">{sub}</p>
    </div>
  );
}
