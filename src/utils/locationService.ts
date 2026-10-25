import { GeoLocation } from '../types/electrical';
import { searchWbGeoPlaces as searchLocalPlaces, prefetchWbGeoPlaces as prefetchLocalPlaces } from './wbGeoPlaces';

type SearchCategory = GeoLocation['category'] | 'all';

/** Geographic point used to bias results toward the drawing's current area. */
export interface GeoOrigin {
  lat: number;
  lng: number;
}

/**
 * Public, key-free geocoding providers, tried in order.
 * - Nominatim is the canonical OSM geocoder, but it is aggressively rate-limited
 *   (max ~1 request/second) and is blocked by some corporate/privacy networks.
 * - Photon (Komoot) is a fast, CORS-enabled OSM geocoder that does not rate-limit
 *   browser clients as harshly. It acts as a transparent fallback so place search
 *   keeps working when Nominatim is unreachable, blocked, or throttled.
 */
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';

const REQUEST_TIMEOUT_MS = 12_000;
const RESULT_CACHE_TTL_MS = 5 * 60 * 1000;
const EMPTY_CACHE_TTL_MS = 60 * 1000;
const MIN_QUERY_LENGTH = 2;

interface CacheEntry {
  expiresAt: number;
  results: GeoLocation[];
}

/** Per-session memo so repeated keystrokes/backspaces don't hammer public APIs. */
const searchCache = new Map<string, CacheEntry>();

interface NominatimResult {
  name?: string;
  display_name?: string;
  lat: string;
  lon: string;
  address?: {
    state_district?: string;
    county?: string;
    state?: string;
    country?: string;
  };
  type?: string;
  class?: string;
}

interface PhotonFeature {
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

class GeocodeHttpError extends Error {
  status: number;

  constructor(status: number) {
    super(`Geocoding request failed (HTTP ${status}).`);
    this.name = 'GeocodeHttpError';
    this.status = status;
  }
}

/**
 * Search places, or parse a latitude/longitude pair.
 *
 * Result order:
 * 1. A `lat, lng` input is parsed locally and always works offline.
 * 2. The bundled West Bengal place dataset (`src/data/westbengal_geo_data.json`,
 *    ~29.7k verified places from OSM; see `utils/wbGeoPlaces.ts`) answers
 *    first — instant, even offline.
 * 3. Both online providers are then queried in parallel and their results merged:
 * - Nominatim excels at administrative/village-level names.
 * - Photon is far better at POIs — shop names, building names, schools, etc.
 *   (Nominatim free-form often returns zero results for small local POI names,
 *   so a first-provider-wins strategy hid Photon's hits.)
 *
 * When `origin` is supplied, all sources bias their ranking toward the
 * drawing's current area, so local village/shop/building names surface before
 * far-away same-named places. Results are cached in memory and short queries
 * are ignored so the public APIs are not rate-limited.
 */
export async function searchLocations(
  query: string,
  category: SearchCategory = 'all',
  limit = 20,
  origin?: GeoOrigin
): Promise<GeoLocation[]> {
  const clean = query.trim();
  if (!clean) return [];

  const gpsPoint = parseCoordinateQuery(clean);
  if (gpsPoint) return [gpsPoint];

  // One-character queries are noise and waste public API quota.
  if (clean.length < MIN_QUERY_LENGTH) return [];

  // Kick off the local asset load (no-op once loaded).
  prefetchLocalPlaces();

  // The origin shapes ranking, so it is part of the cache key. Rounded so a
  // slightly moving map center still reuses the cached result.
  const originKey = origin
    ? `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}`
    : 'none';
  const cacheKey = `${category}|${limit}|${originKey}|${clean.toLocaleLowerCase()}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  // Over-fetch when a category filter is active so filtering still yields matches.
  const requestLimit = category === 'all' ? limit : Math.min(Math.max(limit * 3, 20), 40);

  const settled = await Promise.allSettled([
    searchWithNominatim(clean, requestLimit, origin),
    searchWithPhoton(clean, requestLimit, origin),
    searchLocalPlaces(clean, limit, origin),
  ]);

  const onlineErrors = [settled[0], settled[1]]
    .filter((entry): entry is PromiseRejectedResult => entry.status === 'rejected')
    .map((entry) => entry.reason);
  const onlyOnlineFailed = onlineErrors.length === 2;

  const nominatimResults = settled[0].status === 'fulfilled' ? settled[0].value : [];
  const photonResults = settled[1].status === 'fulfilled' ? settled[1].value : [];
  const localResults = settled[2].status === 'fulfilled' ? settled[2].value : [];

  if (!localResults.length && !nominatimResults.length && !photonResults.length && onlyOnlineFailed) {
    throw toFriendlyError(onlineErrors[0]);
  }

  // Interleave so village-level (Nominatim) and POI-level (Photon) hits both
  // appear near the top instead of one source crowding out the other.
  const online: GeoLocation[] = [];
  for (let i = 0; i < Math.max(nominatimResults.length, photonResults.length); i += 1) {
    if (i < nominatimResults.length) online.push(nominatimResults[i]);
    if (i < photonResults.length) online.push(photonResults[i]);
  }

  // Local asset results lead (fastest + exact WB names), online results follow.
  const filtered = filterAndDedupe([...localResults, ...online], category, limit);
  writeCache(cacheKey, filtered);
  return filtered;
}

function parseCoordinateQuery(query: string): GeoLocation | null {
  const match = query.match(/^([-+]?[0-9]*\.?[0-9]+)[,\s]+([-+]?[0-9]*\.?[0-9]+)$/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return {
    name: `GPS Point: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
    lat,
    lng,
    category: 'landmark',
    description: 'Custom geographic coordinates',
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // Only CORS-safelisted headers, so no preflight is triggered.
      headers: { Accept: 'application/json', 'Accept-Language': 'en' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new GeocodeHttpError(response.status);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function searchWithNominatim(query: string, limit: number, origin?: GeoOrigin): Promise<GeoLocation[]> {
  let url =
    `${NOMINATIM_ENDPOINT}?format=jsonv2&addressdetails=1&dedupe=1&limit=${limit}` +
    `&q=${encodeURIComponent(query)}`;

  if (origin) {
    // Weighted (not `bounded`) viewbox around the drawing area: nearby
    // villages/localities rank first, but distant matches are still returned.
    const north = (Math.max(-90, Math.min(90, origin.lat + 0.35))).toFixed(5);
    const south = (Math.max(-90, Math.min(90, origin.lat - 0.35))).toFixed(5);
    const west = (origin.lng - 0.5).toFixed(5);
    const east = (origin.lng + 0.5).toFixed(5);
    url += `&viewbox=${west},${north},${east},${south}`;
  }

  const payload = await fetchJson(url);
  if (!Array.isArray(payload)) return [];

  return (payload as NominatimResult[])
    .map((item): GeoLocation | null => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const name = item.name || item.display_name?.split(',')[0]?.trim();
      if (!name) return null;

      const featureClass = item.class || '';
      const type = item.type || '';

      return {
        name,
        lat,
        lng,
        district: item.address?.state_district || item.address?.county,
        state: item.address?.state || item.address?.country,
        description: item.display_name,
        category: classifyOsmFeature(featureClass, type),
      };
    })
    .filter((location): location is GeoLocation => location !== null);
}

async function searchWithPhoton(query: string, limit: number, origin?: GeoOrigin): Promise<GeoLocation[]> {
  let url = `${PHOTON_ENDPOINT}?q=${encodeURIComponent(query)}&limit=${limit}&lang=en`;

  if (origin) {
    // Photon's lat/lon bias is what makes small local names — villages, shops,
    // individual buildings — surface for the area the user actually draws in.
    url += `&lat=${origin.lat.toFixed(5)}&lon=${origin.lng.toFixed(5)}&zoom=14`;
  }

  const payload = (await fetchJson(url)) as PhotonResponse;
  const features = Array.isArray(payload?.features) ? payload.features : [];

  return features
    .map((feature): GeoLocation | null => {
      const coordinates = feature.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const props = feature.properties ?? {};
      const street =
        props.housenumber && props.street
          ? `${props.housenumber} ${props.street}`
          : props.street;

      const addressParts = [
        street,
        props.city,
        props.district || props.county,
        props.state,
        props.postcode,
        props.country,
      ].filter((part): part is string => Boolean(part));

      const name = props.name || props.city || props.street || addressParts[0];
      if (!name) return null;

      return {
        name,
        lat,
        lng,
        district: props.district || props.county,
        state: props.state || props.country,
        description: addressParts.join(', ') || undefined,
        category: classifyOsmFeature(props.osm_key || '', props.osm_value || props.type || ''),
      };
    })
    .filter((location): location is GeoLocation => location !== null);
}

function classifyOsmFeature(featureClass: string, type: string): GeoLocation['category'] {
  if (featureClass === 'power') return 'substation';
  if (featureClass === 'place') return 'town';
  if (['crossing', 'ford', 'bridge'].includes(type)) return 'crossing';
  if (['amenity', 'historic', 'tourism', 'leisure', 'natural', 'building', 'man_made'].includes(featureClass)) {
    return 'landmark';
  }
  return 'general';
}

function filterAndDedupe(
  results: GeoLocation[],
  category: SearchCategory,
  limit: number
): GeoLocation[] {
  const seen = new Set<string>();

  return results
    .filter((location) => category === 'all' || location.category === category)
    .filter((location) => {
      // Same place can be returned by both providers / multiple OSM entities.
      const key = `${location.name.toLocaleLowerCase()}@${location.lat.toFixed(3)},${location.lng.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function readCache(key: string): GeoLocation[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }

  return entry.results;
}

function writeCache(key: string, results: GeoLocation[]): void {
  const ttl = results.length > 0 ? RESULT_CACHE_TTL_MS : EMPTY_CACHE_TTL_MS;
  searchCache.set(key, { expiresAt: Date.now() + ttl, results });

  if (searchCache.size > 100) {
    const now = Date.now();
    for (const [cachedKey, entry] of searchCache) {
      if (entry.expiresAt <= now) searchCache.delete(cachedKey);
    }
  }
}

function toFriendlyError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new Error(
      'Place search timed out. Check your internet connection and try again.'
    );
  }

  if (error instanceof GeocodeHttpError) {
    if (error.status === 403 || error.status === 429) {
      return new Error(
        'The map search service is busy or rate-limiting requests. Please wait a moment and try again.'
      );
    }
    return new Error(`The map search service returned an error (HTTP ${error.status}). Please try again.`);
  }

  return new Error(
    'Could not reach the online place search. Check your internet connection (or your network/firewall) and try again.'
  );
}
