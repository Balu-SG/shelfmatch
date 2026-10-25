import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, Home, LayoutDashboard, ShieldCheck, Sparkles, Store } from "lucide-react";

type Active = "dashboard" | "onboard";

const NAV: { href: string; label: string; key?: Active; icon: typeof Home; external?: boolean }[] = [
  { href: "/dashboard", label: "Insights", key: "dashboard", icon: LayoutDashboard },
  { href: "/onboard", label: "Add your store", key: "onboard", icon: Store },
  { href: "/demo", label: "Storefront", icon: ExternalLink, external: true },
  { href: "/", label: "ShelfMatch home", icon: Home },
];

// App frame for the seller side: sidebar on desktop, compact top bar on mobile.
export function SellerShell({ active, children }: { active: Active; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-sand bg-cream/70 px-5 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <span className="grid size-8 place-items-center rounded-full bg-brand text-ivory">
            <Sparkles className="size-4" />
          </span>
          <span className="font-serif text-2xl">ShelfMatch</span>
        </Link>

        <p className="eyebrow mt-10 px-2 text-[10px] text-muted">Workspace</p>
        <nav className="mt-3 space-y-1">
          {NAV.map(({ href, label, key, icon: Icon, external }) => {
            const on = key === active;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  on ? "bg-white font-medium text-ink shadow-soft" : "text-muted hover:bg-white/60 hover:text-ink"
                }`}
              >
                <Icon className={`size-4 ${on ? "text-gold" : ""}`} />
                {label}
                {external && <span className="ml-auto text-[10px] text-muted">↗</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-sand bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-gold/15 font-serif text-lg text-gold">D</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Dewdrop Apothecary</p>
                <p className="text-xs text-muted">Demo workspace</p>
              </div>
            </div>
          </div>
          <p className="flex items-start gap-2 px-2 text-[11px] leading-relaxed text-muted">
            <ShieldCheck className="size-3.5 shrink-0 text-gold" /> Shopper photos are never stored. Only anonymous
            scores reach this dashboard.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sand bg-ivory/90 px-5 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-brand text-ivory">
              <Sparkles className="size-3.5" />
            </span>
            <span className="font-serif text-xl">ShelfMatch</span>
          </Link>
          <nav className="flex gap-1">
            {NAV.slice(0, 2).map(({ href, label, key }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-1.5 text-xs ${key === active ? "bg-ink text-ivory" : "text-muted"}`}
              >
                {label === "Add your store" ? "Add store" : label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
