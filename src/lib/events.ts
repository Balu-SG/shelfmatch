import type { ScanEvent } from "./insights";
import type { Product } from "./types";

// Anonymous scan events and imported catalogs, kept in this browser so the
// demo needs no database. Storage can be unavailable (private mode), so every
// access is guarded and the app works without it.

const EVENTS_KEY = "shelfmatch:events:v1";
const CATALOG_KEY = "shelfmatch:catalog:v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: the scan still works, it just isn't remembered
  }
}

export function loadEvents(): ScanEvent[] {
  return read<ScanEvent[]>(EVENTS_KEY, []);
}

/** Records a scan and returns its index so a later cart action can update it. */
export function recordScan(event: ScanEvent): number {
  const events = loadEvents();
  events.push({ ...event, live: true, ts: event.ts ?? Date.now() });
  write(EVENTS_KEY, events.slice(-200));
  return Math.min(events.length, 200) - 1;
}

export function markCarted(index: number, cartValue: number) {
  const events = loadEvents();
  if (!events[index]) return;
  events[index] = { ...events[index], addedToCart: true, cartValue };
  write(EVENTS_KEY, events);
}

export interface ImportedCatalog {
  source: string;
  importedAt: number;
  tagger: "claude" | "keywords";
  products: Product[];
}

export function loadCatalog(): ImportedCatalog | null {
  return read<ImportedCatalog | null>(CATALOG_KEY, null);
}

export function saveCatalog(catalog: ImportedCatalog) {
  write(CATALOG_KEY, catalog);
}

export function clearCatalog() {
  try {
    localStorage.removeItem(CATALOG_KEY);
  } catch {}
}
