import { create } from 'zustand';
import { CoffeeCupVariant } from '../types';
import { supabase } from '../utils/supabase';

// ── Bundled fallback SVGs ────────────────────────────────────────────────────
//
// Each string is a fully self-contained `<svg viewBox="0 0 180 180" …>` so it
// renders identically to a server-uploaded asset from the `coffee-cups`
// Storage bucket. Steam is NOT inside the SVG — the CoffeeCup wrapper renders
// it client-side, gated on `variant.supportsSteam`.

const CLASSIC_SVG = `<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" fill="none">
  <defs>
    <linearGradient id="cupGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4a3828"/>
      <stop offset="100%" stop-color="#2a1e14"/>
    </linearGradient>
    <linearGradient id="coffeeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7d5030"/>
      <stop offset="100%" stop-color="#4a2e18"/>
    </linearGradient>
  </defs>
  <path d="M62 72 L68 128 Q68 134 74 134 L106 134 Q112 134 112 128 L118 72 Z" fill="url(#cupGrad)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <path d="M65 82 L67 128 Q67 132 73 132 L107 132 Q113 132 113 128 L115 82 Z" fill="url(#coffeeGrad)"/>
  <ellipse cx="90" cy="83" rx="25" ry="5" fill="#9a6840" opacity="0.7"/>
  <circle cx="80" cy="83.5" r="3" fill="#b07848" opacity="0.4"/>
  <circle cx="93" cy="81.5" r="2.2" fill="#b07848" opacity="0.35"/>
  <circle cx="102" cy="84" r="2.5" fill="#b07848" opacity="0.35"/>
  <circle cx="87" cy="86" r="1.5" fill="#c08858" opacity="0.3"/>
  <path d="M60 72 Q90 79 120 72" stroke="rgba(255,255,255,0.12)" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M112 88 Q132 88 132 102 Q132 116 112 116" stroke="rgba(255,255,255,0.08)" stroke-width="5.5" stroke-linecap="round" fill="none"/>
  <path d="M112 88 Q128 88 128 102 Q128 116 112 116" stroke="#3d2c1e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <ellipse cx="90" cy="137" rx="30" ry="4.5" fill="#2e2018" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
  <ellipse cx="90" cy="139.5" rx="37" ry="5" fill="#261a10" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
  <path d="M72 82 Q70 96 71 112" stroke="rgba(255,255,255,0.07)" stroke-width="4" stroke-linecap="round" fill="none"/>
</svg>`;

const LATTE_SVG = `<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" fill="none">
  <defs>
    <linearGradient id="latteGlass" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.04)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.18)"/>
    </linearGradient>
    <linearGradient id="latteEspresso" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#5a3520"/>
      <stop offset="100%" stop-color="#2e1a0e"/>
    </linearGradient>
    <linearGradient id="latteMilk" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#e8d4b8"/>
      <stop offset="100%" stop-color="#c8a883"/>
    </linearGradient>
    <linearGradient id="latteFoam" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fcf2dc"/>
      <stop offset="100%" stop-color="#e8d4b8"/>
    </linearGradient>
  </defs>
  <ellipse cx="90" cy="146" rx="32" ry="3.5" fill="#1a1410" opacity="0.6"/>
  <ellipse cx="90" cy="144" rx="28" ry="3" fill="#2a1e14"/>
  <path d="M70 60 L72 138 Q72 142 76 142 L104 142 Q108 142 108 138 L110 60 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
  <path d="M72 92 L73 138 Q73 140 76 140 L104 140 Q107 140 107 138 L108 92 Z" fill="url(#latteEspresso)"/>
  <path d="M71 72 L72 92 L108 92 L109 72 Z" fill="url(#latteMilk)"/>
  <path d="M70.5 62 L71 72 L109 72 L109.5 62 Z" fill="url(#latteFoam)"/>
  <ellipse cx="80" cy="62" rx="6" ry="3" fill="#fff7e0" opacity="0.95"/>
  <ellipse cx="92" cy="60" rx="7" ry="3.5" fill="#fff7e0" opacity="0.95"/>
  <ellipse cx="103" cy="62" rx="5" ry="2.8" fill="#fff7e0" opacity="0.9"/>
  <path d="M75 76 Q73 100 75 130" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M105 76 Q107 105 104 130" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <path d="M70 60 L72 138 Q72 142 76 142 L104 142 Q108 142 108 138 L110 60 Z" fill="url(#latteGlass)" opacity="0.5"/>
</svg>`;

const CAPPUCCINO_SVG = `<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" fill="none">
  <defs>
    <linearGradient id="cappCup" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f5f0e6"/>
      <stop offset="100%" stop-color="#cfc4b0"/>
    </linearGradient>
    <linearGradient id="cappFoam" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fbeed4"/>
      <stop offset="100%" stop-color="#d8b88a"/>
    </linearGradient>
  </defs>
  <ellipse cx="90" cy="140" rx="44" ry="5" fill="#e8e0d0" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>
  <ellipse cx="90" cy="142.5" rx="40" ry="3.5" fill="#cfc4b0"/>
  <path d="M48 88 L54 130 Q54 136 60 136 L120 136 Q126 136 126 130 L132 88 Z" fill="url(#cappCup)" stroke="rgba(0,0,0,0.12)" stroke-width="0.8"/>
  <ellipse cx="90" cy="89" rx="42" ry="6.5" fill="url(#cappFoam)"/>
  <ellipse cx="90" cy="88" rx="40" ry="5" fill="#fff5dc" opacity="0.55"/>
  <path d="M90 95 C 86 90, 80 90, 80 86 C 80 82, 84 80, 87 82 C 88.5 83, 90 85, 90 86 C 90 85, 91.5 83, 93 82 C 96 80, 100 82, 100 86 C 100 90, 94 90, 90 95 Z" fill="#9a6840" opacity="0.85"/>
  <path d="M90 94 C 87 90, 82 90, 82 87 C 82 84, 85 83, 87 84.5" stroke="#7d5030" stroke-width="0.5" fill="none" opacity="0.4"/>
  <path d="M126 100 Q146 100 146 114 Q146 128 126 128" stroke="rgba(0,0,0,0.18)" stroke-width="6.5" stroke-linecap="round" fill="none"/>
  <path d="M126 100 Q142 100 142 114 Q142 128 126 128" stroke="#cfc4b0" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M56 96 Q54 114 60 130" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M122 96 Q124 116 118 132" stroke="rgba(0,0,0,0.12)" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`;

const ESPRESSO_SVG = `<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" fill="none">
  <defs>
    <linearGradient id="espCup" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fafafa"/>
      <stop offset="100%" stop-color="#dcdcdc"/>
    </linearGradient>
    <linearGradient id="espCrema" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c89870"/>
      <stop offset="100%" stop-color="#8a5a35"/>
    </linearGradient>
  </defs>
  <ellipse cx="90" cy="135" rx="28" ry="3.5" fill="#e8e0d0" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>
  <ellipse cx="90" cy="137" rx="24" ry="2.5" fill="#cfc4b0"/>
  <path d="M72 92 L76 126 Q76 130 80 130 L100 130 Q104 130 104 126 L108 92 Z" fill="url(#espCup)" stroke="rgba(0,0,0,0.15)" stroke-width="0.8"/>
  <ellipse cx="90" cy="93" rx="17" ry="3.5" fill="url(#espCrema)"/>
  <ellipse cx="90" cy="92.5" rx="15" ry="2.5" fill="#7d5030" opacity="0.85"/>
  <circle cx="84" cy="93" r="1.2" fill="#d4a070" opacity="0.6"/>
  <circle cx="92" cy="92" r="0.9" fill="#d4a070" opacity="0.55"/>
  <circle cx="97" cy="93" r="1" fill="#d4a070" opacity="0.5"/>
  <ellipse cx="90" cy="91.5" rx="18" ry="2.8" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="0.8"/>
  <path d="M104 100 Q116 100 116 110 Q116 120 104 120" stroke="rgba(0,0,0,0.18)" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <path d="M104 100 Q113 100 113 110 Q113 120 104 120" stroke="#dcdcdc" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M78 100 Q76 113 79 124" stroke="rgba(255,255,255,0.6)" stroke-width="1.4" stroke-linecap="round" fill="none"/>
</svg>`;

const COLD_BREW_SVG = `<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" fill="none">
  <defs>
    <linearGradient id="cbGlass" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.22)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.05)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.20)"/>
    </linearGradient>
    <linearGradient id="cbCoffee" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3a2310"/>
      <stop offset="100%" stop-color="#1a0e06"/>
    </linearGradient>
    <linearGradient id="cbIce" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(220,235,250,0.85)"/>
      <stop offset="100%" stop-color="rgba(160,200,235,0.55)"/>
    </linearGradient>
  </defs>
  <ellipse cx="90" cy="146" rx="32" ry="3" fill="#1a1410" opacity="0.55"/>
  <path d="M68 60 L70 140 Q70 144 74 144 L106 144 Q110 144 110 140 L112 60 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
  <path d="M70 78 L71 140 Q71 142 74 142 L106 142 Q109 142 109 140 L110 78 Z" fill="url(#cbCoffee)"/>
  <ellipse cx="90" cy="78" rx="20" ry="2.5" fill="#5a3520" opacity="0.85"/>
  <g opacity="0.95">
    <rect x="74" y="86" width="16" height="14" rx="2.5" fill="url(#cbIce)" stroke="rgba(255,255,255,0.5)" stroke-width="0.6"/>
    <line x1="76" y1="89" x2="83" y2="89" stroke="rgba(255,255,255,0.7)" stroke-width="0.7" stroke-linecap="round"/>
    <rect x="92" y="92" width="14" height="13" rx="2.5" fill="url(#cbIce)" stroke="rgba(255,255,255,0.5)" stroke-width="0.6"/>
    <line x1="94" y1="95" x2="100" y2="95" stroke="rgba(255,255,255,0.7)" stroke-width="0.7" stroke-linecap="round"/>
    <rect x="80" y="106" width="15" height="13" rx="2.5" fill="url(#cbIce)" stroke="rgba(255,255,255,0.5)" stroke-width="0.6"/>
    <line x1="82" y1="109" x2="88" y2="109" stroke="rgba(255,255,255,0.7)" stroke-width="0.7" stroke-linecap="round"/>
  </g>
  <path d="M73 82 Q71 110 73 138" stroke="rgba(255,255,255,0.32)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M107 82 Q109 110 106 138" stroke="rgba(0,0,0,0.18)" stroke-width="1.3" stroke-linecap="round" fill="none"/>
  <circle cx="76" cy="118" r="1" fill="rgba(220,240,255,0.5)"/>
  <circle cx="78" cy="128" r="0.8" fill="rgba(220,240,255,0.45)"/>
  <circle cx="105" cy="122" r="0.9" fill="rgba(220,240,255,0.5)"/>
  <circle cx="103" cy="132" r="0.7" fill="rgba(220,240,255,0.4)"/>
</svg>`;

const MATCHA_SVG = `<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" fill="none">
  <defs>
    <linearGradient id="matchaBowl" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a8c4b0"/>
      <stop offset="100%" stop-color="#5e7a68"/>
    </linearGradient>
    <radialGradient id="matchaSurface" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#a8d855"/>
      <stop offset="60%" stop-color="#7eb33a"/>
      <stop offset="100%" stop-color="#4a7825"/>
    </radialGradient>
    <linearGradient id="matchaFoam" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d8eba0"/>
      <stop offset="100%" stop-color="#b5d572"/>
    </linearGradient>
  </defs>
  <ellipse cx="90" cy="140" rx="40" ry="3" fill="#000" opacity="0.32"/>
  <path d="M50 92 Q50 140 90 140 Q130 140 130 92 Z" fill="url(#matchaBowl)" stroke="rgba(0,0,0,0.18)" stroke-width="0.8"/>
  <path d="M52 92 Q52 138 90 138 Q128 138 128 92" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1.2"/>
  <ellipse cx="90" cy="92" rx="40" ry="6" fill="url(#matchaSurface)"/>
  <ellipse cx="90" cy="91.5" rx="38" ry="5" fill="none" stroke="url(#matchaFoam)" stroke-width="2.2" opacity="0.85"/>
  <circle cx="76" cy="91" r="1.4" fill="#e0f0a8" opacity="0.85"/>
  <circle cx="84" cy="89" r="1" fill="#e0f0a8" opacity="0.7"/>
  <circle cx="95" cy="91" r="1.2" fill="#e0f0a8" opacity="0.8"/>
  <circle cx="103" cy="90" r="1" fill="#e0f0a8" opacity="0.7"/>
  <circle cx="89" cy="93" r="0.8" fill="#f0fad0" opacity="0.6"/>
  <ellipse cx="90" cy="89" rx="40" ry="3" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
  <path d="M58 100 Q56 118 64 134" stroke="rgba(255,255,255,0.2)" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M122 100 Q124 118 116 134" stroke="rgba(0,0,0,0.18)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
</svg>`;

interface BundledEntry {
  variant: CoffeeCupVariant;
  svg: string;
}

const BUNDLED_VARIANTS: BundledEntry[] = [
  {
    variant: { id: 'classic',    label: 'Classic',    subtitle: 'The original brew', svgUrl: '', supportsSteam: true,  sortOrder: 0, isPremium: false, updatedAt: 0 },
    svg: CLASSIC_SVG,
  },
  {
    variant: { id: 'latte',      label: 'Latte',      subtitle: 'Layered & creamy',  svgUrl: '', supportsSteam: true,  sortOrder: 1, isPremium: false, updatedAt: 0 },
    svg: LATTE_SVG,
  },
  {
    variant: { id: 'cappuccino', label: 'Cappuccino', subtitle: 'Foam-art heart',    svgUrl: '', supportsSteam: true,  sortOrder: 2, isPremium: false, updatedAt: 0 },
    svg: CAPPUCCINO_SVG,
  },
  {
    variant: { id: 'espresso',   label: 'Espresso',   subtitle: 'Short & strong',    svgUrl: '', supportsSteam: true,  sortOrder: 3, isPremium: false, updatedAt: 0 },
    svg: ESPRESSO_SVG,
  },
  {
    variant: { id: 'cold-brew',  label: 'Cold Brew',  subtitle: 'On the rocks',      svgUrl: '', supportsSteam: false, sortOrder: 4, isPremium: false, updatedAt: 0 },
    svg: COLD_BREW_SVG,
  },
  {
    variant: { id: 'matcha',     label: 'Matcha',     subtitle: 'Whisked & green',   svgUrl: '', supportsSteam: false, sortOrder: 5, isPremium: false, updatedAt: 0 },
    svg: MATCHA_SVG,
  },
];

const BUNDLED_BY_ID: Map<string, BundledEntry> = new Map(
  BUNDLED_VARIANTS.map((b) => [b.variant.id, b]),
);

const BUNDLED_LIST: CoffeeCupVariant[] = BUNDLED_VARIANTS.map((b) => b.variant);

/** Synchronous lookup for the bundled SVG of a default variant id. */
export function getBundledSvg(id: string): string | null {
  return BUNDLED_BY_ID.get(id)?.svg ?? null;
}

// ── Cache (localStorage, keyed by id + updated_at) ───────────────────────────

const CACHE_PREFIX = 'cup-svg';

function cacheKey(id: string, updatedAtMs: number): string {
  return `${CACHE_PREFIX}:${id}:${updatedAtMs}`;
}

function readCache(id: string, updatedAtMs: number): string | null {
  try {
    return localStorage.getItem(cacheKey(id, updatedAtMs));
  } catch {
    return null;
  }
}

function writeCache(id: string, updatedAtMs: number, svg: string): void {
  try {
    // Drop any older cached versions for this id so the cache doesn't grow
    // forever as variants are republished.
    const stalePrefix = `${CACHE_PREFIX}:${id}:`;
    const fresh = cacheKey(id, updatedAtMs);
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(stalePrefix) && k !== fresh) stale.push(k);
    }
    for (const k of stale) localStorage.removeItem(k);
    localStorage.setItem(fresh, svg);
  } catch {
    // QuotaExceededError or storage disabled — silently ignore; the catalog
    // still works, just without local caching of the SVG payload.
  }
}

// ── Row mapper ────────────────────────────────────────────────────────────────

interface CoffeeCupRow {
  id: string;
  label: string;
  subtitle: string;
  svg_url: string;
  supports_steam: boolean;
  sort_order: number;
  is_premium: boolean;
  updated_at: string | null;
}

function rowToVariant(row: CoffeeCupRow): CoffeeCupVariant {
  return {
    id: row.id,
    label: row.label,
    subtitle: row.subtitle,
    svgUrl: row.svg_url,
    supportsSteam: row.supports_steam,
    sortOrder: row.sort_order,
    isPremium: row.is_premium,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
  };
}

// ── Store ────────────────────────────────────────────────────────────────────

interface CatalogStore {
  catalog: CoffeeCupVariant[];
  /** True after the first load attempt has completed (regardless of success). */
  isLoaded: boolean;
  isLoading: boolean;
  /** True when the current `catalog` came from the bundled fallback. */
  isFromFallback: boolean;
  loadCatalog: () => Promise<void>;
  /**
   * Returns the raw SVG string for a variant id. Resolution order:
   *   in-memory cache → localStorage → network (svg_url) → bundled fallback.
   * Returns null only when the id is unknown AND not bundled.
   */
  getSvgFor: (id: string) => Promise<string | null>;
}

// In-memory SVG payload cache so 6 concurrent picker tiles don't each hit
// localStorage / the network.
const memSvgCache = new Map<string, string>();

export const useCoffeeCupCatalogStore = create<CatalogStore>((set, get) => ({
  catalog: BUNDLED_LIST,
  isLoaded: false,
  isLoading: false,
  isFromFallback: true,

  loadCatalog: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('coffee_cup_variants')
        .select('id, label, subtitle, svg_url, supports_steam, sort_order, is_premium, updated_at')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as CoffeeCupRow[];
      if (rows.length === 0) {
        set({ catalog: BUNDLED_LIST, isLoaded: true, isLoading: false, isFromFallback: true });
        return;
      }

      const variants = rows.map(rowToVariant);
      set({ catalog: variants, isLoaded: true, isLoading: false, isFromFallback: false });
    } catch (e) {
      console.warn('Failed to load coffee cup catalog:', e);
      set({ catalog: BUNDLED_LIST, isLoaded: true, isLoading: false, isFromFallback: true });
    }
  },

  getSvgFor: async (id: string) => {
    // 1) In-memory cache.
    const mem = memSvgCache.get(id);
    if (mem) return mem;

    const variant = get().catalog.find((v) => v.id === id);

    // 2) localStorage cache — only meaningful when we have a real updatedAt.
    if (variant && variant.updatedAt > 0) {
      const cached = readCache(id, variant.updatedAt);
      if (cached) {
        memSvgCache.set(id, cached);
        return cached;
      }
    }

    // 3) Network — only when the catalog row has a real URL + updatedAt.
    if (variant?.svgUrl && variant.updatedAt > 0) {
      try {
        const res = await fetch(variant.svgUrl);
        if (res.ok) {
          const svg = await res.text();
          memSvgCache.set(id, svg);
          writeCache(id, variant.updatedAt, svg);
          return svg;
        }
      } catch (e) {
        console.warn(`Failed to fetch SVG for variant "${id}":`, e);
      }
    }

    // 4) Bundled fallback.
    const bundled = BUNDLED_BY_ID.get(id);
    if (bundled) {
      memSvgCache.set(id, bundled.svg);
      return bundled.svg;
    }

    return null;
  },
}));
