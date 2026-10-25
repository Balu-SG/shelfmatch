"use client";

import { useEffect, useState } from "react";
import { Camera, Check, Search, ShieldCheck, ShoppingBag, Sparkles, Wand2 } from "lucide-react";
import { CATEGORY_PLURAL, CONCERN_INFO } from "@/lib/concern-info";
import { CATEGORIES, type Category, type Concern, type Product } from "@/lib/types";
import { InfoTip } from "./InfoTip";
import { ProductArt } from "./ProductArt";
import { ScanFlow } from "./ScanFlow";
import { ScoreRing } from "./ScoreRing";

function topBenefits(p: Product, n = 2): string[] {
  return Object.entries(p.tags?.concerns ?? {})
    .filter(([, s]) => (s ?? 0) >= 0.5)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, n)
    .map(([c]) => CONCERN_INFO[c as Concern].benefit);
}

export function Storefront({
  storeName,
  products,
  fictional = false,
}: {
  storeName: string;
  products: Product[];
  fictional?: boolean;
}) {
  const [cart, setCart] = useState<Product[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [toast, setToast] = useState<string>();
  const total = cart.reduce((sum, p) => sum + p.price, 0);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(undefined), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const addToCart = (items: Product[], message?: string) => {
    const fresh = items.filter((p) => !cart.some((c) => c.id === p.id));
    setCart([...cart, ...fresh]);
    setToast(message ?? (fresh.length ? `Added ${fresh[0].title}` : "Already in your bag"));
  };

  const shown = CATEGORIES.filter((c) => filter === "all" || c === filter);
  const [wordmark, ...rest] = fictional ? storeName.split(" ") : [storeName];
  // Hero composition: a serum, a cream and a cleanser from this shelf.
  const pick = (cat: Category) => products.find((p) => p.tags?.category === cat) ?? products[0];
  const heroProducts = [pick("serum"), pick("moisturizer"), pick("cleanser")].filter(Boolean);

  return (
    <div className="min-h-screen bg-ivory">
      <div className="bg-ink px-4 py-2 text-center text-[11px] tracking-[0.16em] text-ivory/80 uppercase">
        {fictional ? "Complimentary shipping over $50 · New: AI skin match" : `ShelfMatch preview of ${storeName} · not affiliated with the brand`}
      </div>

      <header className="sticky top-0 z-20 border-b border-sand bg-ivory/90 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4 sm:px-8">
          <nav className="hidden gap-7 text-sm text-muted md:flex">
            <button onClick={() => setFilter("all")} className="hover:text-ink">Shop</button>
            <button onClick={() => setScanOpen(true)} className="hover:text-ink">Skin match</button>
            <span>Journal</span>
          </nav>
          <div className="col-start-1 text-left md:col-start-2 md:text-center">
            <p className="font-serif text-[1.7rem] leading-none sm:text-3xl">{wordmark}</p>
            {rest.length > 0 && <p className="eyebrow mt-1 text-[9px] text-muted">{rest.join(" ")}</p>}
          </div>
          <div className="col-start-3 flex items-center justify-end gap-5">
            <Search className="size-5 text-muted" />
            <span className="relative">
              <ShoppingBag className="size-5" />
              {cart.length > 0 && (
                <span
                  data-testid="cart-count"
                  className="absolute -top-2 -right-2.5 grid size-4.5 place-items-center rounded-full bg-brand text-[10px] font-semibold text-ivory"
                >
                  {cart.length}
                </span>
              )}
            </span>
            {cart.length > 0 && <span className="hidden text-sm text-muted sm:inline">${total.toFixed(2)}</span>}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <div className="grid items-center overflow-hidden rounded-[2rem] bg-cream lg:grid-cols-2">
          <div className="px-7 py-12 sm:px-14 sm:py-16">
            <p className="eyebrow flex items-center gap-2 text-gold">
              <Sparkles className="size-3.5" /> New · AI skin match
            </p>
            <h1 className="mt-5 font-serif text-5xl leading-[1.02] sm:text-6xl">
              Your skin, read in <em>fifteen seconds.</em>
            </h1>
            <p className="mt-5 max-w-md leading-relaxed text-muted">
              One selfie measures 12 skin concerns. We answer with a morning and night ritual from our shelf, and the
              reason for every step.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <button
                onClick={() => setScanOpen(true)}
                className="flex items-center gap-2 rounded-full bg-brand px-7 py-4 font-medium text-ivory shadow-lift transition hover:bg-ink"
              >
                <Sparkles className="size-4" /> Find my routine
              </button>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="size-4 text-gold" /> Your photo is never stored
              </span>
            </div>
          </div>
          <div className="relative h-80 sm:h-[26rem] lg:h-full lg:min-h-[30rem]">
            {heroProducts[1] && (
              <ProductArt product={heroProducts[1]} className="absolute bottom-[8%] left-[6%] w-[42%] rounded-[1.5rem] shadow-lift" />
            )}
            {heroProducts[0] && (
              <ProductArt product={heroProducts[0]} className="absolute top-[10%] left-[34%] w-[40%] rounded-[1.5rem] shadow-lift" />
            )}
            {heroProducts[2] && (
              <ProductArt product={heroProducts[2]} className="absolute right-[5%] bottom-[14%] w-[30%] rounded-[1.5rem] shadow-lift" />
            )}
            <div className="float-y absolute top-[8%] right-[5%] hidden items-center gap-3 rounded-2xl bg-white/90 p-3 pr-4 shadow-lift backdrop-blur sm:flex">
              <ScoreRing score={78} size={46} label="" />
              <div>
                <p className="eyebrow text-[9px] text-muted">Skin score</p>
                <p className="font-serif text-lg leading-tight">Focus: hydration</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-sand bg-sand sm:grid-cols-3">
          {[
            [Camera, "Take a selfie", "Live coaching frames it for you"],
            [Wand2, "Get your skin read", "12 measurements, mapped on your photo"],
            [Check, "Shop your ritual", fictional ? "Every pick explained, all from our shelf" : "Every pick from this store's shelf"],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof Camera;
            return (
              <div key={title as string} className="flex items-center gap-4 bg-ivory px-5 py-4">
                <span className="font-serif text-3xl text-stone">{i + 1}</span>
                <I className="size-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{title as string}</p>
                  <p className="truncate text-xs text-muted">{body as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Category tabs */}
      <div className="sticky top-[69px] z-10 mt-10 border-b border-sand bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-7 overflow-x-auto px-5 sm:px-8">
          {(["all", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`shrink-0 border-b-2 py-3.5 text-sm transition ${
                filter === c ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {c === "all" ? "All products" : CATEGORY_PLURAL[c]}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
        {shown.map((cat) => {
          const items = products.filter((p) => p.tags?.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat} className="mt-14">
              <div className="flex items-baseline justify-between border-b border-sand pb-3">
                <h2 className="font-serif text-3xl">{CATEGORY_PLURAL[cat]}</h2>
                <span className="text-xs text-muted">{items.length} products</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} inCart={cart.some((c) => c.id === p.id)} onAdd={() => addToCart([p])} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-brand px-8 py-12 text-ivory sm:flex-row sm:items-center sm:px-14">
          <div>
            <p className="eyebrow text-gold">Skin match</p>
            <h2 className="mt-3 font-serif text-4xl">Not sure where to begin?</h2>
            <p className="mt-2 max-w-md text-ivory/70">A fifteen-second scan finds the ritual for your skin.</p>
          </div>
          <button
            onClick={() => setScanOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-ivory px-7 py-4 font-medium text-ink transition hover:bg-white"
          >
            <Sparkles className="size-4" /> Start my skin match
          </button>
        </div>
      </section>

      <footer className="border-t border-sand">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-5 py-8 text-xs text-muted sm:flex-row sm:px-8">
          <span>
            {fictional
              ? `© ${storeName}. A fictional store for the ShelfMatch demo.`
              : `Preview of ${storeName} with ShelfMatch. Products from the store’s public catalog.`}
          </span>
          <span>
            Skin match by <span className="font-serif text-sm text-ink">ShelfMatch</span> × YouCam AI
          </span>
        </div>
      </footer>

      <button
        onClick={() => setScanOpen(true)}
        className="fixed right-5 bottom-5 z-20 flex items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-ivory shadow-lift transition hover:bg-brand"
      >
        <Sparkles className="size-4" /> Find my routine
      </button>

      {toast && (
        <div className="fade-up fixed top-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm text-ivory shadow-lift">
          <Check className="size-4 text-[#9cc3a4]" /> {toast}
        </div>
      )}

      {scanOpen && (
        <ScanFlow
          storeName={storeName}
          products={products}
          onClose={() => setScanOpen(false)}
          onAddToCart={(items, total) => {
            addToCart(items, `Routine added: ${items.length} products · $${total.toFixed(2)}`);
            setScanOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({ product: p, inCart, onAdd }: { product: Product; inCart: boolean; onAdd: () => void }) {
  const benefits = topBenefits(p);
  return (
    <div className="group flex flex-col">
      <div className="relative overflow-hidden rounded-2xl">
        <ProductArt product={p} className="aspect-[4/5] transition duration-500 group-hover:scale-[1.03]" />
        <button
          onClick={onAdd}
          className={`absolute inset-x-3 bottom-3 rounded-full py-2.5 text-sm font-medium shadow-soft backdrop-blur transition md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 ${
            inCart ? "bg-white/90 text-sage md:opacity-100" : "bg-ink/90 text-ivory hover:bg-ink"
          }`}
        >
          {inCart ? "In bag" : "Add"}
        </button>
      </div>
      <p className="eyebrow mt-4 min-h-4 text-[10px] text-gold">{benefits.join(" · ")}</p>
      <div className="mt-1.5 flex items-start gap-1">
        <p className="flex-1 font-serif text-xl leading-tight">{p.title}</p>
        <InfoTip label={`About ${p.title}`} align="end">
          <span className="block font-medium">Key ingredients</span>
          {p.tags?.keyIngredients.join(", ")}
          {!!p.tags?.skinTypes.length && (
            <span className="mt-1.5 block">
              <span className="font-medium">Best for:</span> {p.tags.skinTypes.join(", ")} skin
            </span>
          )}
          {!!p.tags?.avoidFor.length && (
            <span className="mt-1.5 block text-white/70">May not suit {p.tags.avoidFor.join(" or ")} skin.</span>
          )}
        </InfoTip>
      </div>
      <p className="mt-1.5 text-sm text-muted">${p.price}</p>
    </div>
  );
}
