/**
 * GIS Area & Location Geocoding Search Service
 * Pre-seeded with West Bengal & Indian electrical utility distribution divisions,
 * plus live OpenStreetMap Nominatim geocoding and coordinate parsing.
 */

import { GeoLocation } from '../types/electrical';

export const UTILITY_LOCATIONS_DATABASE: GeoLocation[] = [
  {
    name: 'Falakata',
    lat: 26.7124,
    lng: 89.2841,
    district: 'Alipurduar',
    state: 'West Bengal',
    description: 'Falakata CCC & Sub-Division Headquarters, NH-31D corridor',
  },
  {
    name: 'Promod Nagar',
    lat: 26.721,
    lng: 89.295,
    district: 'Alipurduar',
    state: 'West Bengal',
    description: 'Promod Nagar Distribution Sector, 25kVA DTR & LT feeder',
  },
  {
    name: 'Satpukuriya',
    lat: 26.698,
    lng: 89.271,
    district: 'Alipurduar',
    state: 'West Bengal',
    description: 'Satpukuriya Mouza, Rural Electrification & consumer drops',
  },
  {
    name: 'Birpara',
    lat: 26.7821,
    lng: 89.1432,
    district: 'Alipurduar',
    state: 'West Bengal',
    description: 'Birpara CCC, Highway crossing & commercial feeder',
  },
  {
    name: 'Madarihat',
    lat: 26.702,
    lng: 89.284,
    district: 'Alipurduar',
    state: 'West Bengal',
    description: 'Madarihat Sub-Station, Jaldapara forest border feeder',
  },
  {
    name: 'Alipurduar Junction',
    lat: 26.4919,
    lng: 89.5271,
    district: 'Alipurduar',
    state: 'West Bengal',
    description: 'Alipurduar Divisional Headquarters & 33/11kV Sub-Station',
  },
  {
    name: 'Hasimara',
    lat: 26.745,
    lng: 89.351,
    district: 'Alipurduar',
    state: 'West Bengal',
    description: 'Hasimara Airbase & 11kV HT transmission spur',
  },
  {
    name: 'Cooch Behar',
    lat: 26.3239,
    lng: 89.451,
    district: 'Cooch Behar',
    state: 'West Bengal',
    description: 'Cooch Behar Electrical Division & Town Feeder',
  },
  {
    name: 'Dhupguri',
    lat: 26.5986,
    lng: 89.0121,
    district: 'Jalpaiguri',
    state: 'West Bengal',
    description: 'Dhupguri Rural Distribution Section & Agro-feeder',
  },
  {
    name: 'Mainaguri',
    lat: 26.564,
    lng: 88.825,
    district: 'Jalpaiguri',
    state: 'West Bengal',
    description: 'Mainaguri 33/11kV Grid Substation',
  },
  {
    name: 'Siliguri',
    lat: 26.7271,
    lng: 88.3953,
    district: 'Darjeeling',
    state: 'West Bengal',
    description: 'Siliguri Zone Central Distribution Feeder',
  },
  {
    name: 'Jalpaiguri Town',
    lat: 26.5415,
    lng: 88.7196,
    district: 'Jalpaiguri',
    state: 'West Bengal',
    description: 'Jalpaiguri Distribution Division',
  },
  {
    name: 'Malbazar',
    lat: 26.8624,
    lng: 88.7412,
    district: 'Jalpaiguri',
    state: 'West Bengal',
    description: 'Dooars Tea Garden Distribution Grid',
  },
  {
    name: 'Jaigaon',
    lat: 26.845,
    lng: 89.382,
    district: 'Alipurduar',
    state: 'West Bengal',
    description: 'Bhutan Border Sub-Station & Distribution Line',
  },
  {
    name: 'Kolkata Central',
    lat: 22.5726,
    lng: 88.3639,
    district: 'Kolkata',
    state: 'West Bengal',
    description: 'Headquarters Grid & Urban Underground Distribution',
  },
];

/**
 * Search locations by name, district, or coordinates
 */
export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const clean = query.trim().toLowerCase();
  if (!clean) return UTILITY_LOCATIONS_DATABASE.slice(0, 8);

  // 1. Check for coordinate input like "26.7124, 89.2841"
  const coordMatch = clean.match(/^([-+]?[0-9]*\.?[0-9]+)[\s,]+([-+]?[0-9]*\.?[0-9]+)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [
        {
          name: `Custom Coordinates (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
          lat,
          lng,
          description: 'Geographic coordinate position',
        },
      ];
    }
  }

  // 2. Search local database
  const localMatches = UTILITY_LOCATIONS_DATABASE.filter(
    (loc) =>
      loc.name.toLowerCase().includes(clean) ||
      loc.district?.toLowerCase().includes(clean) ||
      loc.description?.toLowerCase().includes(clean)
  );

  // 3. Try live OpenStreetMap Nominatim search for global / external locations
  if (clean.length >= 3) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=in&limit=4`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const osmMatches: GeoLocation[] = data.map((item: any) => ({
          name: item.display_name.split(',')[0].trim(),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          description: item.display_name.split(',').slice(1, 3).join(',').trim(),
        }));

        // Merge without duplicates
        const existingNames = new Set(localMatches.map((l) => l.name.toLowerCase()));
        osmMatches.forEach((osm) => {
          if (!existingNames.has(osm.name.toLowerCase())) {
            localMatches.push(osm);
          }
        });
      }
    } catch (e) {
      // Ignore network / offline errors, return local matches
    }
  }

  return localMatches;
}
