import { GeoLocation } from '../types/electrical';

type SearchCategory = GeoLocation['category'] | 'all';

/**
 * Search OpenStreetMap or parse a latitude/longitude pair.
 */
export async function searchLocations(
  query: string,
  category: SearchCategory = 'all',
  limit = 20
): Promise<GeoLocation[]> {
  const clean = query.trim();
  const normalized = clean.toLocaleLowerCase();
  const coordMatch = clean.match(/^([-+]?[0-9]*\.?[0-9]+)[,\s]+([-+]?[0-9]*\.?[0-9]+)$/);

  if (coordMatch) {
    const lat = Number(coordMatch[1]);
    const lng = Number(coordMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [
        {
          name: `GPS Point: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
          lat,
          lng,
          category: 'landmark',
          description: 'Custom geographic coordinates',
        },
      ];
    }
  }

  if (!clean) return [];

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(clean)}`,
      { signal: controller.signal, headers: { 'Accept-Language': 'en' } }
    );
    if (!response.ok) {
      throw new Error(`OpenStreetMap search failed (${response.status}).`);
    }
    const results = (await response.json()) as Array<{
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
    }>;

    return results
      .map((item): GeoLocation | null => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const name = item.name || item.display_name?.split(',')[0]?.trim();
        if (!name) return null;
        const featureClass = item.class || '';
        const type = item.type || '';
        const resultCategory: GeoLocation['category'] =
          featureClass === 'power' ? 'substation'
            : ['place'].includes(featureClass) ? 'town'
              : ['crossing', 'ford', 'bridge'].includes(type) ? 'crossing'
                : ['amenity', 'historic', 'tourism', 'leisure', 'natural'].includes(featureClass)
                  ? 'landmark'
                  : 'general';

        return {
          name,
          lat,
          lng,
          district: item.address?.state_district || item.address?.county,
          state: item.address?.state || item.address?.country,
          description: item.display_name,
          category: resultCategory,
        };
      })
      .filter((location): location is GeoLocation =>
        location !== null && (category === 'all' || location.category === category)
      );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('OpenStreetMap search timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
