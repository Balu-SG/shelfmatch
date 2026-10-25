import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, LineChart, ShieldCheck, Sparkles, Store } from "lucide-react";
import { FaceMesh } from "@/components/FaceMesh";
import { ProductArt } from "@/components/ProductArt";
import { ScoreRing } from "@/components/ScoreRing";
import { DEMO_PRODUCTS } from "@/data/demo-store";

const byId = (id: string) => DEMO_PRODUCTS.find((p) => p.id === id)!;

const STEPS = [
  {
    icon: Store,
    title: "Connect your catalog",
    body: "Paste your Shopify address. Every face-care product is tagged by the skin concerns it treats, in about a minute.",
  },
  {
    icon: Camera,
    title: "Shoppers take a selfie",
    body: "YouCam Skin AI measures 12 concerns. Live coaching and face framing make the photo work on any laptop or phone.",
  },
  {
    icon: LineChart,
    title: "Sell the right routine",
    body: "Each shopper gets a morning and night ritual from your shelf. You see what their skin needs, and what you don't stock.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory">
      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-brand text-ivory">
            <Sparkles className="size-4" />
          </span>
          <span className="font-serif text-2xl">ShelfMatch</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#stores" className="hover:text-ink">For stores</a>
          <Link href="/dashboard" className="hover:text-ink">Seller insights</Link>
        </nav>
        <Link href="/demo" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-ivory transition hover:bg-brand">
          Live demo
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div className="fade-up">
          <p className="eyebrow text-gold">AI skin match for beauty retail</p>
          <h1 className="mt-5 font-serif text-[3.4rem] leading-[0.95] sm:text-7xl lg:text-[5.4rem]">
            Every shopper deserves a <em className="text-brand">skin expert.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            ShelfMatch turns a 15-second selfie into a skincare routine built only from your store&apos;s products, and
            tells you which skin concerns your shelf is missing.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/demo"
              className="group flex items-center gap-2 rounded-full bg-brand px-7 py-4 font-medium text-ivory shadow-lift transition hover:bg-ink"
            >
              Try the live demo <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-stone px-7 py-4 font-medium transition hover:border-ink hover:bg-white"
            >
              See seller insights
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-gold" /> Powered by YouCam Skin AI
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-gold" /> Photos never stored
            </span>
          </div>
        </div>

        {/* Visual */}
        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,#ffffff,rgba(255,255,255,0))]" />
          <FaceMesh
            className="relative w-full"
            hotspots={[
              { at: "forehead", label: "Fine lines", value: 84, side: "left" },
              { at: "rightCheek", label: "Hydration", value: 58, side: "right" },
              { at: "leftCheek", label: "Pores", value: 71, side: "left" },
              { at: "underEyeR", label: "Dark circles", value: 66, side: "right" },
            ]}
          />
          <div className="float-y absolute top-[6%] right-0 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 p-3 pr-5 shadow-lift backdrop-blur sm:right-[-4%]">
            <ScoreRing score={74} size={54} label="" />
            <div>
              <p className="eyebrow text-muted">Skin score</p>
              <p className="font-serif text-xl">Focus: hydration</p>
            </div>
          </div>
          <div
            className="float-y absolute bottom-[4%] left-0 hidden w-60 rounded-2xl sm:block border border-white/60 bg-white/85 p-3 shadow-lift backdrop-blur sm:left-[-6%]"
            style={{ animationDelay: "1.5s" }}
          >
            <p className="eyebrow px-1 text-muted">Your morning ritual</p>
            {[byId("sr-hyal"), byId("mo-barrier")].map((p, i) => (
              <div key={p.id} className="mt-2 flex items-center gap-3">
                <ProductArt product={p} className="size-11 shrink-0 rounded-xl" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted">Step {i + 2} · ${p.price}</p>
                </div>
              </div>
            ))}
          </div>
          <div
            className="float-y absolute right-[-2%] bottom-[2%] hidden rounded-2xl border border-clay/20 bg-white/90 px-4 py-3 shadow-lift backdrop-blur sm:block"
            style={{ animationDelay: "3s" }}
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-clay">
              <AlertTriangle className="size-3.5" /> Stock gap
            </p>
            <p className="mt-1 text-sm">
              <span className="font-serif text-2xl">66%</span> need oil control
            </p>
            <p className="text-xs text-muted">you stock 2 products</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-sand bg-white/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-sand px-5 sm:px-8 md:grid-cols-4 md:divide-x">
          {[
            ["12", "skin concerns measured"],
            ["15s", "from selfie to routine"],
            ["60s", "to connect a store"],
            ["0", "photos stored"],
          ].map(([n, l]) => (
            <div key={l} className="px-2 py-8 text-center md:px-6">
              <p className="font-serif text-5xl">{n}</p>
              <p className="mt-1 text-sm text-muted">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow text-gold">How it works</p>
          <h2 className="mt-4 font-serif text-5xl leading-tight">The in-store consultation, now on every product page.</h2>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-sand bg-sand md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="bg-ivory p-8 sm:p-10">
              <div className="flex items-center justify-between">
                <span className="font-serif text-6xl text-stone">0{i + 1}</span>
                <span className="grid size-11 place-items-center rounded-full border border-sand bg-white text-brand">
                  <Icon className="size-5" />
                </span>
              </div>
              <h3 className="mt-10 font-serif text-3xl">{title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two audiences */}
      <section id="stores" className="mx-auto grid max-w-7xl gap-6 px-5 pb-24 sm:px-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-cream p-8 sm:p-10">
          <p className="eyebrow text-gold">For shoppers</p>
          <h3 className="mt-4 font-serif text-4xl">A ritual, explained.</h3>
          <p className="mt-3 max-w-md text-muted">
            Twelve measurements with visual maps, a morning and night routine, and the reason behind every pick.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {["cl-bha", "sr-niac", "spf-fluid"].map((id, i) => {
              const p = byId(id);
              return (
                <div key={id} className="rounded-2xl bg-white p-2 shadow-soft">
                  <ProductArt product={p} className="aspect-square rounded-xl" />
                  <p className="eyebrow mt-2 px-1 text-muted">Step {i + 1}</p>
                  <p className="truncate px-1 pb-1 text-sm">{p.title}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl bg-brand p-8 text-ivory sm:p-10">
          <p className="eyebrow text-gold">For stores</p>
          <h3 className="mt-4 font-serif text-4xl">Know what your shelf is missing.</h3>
          <p className="mt-3 max-w-md text-ivory/70">
            Face scans become stocking decisions: the concerns your shoppers have, against the products you carry.
          </p>
          <div className="mt-8 space-y-3 rounded-2xl bg-ivory/[0.07] p-5">
            {[
              ["Oil control", 66, 2, true],
              ["Pores", 38, 3, false],
              ["Hydration", 35, 11, false],
              ["Dark circles", 31, 1, true],
            ].map(([label, pct, supply, gap]) => (
              <div key={label as string} className="grid grid-cols-[6.5rem_1fr_7.5rem] items-center gap-3 text-sm">
                <span>{label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-ivory/10">
                  <span
                    className={`block h-full rounded-full ${gap ? "bg-[#e08b6f]" : "bg-[#9cc3a4]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="text-right text-xs whitespace-nowrap text-ivory/70">
                  {gap && <span className="mr-1.5 font-semibold text-[#e9a58e]">Gap</span>}
                  {supply as number} on shelf
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-8 py-16 text-center text-ivory sm:px-16">
          <div className="pointer-events-none absolute -top-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" />
          <h2 className="relative font-serif text-5xl sm:text-6xl">See it on a real storefront.</h2>
          <p className="relative mx-auto mt-4 max-w-lg text-ivory/70">
            Take a selfie on our demo store, then watch your scan appear in the seller dashboard.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-full bg-ivory px-7 py-4 font-medium text-ink transition hover:bg-white">
              Open the demo store
            </Link>
            <Link href="/onboard" className="rounded-full border border-ivory/30 px-7 py-4 font-medium transition hover:bg-ivory/10">
              Connect your store
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-sand">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:px-8">
          <span className="font-serif text-lg text-ink">ShelfMatch</span>
          <span>Built with YouCam Skin AI · Cosmetic guidance, not medical advice</span>
        </div>
      </footer>
    </div>
  );
}
