/**
 * Spot-check public/wb-places.json: district sanity for known towns,
 * plus suburb distribution across districts (leak detector).
 */
import { readFileSync } from 'node:fs';

const path = new URL('../public/wb-places.json'.replace(/^\//, ''), import.meta.url);
const asset = JSON.parse(readFileSync('public/wb-places.json', 'utf8'));
const { meta, places } = asset;

console.log('meta:', JSON.stringify({ count: meta.count, generatedAt: meta.generatedAt }));

// Known towns → expected district
const checks = [
  ['English Bazar', 'Malda District', 25.01, 88.14],
  ['Digha', 'Purba Medinipur', 21.62, 87.51],
  ['Asansol', 'Paschim Bardhaman', 23.68, 86.98],
  ['Siliguri', 'Darjeeling', 26.72, 88.43],
  ['Krishnanagar', 'Nadia', 23.40, 88.50],
  ['Barddhaman', 'Purba Bardhaman', 23.24, 87.86],
  ['Durgapur', 'Paschim Bardhaman', 23.55, 87.29],
  ['Cooch Behar', 'Cooch Behar District', 26.32, 89.44],
  ['Bankura', 'Bankura', 23.23, 87.07],
  ['Midnapore', 'Paschim Medinipur', 22.43, 87.32],
  ['Suri', 'Birbhum', 23.91, 87.53],
  ['Kharagpur', 'Paschim Medinipur', 22.35, 87.32],
  ['Rampurhat', 'Birbhum', 24.18, 87.78],
];

const norm = (s) => String(s).toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
for (const [town, expectedDistrict] of checks) {
  const hits = places.filter((p) => norm(p[0]).includes(norm(town)));
  const pick = hits[0];
  if (!pick) {
    console.log(`MISS: ${town} not in index`);
    continue;
  }
  console.log(
    `${town} → "${pick[0]}" (${pick[4]}) district="${pick[5]}" ` +
      `lat=${pick[2]} lng=${pick[3]}` +
      (hits.length > 1 ? ` (${hits.length} name-ish hits)` : '')
  );
}

// Suburb leak analysis
const suburbByDistrict = {};
for (const p of places) {
  if (p[4] !== 'suburb') continue;
  const d = p[5] || '(unknown)';
  suburbByDistrict[d] = (suburbByDistrict[d] || 0) + 1;
}
console.log('\nSuburbs per district:', JSON.stringify(suburbByDistrict, null, 1));

// Villages per district
const villageByDistrict = {};
for (const p of places) {
  if (p[4] !== 'village') continue;
  const d = p[5] || '(unknown)';
  villageByDistrict[d] = (villageByDistrict[d] || 0) + 1;
}
console.log('\nVillages per district:', JSON.stringify(villageByDistrict, null, 1));
