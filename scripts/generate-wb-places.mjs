/**
 * generate-wb-places.mjs
 *
 * Builds `public/wb-places.json` — an offline, fast-searchable index of every
 * named place inside the West Bengal administrative boundary.
 *
 * Data sources (both freely redistributable — no Google Maps scraping):
 *  1. OpenStreetMap via Overpass (ODbL) — villages, hamlets, towns, suburbs…
 *     `district` is assigned by point-in-polygon against admin_level=6 relations.
 *  2. GeoNames India dump IN.zip (CC-BY 4.0, download.geonames.org) — adds all
 *     populated places (PPL*) including gazetteer/census villages, each with a
 *     district name (admin2) and Bengali alternate names.
 *  Rows are merged and de-duplicated: an existing OSM row wins on the same
 *  name/location; missing district or Bengali alias are borrowed from GeoNames.
 *
 *   node scripts/generate-wb-places.mjs   (or: npm run wb-places)
 *
 * Output: { meta: {}, places: [ [name, alias, lat, lng, placeType, district], … ] }
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../public/wb-places.json');
const WORK_DIR = resolve(tmpdir(), 'wb-places-gen'); // fixed dir → cached downloads across reruns

const OVERPASS_ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const GEONAMES_ZIP_URL = 'https://download.geonames.org/export/dump/IN.zip';
const GEONAMES_ADMIN2_URL = 'https://download.geonames.org/export/dump/admin2Codes.txt';

const RELATION_QUERY = `[out:json][timeout:60];
relation["name"="West Bengal"]["boundary"="administrative"];
out body;`;

function relationGeometryQuery(id) {
  return `[out:json][timeout:120][maxsize:536870912];
relation(${id});
out geom;`;
}

const PLACE_NODES_QUERY = `[out:json][timeout:300][maxsize:536870912];
node["place"]["name"][!"disused"](21.35,85.70,27.45,89.95);
out body;`;

// District boundaries: in OSM West Bengal, actual districts are admin_level=5
// (level 6 is used by CD blocks). Whitelisted by GeoNames canonical names.
const DISTRICT_QUERY = `[out:json][timeout:240][maxsize:536870912];
relation["boundary"="administrative"]["admin_level"="5"](21.35,85.70,27.45,89.95);
out geom;`;

const UA = 'PowerLineDesigner-asset-generator/1.0 (OpenStreetMap ODbL + GeoNames CC-BY)';

function overpassViaCurl(endpoint, query, timeoutSeconds) {
  const tmp = resolve(tmpdir(), `overpass-asset-${Date.now()}.json`);
  const result = spawnSync('curl.exe', [
    '-s', '-S',
    '--max-time', String(timeoutSeconds),
    '-A', UA,
    '-H', 'Accept: application/json',
    '-o', tmp,
    endpoint,
    '--data-urlencode', `data=${query}`,
  ], { encoding: 'utf8' });

  const fail = (why) => {
    throw new Error(`${endpoint} → curl: ${why}` + (result.stderr ? ` (${result.stderr.trim()})` : ''));
  };
  if (result.error) fail(result.error.message);
  let text;
  try {
    text = readFileSync(tmp, 'utf8');
  } catch {
    fail(`no response body (exit ${result.status})`);
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    fail(`non-JSON response (exit ${result.status})`);
  }
  if (!Array.isArray(payload?.elements)) fail('malformed payload');
  return payload.elements;
}

async function overpassViaFetch(endpoint, query, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': UA,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.elements)) throw new Error('malformed payload');
    return payload.elements;
  } finally {
    clearTimeout(timer);
  }
}

/** Try every endpoint with fetch, then curl; return `elements`.
 * Responses are cached on disk (keyed by query hash) so a rerun never refetches
 * a step that already succeeded — Overpass mirrors rate-limit heavy sessions. */
async function runOverpass(query, timeoutSeconds = 320) {
  const cached = readOverpassCache(query);
  if (cached) {
    console.log('  (using cached Overpass response)');
    return cached;
  }
  const errors = [];
  const fetchTimeoutMs = Math.min(timeoutSeconds * 1000, 90_000);
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const elements = await overpassViaFetch(endpoint, query, fetchTimeoutMs);
      writeOverpassCache(query, elements);
      return elements;
    } catch (error) {
      errors.push(`${endpoint} → fetch: ${error instanceof Error ? error.message : 'failed'}`);
    }
    try {
      const elements = overpassViaCurl(endpoint, query, timeoutSeconds);
      writeOverpassCache(query, elements);
      return elements;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
    // Brief backoff before hammering the next mirror.
    spawnSync('ping.exe', ['-n', '6', '127.0.0.1'], { stdio: 'ignore' });
  }
  throw new Error(`All Overpass transports failed:\n${errors.join('\n')}`);
}

function overpassCacheDir() {
  const dir = resolve(WORK_DIR, 'overpass-cache');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readOverpassCache(query) {
  const hash = createHash('sha1').update(query).digest('hex').slice(0, 20);
  try {
    const payload = JSON.parse(readFileSync(resolve(overpassCacheDir(), `${hash}.json`), 'utf8'));
    if (Array.isArray(payload?.elements)) return payload.elements;
  } catch {
    // miss
  }
  return null;
}

function writeOverpassCache(query, elements) {
  try {
    const hash = createHash('sha1').update(query).digest('hex').slice(0, 20);
    writeFileSync(
      resolve(overpassCacheDir(), `${hash}.json`),
      JSON.stringify({ elements }),
      'utf8'
    );
  } catch {
    // caching is best-effort
  }
}

/** File download via curl.exe (the transport proven reliable here). */
function downloadFile(url, destination, timeoutSeconds = 300) {
  const result = spawnSync('curl.exe', [
    '-s', '-S', '-L',
    '--max-time', String(timeoutSeconds),
    '-A', UA,
    '-o', destination,
    url,
  ], { encoding: 'utf8' });
  if (result.error) throw new Error(`Download failed (${url}): ${result.error.message}`);
  const size = readLength(destination);
  if (size === 0) throw new Error(`Download failed (${url}): empty file`);
  return size;
}

function readLength(path) {
  try {
    return readFileSync(path).length;
  } catch {
    return 0;
  }
}

function pickWbRelation(relations) {
  const scored = relations
    .filter((rel) => rel?.tags)
    .map((rel) => ({
      rel,
      score:
        (rel.tags['ISO3166-2'] === 'IN-WB' ? 10 : 0) +
        (rel.tags.admin_level === '4' ? 3 : 0) +
        (rel.tags.admin_level ? 1 : 0) +
        (rel.tags['name:en'] === 'West Bengal' ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score);
  if (!scored.length) throw new Error('No administrative relation named "West Bengal" found.');
  const best = scored[0];
  console.log(`Using relation ${best.rel.id} (score ${best.score}, admin_level=${best.rel.tags.admin_level ?? '?'}).`);
  return best.rel.id;
}

/** Ray casting over line segments — works across unchained member ways. */
function segmentsContainPoint(segments, x, y) {
  let inside = false;
  for (let i = 0; i < segments.length; i += 1) {
    const [x1, y1] = segments[i][0];
    const [x2, y2] = segments[i][1];
    if (!(y1 > y !== y2 > y)) continue;
    const intersectionX = ((x2 - x1) * (y - y1)) / (y2 - y1) + x1;
    if (x < intersectionX) inside = !inside;
  }
  return inside;
}

/** Overpass `out geom` member list → {name, outer[], inner[], bbox}. */
function polygonFromRelation(element) {
  const outer = [];
  const inner = [];
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  for (const member of element.members ?? []) {
    if (member.role !== 'outer' && member.role !== 'inner') continue;
    const geometry = member.geometry;
    if (!Array.isArray(geometry)) continue;
    for (let i = 0; i + 1 < geometry.length; i += 1) {
      const a = geometry[i];
      const b = geometry[i + 1];
      if (!a || !b) continue; // null marks a closed-loop wrap boundary
      const segment = [[a.lon, a.lat], [b.lon, b.lat]];
      if (member.role === 'outer') outer.push(segment);
      else inner.push(segment);
      south = Math.min(south, a.lat, b.lat);
      north = Math.max(north, a.lat, b.lat);
      west = Math.min(west, a.lon, b.lon);
      east = Math.max(east, a.lon, b.lon);
    }
  }
  if (!outer.length) return null;
  return { outer, inner, south, north, west, east };
}

function polygonContains(polygon, lat, lng) {
  if (lat < polygon.south || lat > polygon.north || lng < polygon.west || lng > polygon.east) return false;
  if (!segmentsContainPoint(polygon.outer, lng, lat)) return false;
  if (segmentsContainPoint(polygon.inner, lng, lat)) return false;
  return true;
}

/**
 * The admin_level=6 query spans the whole WB bounding box, so it also returns
 * CD blocks and subdivisions (also tagged 6 in India) plus Bihar/Jharkhand/
 * Odisha/Assam blocks, Nepal districts, Bangladesh upazilas and Bhutan gewogs.
 * Only polygons whose canonical name matches the GeoNames IN.28 admin2 list
 * (the authoritative WB district registry) are kept as district polygons — CD
 * blocks and foreign units can never leak in as labels.
 */
function buildDistricts(elements, boundary, canonicalNames) {
  const byName = new Map();
  let rejectedForeign = 0;
  let rejectedNonDistrict = 0;
  for (const element of elements) {
    if (element?.type !== 'relation') continue;
    if (!element.members?.length) continue;
    const rawName = element.tags?.['name:en'] || element.tags?.name || '';
    if (!rawName) continue;
    const key = normaliseDistrictName(rawName);
    if (!canonicalNames.has(key)) {
      rejectedNonDistrict += 1;
      continue;
    }
    const polygon = polygonFromRelation(element);
    if (!polygon) continue;
    if (!samplePointInsideWb(polygon, boundary)) {
      rejectedForeign += 1;
      continue;
    }
    // District label uses the GeoNames spelling for consistency with GeoNames rows.
    const name = canonicalNames.get(key);
    if (!byName.has(name)) {
      byName.set(name, {
        name,
        ...polygon,
        area: (polygon.east - polygon.west) * (polygon.north - polygon.south),
      });
    }
  }
  const districts = [...byName.values()];
  console.log(
    `District polygons matched GeoNames names: ${districts.length}/${canonicalNames.size}` +
      ` → ${districts.map((d) => d.name).join(', ')}` +
      `\n  (rejected: ${rejectedNonDistrict} non-district relations, ${rejectedForeign} outside WB)`
  );
  return districts;
}

/** Strip "district"/"block" suffixes, stray accents and separators for matching. */
function normaliseDistrictName(name) {
  const normalised = String(name || '')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/\b(district|block|subdivision|sadar)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  // Common English spellings that differ from GeoNames' canonical names.
  const VARIANTS = { hooghly: 'hugli', howrah: 'haora', maldah: 'malda', purulia: 'puruliya' };
  return VARIANTS[normalised] ?? normalised;
}

/** Cheap "is this polygon roughly inside WB" probe: bbox centre, then a vertex. */
function samplePointInsideWb(polygon, boundary) {
  const probes = [
    { lat: (polygon.south + polygon.north) / 2, lng: (polygon.west + polygon.east) / 2 },
  ];
  const firstSegment = polygon.outer[0];
  if (firstSegment) {
    probes.push({
      lat: (firstSegment[0][1] + firstSegment[1][1]) / 2,
      lng: (firstSegment[0][0] + firstSegment[1][0]) / 2,
    });
  }
  return probes.some((point) => polygonContains(boundary, point.lat, point.lng));
}

function assignDistrict(lat, lng, districts) {
  let best = null;
  for (const district of districts) {
    if (!polygonContains(district, lat, lng)) continue;
    // Nested WB polygons: the district polygon contains its blocks' polygons,
    // and the largest containing polygon is the highest admin unit = district.
    if (!best || district.area > best.area) best = district;
  }
  return best ? best.name : '';
}

/** Bengali-script alternate name extraction from the comma list. */
function bengaliAlias(alternatenames) {
  if (!alternatenames) return '';
  for (const part of String(alternatenames).split(',')) {
    const candidate = part.trim();
    if (/[\u0980-\u09FF]/.test(candidate)) return candidate;
  }
  return '';
}

function geonamesTypeLabel(featureCode) {
  const code = String(featureCode || '');
  if (code === 'PPLC') return 'city';
  if (code.startsWith('PPLA')) return 'town';
  if (code === 'PPLL') return 'locality';
  if (code === 'PPLS') return 'suburb';
  if (code.startsWith('PPL')) return 'village';
  return 'place';
}

function parseAdmin2Districts(admin2Text) {
  const map = new Map();
  for (const line of admin2Text.split('\n')) {
    const columns = line.split('\t');
    const code = columns[0];
    if (!code || !code.startsWith('IN.28.')) continue;
    if (columns[1]) {
      const token = code.slice('IN.28.'.length);
      if (token) map.set(token, columns[1]);
    }
  }
  return map;
}

function downloadGeonamesRail() {
  console.log('Step 4 — loading GeoNames India dump (populated places, district codes)…');
  mkdirSync(WORK_DIR, { recursive: true });
  const zipPath = resolve(WORK_DIR, 'IN.zip');
  const rowsPath = resolve(WORK_DIR, 'IN.txt');

  if (readLength(rowsPath) > 0) {
    console.log('  Using cached IN.txt from a previous run.');
  } else {
    const zipBytes = downloadFile(GEONAMES_ZIP_URL, zipPath, 420);
    console.log(`  IN.zip downloaded: ${(zipBytes / 1024 / 1024).toFixed(1)} MB`);
    const unzip = spawnSync('tar.exe', ['-xf', zipPath, '-C', WORK_DIR], {
      encoding: 'utf8',
      timeout: 120_000,
    });
    if (unzip.error || unzip.status !== 0) {
      throw new Error(`unzip failed: ${unzip.error?.message ?? unzip.stderr}`);
    }
  }

  const admin2Path = resolve(WORK_DIR, 'IN-admin2.txt');
  if (readLength(admin2Path) === 0) {
    const admin2Bytes = downloadFile(GEONAMES_ADMIN2_URL, admin2Path, 120);
    console.log(`  admin2Codes.txt: ${(admin2Bytes / 1024).toFixed(0)} KB`);
  }
  const districtByCode = parseAdmin2Districts(readFileSync(admin2Path, 'utf8'));

  const text = readFileSync(rowsPath, 'utf8');
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    const c = line.split('\t');
    if (c.length < 12) continue;
    const [, name, , alternatenames, lat, lng, featureClass, featureCode, country, , admin1, admin2] = c;
    if (country !== 'IN' || admin1 !== '28') continue;
    if (featureClass !== 'P') continue;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) continue;
    rows.push({
      name,
      bengali: bengaliAlias(alternatenames),
      lat: latN,
      lng: lngN,
      type: geonamesTypeLabel(featureCode),
      district: districtByCode.get(admin2 ?? '') ?? '',
    });
  }
  console.log(`  GeoNames populated places in West Bengal (IN.28, P-class): ${rows.length}`);
  const canonical = new Map();
  for (const [, name] of districtByCode) {
    const key = normaliseDistrictName(name);
    if (key) canonical.set(key, name);
  }
  return { rows, canonical };
}

const GRID_STEP = 0.01; // ~1.1 km grid, generous but bounded

function gridKey(lat, lng) {
  return `${Math.round(lat / GRID_STEP)}|${Math.round(lng / GRID_STEP)}`;
}

/** Spatial index so GeoNames→OSM duplicate checks are O(neighbours). */
class NearbyIndex {
  constructor() {
    this.cells = new Map();
  }

  add(key, lat, lng) {
    const cell = gridKey(lat, lng);
    let list = this.cells.get(cell);
    if (!list) this.cells.set(cell, (list = []));
    list.push(key);
  }

  neighbors(lat, lng) {
    const found = [];
    const base = gridKey(lat, lng).split('|').map(Number).filter(Number.isFinite);
    if (base.length !== 2) return found;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const list = this.cells.get(`${base[0] + dx}|${base[1] + dy}`);
        if (list) found.push(...list);
      }
    }
    return found;
  }
}

async function main() {
  console.log('Step 1 — locating the West Bengal administrative relation…');
  const relations = await runOverpass(RELATION_QUERY, 45);
  const relationId = pickWbRelation(relations);

  console.log(`Step 2 — fetching boundary polygon of relation ${relationId}…`);
  const relationElements = await runOverpass(relationGeometryQuery(relationId), 180);
  const relation = relationElements.find((el) => el.type === 'relation' && el.id === relationId);
  if (!relation?.members?.length) throw new Error('Boundary relation returned no members; retry later.');
  const boundary = polygonFromRelation(relation);
  if (!boundary) throw new Error('Could not assemble the West Bengal polygon.');

  console.log('Step 3 — downloading all named place nodes in the WB bounding box…');
  const elements = await runOverpass(PLACE_NODES_QUERY);

  // GeoNames first: its canonical district names whitelist which OSM relations
  // count as "district" polygons in the next step.
  let geonames = { rows: [], canonical: new Map() };
  try {
    geonames = await downloadGeonamesRail();
  } catch (error) {
    console.warn(`GeoNames data unavailable; district labels will be sparse.\n${error.message}`);
  }

  let districts = [];
  try {
    console.log('Step 5 — downloading district polygons for district labels…');
    const districtElements = await runOverpass(DISTRICT_QUERY, 240);
    districts = buildDistricts(districtElements, boundary, geonames.canonical);
  } catch (error) {
    console.warn(`District polygons unavailable; district falls back to GeoNames rows only.\n${error.message}`);
  }

  const byKey = new Map();
  const seenIds = new Set();
  let outside = 0;

  for (const element of elements) {
    const id = element?.id;
    const tags = element?.tags;
    const lat = Number(element?.lat);
    const lng = Number(element?.lon);
    if (!id || !tags || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    if (!polygonContains(boundary, lat, lng)) {
      outside += 1;
      continue;
    }
    const name = tags['name:en'] || tags['name'] || '';
    if (!name) continue;
    const alias = tags['name:en'] ? (tags['name'] || '') : '';
    const type = String(tags.place || 'place');
    const key = `o${id}`;
    byKey.set(key, [
      name,
      alias,
      Number(lat.toFixed(5)),
      Number(lng.toFixed(5)),
      type,
      assignDistrict(lat, lng, districts) || '',
    ]);
  }
  console.log(`OSM places inside West Bengal: ${byKey.size} (outside filtered: ${outside}).`);

  // Spatial index over OSM rows for the merge step.
  const index = new NearbyIndex();
  for (const [key, tuple] of byKey) index.add(key, tuple[2], tuple[3]);

  let geonamesTotal = 0;
  let geonamesAdded = 0;
  let geonamesMerged = 0;
  {
    const geonamesRows = geonames.rows;
    geonamesTotal = geonamesRows.length;
    for (const row of geonamesRows) {
      if (!polygonContains(boundary, row.lat, row.lng)) continue;

      // Duplicate check: same lowercase name within ~1 km of an OSM row.
      let matchedKey = null;
      for (const candidateKey of index.neighbors(row.lat, row.lng)) {
        const tuple = byKey.get(candidateKey);
        if (!tuple) continue;
        if (tuple[0].toLocaleLowerCase() === String(row.name || '').toLocaleLowerCase()) {
          matchedKey = candidateKey;
          break;
        }
      }

      if (matchedKey) {
        geonamesMerged += 1;
        const tuple = byKey.get(matchedKey);
        const [
          osmName,
          osmAlias,
          osmLat,
          osmLng,
          osmType,
          osmDistrict,
        ] = tuple;
        if (!osmAlias && row.bengali) tuple[1] = row.bengali;
        if (!osmDistrict && row.district) tuple[5] = row.district;
        continue;
      }

      // Choose a display name: prefer Latin script when the GeoNames name is
      // Bengali and a Latin alias exists (handled by "bengali"/"name" swap).
      const isBengali = /[\u0980-\u09FF]/.test(String(row.name || ''));
      const mainName = isBengali && row.bengali ? row.bengali : row.name;
      const alias = isBengali && row.bengali ? '' : row.bengali;
      const key = `n${byKey.size + 1}`;
      byKey.set(key, [
        mainName || row.name,
        alias,
        Number(row.lat.toFixed(5)),
        Number(row.lng.toFixed(5)),
        row.type,
        row.district,
      ]);
      index.add(key, row.lat, row.lng);
      geonamesAdded += 1;
    }
  }

  const places = [...byKey.values()].sort((a, b) =>
    a[0].localeCompare(b[0], 'en', { sensitivity: 'base' }));

  const typeCounts = {};
  places.forEach(([, , , , type]) => { typeCounts[type] = (typeCounts[type] || 0) + 1; });
  const districtCounts = {};
  places.forEach(([, , , , , district]) => {
    const label = district || '(unknown)';
    districtCounts[label] = (districtCounts[label] || 0) + 1;
  });

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const payload = {
    meta: {
      region: 'IN-WB (West Bengal)',
      relationId,
      count: places.length,
      types: typeCounts,
      districts: districtCounts,
      generatedAt: new Date().toISOString(),
      source: 'OpenStreetMap (Overpass API, ODbL) + GeoNames India (CC-BY 4.0)',
      license: 'ODbL © OpenStreetMap contributors · CC-BY 4.0 GeoNames (geonames.org/about)',
      format: 'places: [name, alias, lat, lng, placeType, district]',
      placesOutsideBoundaryFiltered: outside,
      geonamesRowsConsidered: geonamesTotal,
      geonamesRowsAdded: geonamesAdded,
      geonamesRowsMergedIntoOsm: geonamesMerged,
    },
    places,
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(payload), 'utf8');
  console.log(`Wrote ${places.length} places → ${OUTPUT_PATH}`);
  console.log('Type breakdown:', JSON.stringify(typeCounts));
  console.log('District breakdown:', JSON.stringify(districtCounts, null, 1));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
