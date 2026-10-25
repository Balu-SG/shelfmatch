# ShelfMatch

**An in-store skin expert for every online beauty shop.** A shopper takes a 15-second selfie, [YouCam Skin AI](https://yce.perfectcorp.com/ai-api) measures 12 skin concerns, and ShelfMatch builds a morning and night routine **only from that store's products**, explaining every pick. The store gets a dashboard showing what its shoppers' skin needs and which concerns its shelf doesn't cover.

Built for the YouCam API Skin AI & eCommerce VTO Hackathon.

**Live demo:** _added after deploy_

## Try it (no setup)

| Page | What to do |
|---|---|
| `/` | Landing page |
| `/demo` | Demo store → **Find my routine** → **Take a selfie** (webcam, live coaching), **Upload a photo**, or **See a sample result** (no camera needed) |
| `/dashboard` | Seller insights: gap finder, shopper demand vs shelf, skin types, top and never-recommended products. Your own scans show up here, tagged "You". |
| `/onboard` | Paste a Shopify store (try `byoma.com` or `glossier.com`), review the AI tags, preview the skin match on that catalog |

## What it does

**For shoppers**
- **Selfie skin analysis** with the YouCam AI Skin Analysis API (v2.1, 12 SD concerns, mask overlays, skin age, overall score).
- **Works on a normal laptop webcam.** YouCam requires the face to cover more than 60% of the image width. A browser-side face detector (MediaPipe BlazeFace, self-hosted) coaches the shopper live (distance, light, angle, one face) and crops around the face before upload. Uploaded photos are auto-cropped too, and HEIC and oversized images are converted.
- **A routine from this store's shelf only**, with the reason for every step ("For your oiliness (41/100) · with niacinamide 10%"), how-to-use notes and safety tips.
- **Plain-language errors** for YouCam's photo errors (face too small, too dark, etc.).

**For stores**
- **One-step onboarding:** reads a Shopify store's public `products.json` (or a CSV), keeps face skincare, and tags each product by skin concern with Claude, falling back to keyword rules when no Anthropic key is set.
- **Gap finder:** "66% of shoppers need oil control, but only 2 products treat it", with what to stock.
- **Insights:** scans, scan-to-cart conversion, routine order value, skin-type mix, demand vs shelf for all 12 concerns, most and never-recommended products.

**Privacy:** selfies go to YouCam for analysis and are never stored. Only anonymous scores are kept.

## How recommendations work

The engine is deterministic and explainable ([`src/lib/routine.ts`](src/lib/routine.ts)):

1. **Focus areas** are the shopper's three lowest scores under 80. **Skin type** is inferred from oiliness, hydration and redness.
2. **Routine steps:** AM cleanser → serum → moisturizer → SPF; PM cleanser → treatment → moisturizer (+ eye care when needed).
3. **Each product in a step is scored:** Σ (product's strength for a concern × how much the concern needs care), with focus areas counted double, plus a bonus for matching the skin type.
4. **Filters:** products unsuitable for the skin type are skipped; retinoids, acids and masks are PM-only; no routine doubles a strong active.
5. The highest score wins, and the "why" line comes from the concern that contributed most.

## Tech

Next.js 15 (App Router, TypeScript) · Tailwind CSS 4 · YouCam AI Skin Analysis API · Claude (catalog tagging) · MediaPipe Tasks Vision (in-browser face framing) · Vitest.

YouCam flow (server-side only, [`src/lib/youcam.ts`](src/lib/youcam.ts)): `POST /s2s/v2.0/file` → `PUT` to the pre-signed URL → `POST /s2s/v2.1/task/skin-analysis` → poll the task until `success`.

## Run locally

```bash
npm install          # also copies the MediaPipe WASM runtime into public/
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

| Variable | Needed for |
|---|---|
| `YOUCAM_API_KEY` | Real skin scans. Without it the app uses a built-in sample scan. |
| `ANTHROPIC_API_KEY` | AI catalog tagging on `/onboard`. Without it, keyword rules are used. |

The demo dashboard needs no database: it shows 240 simulated shoppers (each run through the real routine engine) plus real scans made in your browser.

## Tests

```bash
npm test             # 33 unit tests: routine engine, YouCam parsing, insights, simulator, taggers, CSV import
```

The UI was also tested end to end over the Chrome DevTools Protocol (45 checks across every page, desktop and mobile).

## License

[MIT](LICENSE). Cosmetic guidance only, not medical advice. The demo store "Dewdrop Apothecary" is fictional.
