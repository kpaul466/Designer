/**
 * Bundled West Bengal place dataset — offline search index + map markers.
 *
 * Source: `src/data/westbengal_geo_data.json` (~34 MB GeoHarvester “places v3”
 * database, harvested from OpenStreetMap). It holds ~29.7k cleaned records:
 * name, category/sub-type, verified lat/lng, street/city/address and contact
 * info for the whole of West Bengal.
 *
 * The asset is exposed to Vite with a `?url` import, so it is fetched lazily
 * (never inlined into the JS bundle) and stays available offline through the
 * service worker cache after the first load. The single in-memory index built
 * from it feeds BOTH:
 *  - place search (`searchWbGeoPlaces` → `locationService.searchLocations`), and
 *  - the “WB geo places” marker layer in `MapUnderlay.tsx`
 *    (`selectPlacesForMapExtent`).
 */

import type { GeoOrigin } from './locationService';
import { GeoLocation } from '../types/electrical';
import wbGeoDataUrl from '../data/westbengal_geo_data.json?url';

export interface WbGeoPlace {
  id: string;
  name: string;
  /** Pre-lowercased name (avoids re-normalizing per keystroke). */
  nameLow: string;
  category: string;
  subType: string;
  lat: number;
  lng: number;
  address: string;
  streetName: string;
  areaName: string;
  district: string;
  city: string;
  phone: string;
  website: string;
  /** Lowercased combined search text (name first, then location context). */
  hay: string;
}

interface RawPlaceRow {
  id?: string;
  name?: string;
  category?: string;
  sub_type?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  street_name?: string;
  area_name?: string;
  district?: string;
  city?: string;
  postal_code?: string;
  phones?: string[];
  website?: string;
}

interface PlacesPayload {
  tables?: {
    places?: {
      rows?: RawPlaceRow[];
    };
  };
}

let loadPromise: Promise<WbGeoPlace[] | null> | null = null;
let loadedPlaces: WbGeoPlace[] | null = null;
let haveWarned = false;
let searchCache = new Map<string, GeoLocation[]>();

/** Where the in-memory index came from (shown in the UI footer). */
export type WbGeoPlacesSource = 'indexeddb' | 'network' | null;
let datasetSource: WbGeoPlacesSource = null;

export function getWbGeoPlacesSource(): WbGeoPlacesSource {
  return datasetSource;
}

/* ------------------------------------------------------------------ */
/* IndexedDB persistence                                               */
/* ------------------------------------------------------------------ */

/**
 * The 34 MB JSON is parsed once and the compact index (name, category,
 * coordinates, pre-lowercased haystacks) is kept in IndexedDB. After the first
 * visit the database opens straight from IndexedDB — no network request, no
 * JSON parsing — so search answers instantly on every subsequent page load
 * and works with zero connectivity.
 */
const IDB_NAME = 'powerline-designer-db';
const IDB_STORE = 'wb-geo-places';
const IDB_KEY = 'places';
/** Bump when the source dataset or the index shape changes. */
const DATASET_CACHE_VERSION = 1;

interface StoredPlacesRecord {
  version: number;
  count: number;
  savedAt: string;
  places: WbGeoPlace[];
}

function openPlacesDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readStoredPlaces(): Promise<WbGeoPlace[] | null> {
  const db = await openPlacesDb();
  if (!db) return null;
  try {
    const record = await new Promise<StoredPlacesRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const request = tx.objectStore(IDB_STORE).get(IDB_KEY);
      request.onsuccess = () => resolve(request.result as StoredPlacesRecord | undefined);
      request.onerror = () => reject(request.error);
    });
    if (
      !record ||
      record.version !== DATASET_CACHE_VERSION ||
      !Array.isArray(record.places) ||
      record.places.length === 0
    ) {
      return null;
    }
    return record.places;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

async function writeStoredPlaces(places: WbGeoPlace[]): Promise<void> {
  const db = await openPlacesDb();
  if (!db) return;
  try {
    const record: StoredPlacesRecord = {
      version: DATASET_CACHE_VERSION,
      count: places.length,
      savedAt: new Date().toISOString(),
      places,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(record, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (error) {
    // Private mode / quota — search still works from memory this session.
    console.warn('Could not cache the West Bengal dataset in IndexedDB:', error);
  } finally {
    db.close();
  }
}

/**
 * Starts loading the dataset in the background (safe to call repeatedly — a
 * single shared load is reused by search and the map marker layer). Called on
 * app startup so the IndexedDB copy is read/written as soon as the page opens.
 */
export function prefetchWbGeoPlaces(): void {
  void loadWbGeoPlaces();
}

/** Currently loaded compact index (null until the asset has been fetched). */
export function getLoadedWbGeoPlaces(): WbGeoPlace[] | null {
  return loadedPlaces;
}

/** Number of searchable records once the dataset is loaded (null if missing). */
export function getWbGeoPlacesMeta(): Promise<{ count: number; source: WbGeoPlacesSource } | null> {
  return loadWbGeoPlaces().then((places) =>
    places ? { count: places.length, source: datasetSource } : null
  );
}

/**
 * Loads + indexes the dataset once. Never throws; null means "unavailable".
 * Order of preference:
 *   1. IndexedDB (instant, offline, no parsing) — populated on first visit.
 *   2. The bundled JSON asset (network/service-worker cache), then the index
 *      is written to IndexedDB for the next page load.
 */
export function loadWbGeoPlaces(): Promise<WbGeoPlace[] | null> {
  if (!loadPromise) {
    loadPromise = (async () => {
      // 1. Local IndexedDB copy — this is the search database itself.
      const stored = await readStoredPlaces();
      if (stored) {
        loadedPlaces = stored;
        datasetSource = 'indexeddb';
        searchCache = new Map();
        return stored;
      }

      // 2. First visit (or dataset version bump): fetch + index once, then
      //    persist the compact index so future page loads stay offline.
      try {
        // `no-cache` keeps the one download fresh; the service worker and this
        // IndexedDB copy keep it available offline afterwards.
        const response = await fetch(wbGeoDataUrl, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as PlacesPayload;
        const rows = payload?.tables?.places?.rows ?? [];
        if (!rows.length) {
          loadPromise = null;
          return null;
        }
        loadedPlaces = buildIndex(rows);
        datasetSource = 'network';
        // Persist for the next page load; never block the first search on it.
        window.setTimeout(() => {
          if (loadedPlaces) void writeStoredPlaces(loadedPlaces);
        }, 1500);
        return loadedPlaces;
      } catch (error) {
        // Network hiccup — allow a later retry instead of failing forever.
        loadPromise = null;
        if (!haveWarned) {
          haveWarned = true;
          console.warn(
            `West Bengal place dataset unavailable (${
              error instanceof Error ? error.message : 'load failed'
            }). Online geocoding will still be used.`
          );
        }
        return null;
      }
    })();
  }
  return loadPromise;
}

function buildIndex(rows: RawPlaceRow[]): WbGeoPlace[] {
  const seen = new Set<string>();
  const places: WbGeoPlace[] = [];

  for (const row of rows) {
    const name = (row.name || '').trim();
    if (!name) continue;

    const lat = row.latitude;
    const lng = row.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const category = (row.category || '').trim();
    const subType = (row.sub_type || '').trim();
    const city = (row.city || '').trim();
    const district = (row.district || '').trim();
    if (district.toLowerCase() === 'west bengal') continue; // non-informative label
    const areaName = (row.area_name || '').trim();
    const streetName = (row.street_name || '').trim();
    const address = (row.address || '').trim();
    const phone = row.phones && row.phones.length ? row.phones[0].trim() : '';
    const website = (row.website || '').trim();

    // Identical POIs frequently repeat across ways/nodes with the same point.
    const key = `${name.toLocaleLowerCase()}@${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const nameLow = name.toLocaleLowerCase();
    const hay = `${nameLow} ${city.toLocaleLowerCase()} ${areaName.toLocaleLowerCase()} ${streetName.toLocaleLowerCase()} ${subType.toLocaleLowerCase()}`;

    // Raw harvest ids repeat across rows — guarantee uniqueness so consumers
    // can key features/diffs by id.
    let placeId = row.id || key;
    if (seen.has(`id:${placeId}`)) placeId = `${key}#${places.length}`;
    seen.add(`id:${placeId}`);

    places.push({
      id: placeId,
      name,
      nameLow,
      category,
      subType,
      lat,
      lng,
      address,
      streetName,
      areaName,
      district,
      city,
      phone,
      website,
      hay,
    });
  }

  searchCache = new Map();
  return places;
}

/* ------------------------------------------------------------------ */
/* Search with tiered scoring                                          */
/* ------------------------------------------------------------------ */

/**
 * Tokenized, multi-field search over the offline dataset.
 * Rank tiers (descending): exact name → name prefix → word-boundary prefix in
 * name → name substring → all query words in name → sub-type phrase
 * («railway», «hospital», «temple»…) → mixed name/context → context only.
 * Nearby matches get a bonus when `origin` is supplied; habitations (villages,
 * towns) rank above same-named shops/streets; shorter names break ties.
 */
export async function searchWbGeoPlaces(
  query: string,
  limit = 8,
  origin?: GeoOrigin
): Promise<GeoLocation[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const cacheKey = `${limit}|${origin ? `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}` : '-' }|${clean.toLocaleLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const places = await loadWbGeoPlaces();
  if (!places) return [];

  const needle = clean.toLocaleLowerCase();
  const tokens = needle.split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) return [];

  interface Hit {
    place: WbGeoPlace;
    score: number;
  }
  const hits: Hit[] = [];

  for (const place of places) {
    // Fast bail: the first token must occur somewhere in the haystack.
    if (!place.hay.includes(tokens[0])) continue;

    let allTokensPresent = true;
    let nameTokens = 0;
    let nameHit = true;
    for (const token of tokens) {
      const inHay = place.hay.includes(token);
      if (!inHay) {
        allTokensPresent = false;
        break;
      }
      if (place.nameLow.includes(token)) {
        nameTokens += 1;
      } else {
        nameHit = false;
      }
    }
    if (!allTokensPresent) continue;

    let score: number;
    if (nameHit && allTokensInNameWordStart(place, tokens)) score = 92;
    else if (nameHit) score = 78;
    else if (nameTokens > 0) score = 45;
    else if (place.subType.toLocaleLowerCase().includes(needle) || tokensInOrder(place.subType.toLocaleLowerCase(), tokens)) score = 55;
    else score = 28;

    // Exact and full-prefix beats everything tiered above.
    if (place.nameLow === needle) score = 120;
    else if (place.nameLow.startsWith(needle)) score = 100;
    else if (place.nameLow.includes(needle)) score = Math.max(score, 88);

    if (origin) {
      const distance = distanceDegrees(place.lat, place.lng, origin);
      if (distance < 0.5) score += (1 - distance / 0.5) * 20;
    }
    if (place.category === 'locality') score += 7; // habitations usually "the place" searched
    else if (place.category === 'transportation') score += 2;
    score -= Math.min(place.nameLow.length, 60) / 150; // shorter names slightly first

    hits.push({ place, score });
  }

  hits.sort((a, b) => b.score - a.score);

  const results: GeoLocation[] = [];
  const seen = new Set<string>();
  for (const { place } of hits) {
    const key = `${place.nameLow}@${place.lat.toFixed(3)},${place.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(placeToGeoLocation(place));
    if (results.length >= limit) break;
  }

  searchCache.set(cacheKey, results);
  if (searchCache.size > 120) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  return results;
}

function allTokensInNameWordStart(place: WbGeoPlace, tokens: string[]): boolean {
  return tokens.every((token) => place.nameLow.startsWith(token) || place.nameLow.includes(` ${token}`));
}

/** True when the tokens appear in order separated by single spaces anywhere. */
function tokensInOrder(hay: string, tokens: string[]): boolean {
  return hay.includes(tokens.join(' '));
}

/** Rough angular distance in degrees; good enough for ranking only. */
function distanceDegrees(lat: number, lng: number, origin: GeoOrigin): number {
  const dx = lat - origin.lat;
  const dy = (lng - origin.lng) * Math.cos((origin.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/* ------------------------------------------------------------------ */
/* GeoLocation mapping                                                 */
/* ------------------------------------------------------------------ */

function wbGeoCategoryLabel(category: string): string {
  switch (category) {
    case 'locality':
      return 'Village / Locality';
    case 'street':
      return 'Street';
    case 'building':
      return 'Building';
    case 'business':
      return 'Business & Shop';
    case 'healthcare':
      return 'Healthcare';
    case 'worship':
      return 'Place of Worship';
    case 'parks_nature':
      return 'Park / Nature';
    case 'food_dining':
      return 'Food & Dining';
    case 'transportation':
      return 'Transport';
    case 'banking_finance':
      return 'Bank / ATM';
    case 'hospitality':
      return 'Hotel / Stay';
    case 'government':
      return 'Government';
    case 'education':
      return 'Education';
    case 'emergency_security':
      return 'Emergency Security';
    case 'culture_heritage':
      return 'Museum / Heritage';
    case 'agriculture_markets':
      return 'Market / Haat';
    case 'sports_recreation':
      return 'Sports';
    case 'utilities_civic':
      return 'Utility / Civic';
    default:
      return 'Place';
  }
}

/** Generic street label most harvester rows carry — noise in descriptions. */
export function isGenericStreetName(name: string): boolean {
  return name.toLocaleLowerCase() === 'main road';
}

function wbGeoContext(place: WbGeoPlace): string {
  const primary = place.city || place.areaName;
  if (primary) return ` · ${primary}`;
  if (place.streetName && !isGenericStreetName(place.streetName)) return ` · ${place.streetName}`;
  return '';
}

function description(place: WbGeoPlace): string {
  const label = place.subType && place.subType !== wbGeoCategoryLabel(place.category)
    ? `${place.subType}`
    : wbGeoCategoryLabel(place.category);
  return `${label}${wbGeoContext(place)} · West Bengal (offline dataset)`;
}

function mapCategory(category: string, subType: string): GeoLocation['category'] {
  if (category === 'locality') return 'town';
  if (category === 'utilities_civic') return 'substation';
  if (subType.toLowerCase().includes('bridge')) return 'crossing';
  if (category && category !== 'street') return 'landmark';
  return 'general';
}

/** Public converter — also reused by the map popup ("Place Canvas Here"). */
export function placeToGeoLocation(place: WbGeoPlace): GeoLocation {
  return {
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    district: place.district || undefined,
    state: 'West Bengal',
    description: description(place),
    category: mapCategory(place.category, place.subType),
  };
}

/** Marker dot colour per category in the map layer legend. */
export function wbGeoCategoryColor(category: string): string {
  switch (category) {
    case 'locality':
      return '#e11d48';
    case 'street':
      return '#d97706';
    case 'building':
      return '#64748b';
    case 'business':
      return '#7c3aed';
    case 'healthcare':
      return '#0d9488';
    case 'worship':
      return '#b45309';
    case 'parks_nature':
      return '#16a34a';
    case 'food_dining':
      return '#ea580c';
    case 'transportation':
      return '#0891b2';
    case 'banking_finance':
      return '#4f46e5';
    case 'hospitality':
      return '#db2777';
    case 'government':
      return '#475569';
    case 'education':
      return '#0369a1';
    case 'emergency_security':
      return '#991b1b';
    case 'culture_heritage':
      return '#92400e';
    case 'agriculture_markets':
      return '#65a30d';
    case 'sports_recreation':
      return '#0284c7';
    case 'utilities_civic':
      return '#71717a';
    default:
      return '#475569';
  }
}

/** Marker dot radius in map units (before screen scaling). */
export function wbGeoCategoryRadius(category: string): number {
  switch (category) {
    case 'locality':
      return 6.5;
    case 'transportation':
    case 'healthcare':
    case 'worship':
    case 'education':
    case 'government':
    case 'emergency_security':
    case 'parks_nature':
    case 'culture_heritage':
    case 'agriculture_markets':
      return 5.4;
    case 'banking_finance':
    case 'hospitality':
    case 'sports_recreation':
      return 4.8;
    case 'business':
    case 'food_dining':
      return 4.4;
    case 'street':
    case 'building':
    case 'utilities_civic':
      return 3.8;
    default:
      return 4.6;
  }
}

/* ------------------------------------------------------------------ */
/* Map marker selection                                                */
/* ------------------------------------------------------------------ */

/**
 * Places displayed per view extent at once. The marker cap keeps OpenLayers'
 * decluttering fast; budgets stop street/business spam from out-shouting
 * habitations and landmarks.
 */
const MAX_TOTAL_MARKERS = 480;

/** View-independent display priority for marker selection (smaller = first). */
const MAP_CATEGORY_ORDER: Record<string, number> = {
  locality: 0,
  transportation: 1,
  healthcare: 2,
  worship: 3,
  education: 4,
  government: 5,
  parks_nature: 6,
  banking_finance: 7,
  emergency_security: 8,
  culture_heritage: 9,
  hospitality: 10,
  agriculture_markets: 11,
  sports_recreation: 12,
  utilities_civic: 13,
  food_dining: 14,
  business: 15,
  building: 16,
  street: 17,
};

const MAP_CATEGORY_BUDGETS: Record<string, number> = {
  street: 130,
  business: 80,
  building: 80,
  food_dining: 45,
  banking_finance: 45,
  hospitality: 30,
};

/**
 * Selects the markers for a map view: everything inside the geographic extent,
 * capped per category budget so dense areas stay readable.
 *
 * Ordering is deliberately view-independent (category priority, then dataset
 * order) instead of distance-to-centre: panning the map no longer reshuffles
 * the included set, so only features crossing the extent edge are swapped in
 * and out and the declutter label layout stays visually stable.
 */
export function selectPlacesForMapExtent(
  places: WbGeoPlace[],
  extent: [number, number, number, number],
  maxMarkers = MAX_TOTAL_MARKERS
): WbGeoPlace[] {
  const [west, south, east, north] = extent;
  const pad = Math.max((east - west) * 0.05, 0.0005);
  const candidates: Array<{ place: WbGeoPlace; order: number; index: number }> = [];

  let index = 0;
  for (const place of places) {
    if (place.lng < west - pad || place.lng > east + pad) continue;
    if (place.lat < south - pad || place.lat > north + pad) continue;
    candidates.push({ place, order: MAP_CATEGORY_ORDER[place.category] ?? 99, index });
    index += 1;
  }

  candidates.sort((a, b) => a.order - b.order || a.index - b.index);

  const budgetUsed = new Map<string, number>();
  const chosen: WbGeoPlace[] = [];

  for (const { place } of candidates) {
    if (chosen.length >= maxMarkers) break;
    const budget = MAP_CATEGORY_BUDGETS[place.category];
    if (budget !== undefined) {
      const used = budgetUsed.get(place.category) ?? 0;
      if (used >= budget) continue;
      budgetUsed.set(place.category, used + 1);
    }
    chosen.push(place);
  }

  return chosen;
}
