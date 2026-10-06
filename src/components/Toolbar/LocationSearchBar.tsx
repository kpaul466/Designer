/**
 * Area & Place Search Engine for PowerLine Designer GIS
 * Comprehensive search for electrical distribution areas, substations, habitations, crossings, and global locations.
 * Features:
 * - Extensive database of WBSEDCL & Indian distribution zones, 33/11kV substations, and Mouza areas
 * - Live OpenStreetMap Nominatim geocoding for any village, town, road, or address globally
 * - GPS Coordinate parser (Lat, Lng)
 * - Category filter tabs (All, Substations, Habitations, Crossings)
 * - Actions: "Fly Map to Place", "Place Canvas Here", "Drop Pin Marker"
 * - Recent search history saved to localStorage
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Navigation,
  Crosshair,
  Loader2,
  X,
  History,
  Building,
  Zap,
  Waves,
  Map as MapIcon,
  Compass,
} from 'lucide-react';
import { GeoLocation } from '../../types/electrical';

const STORAGE_KEY_RECENT_SEARCHES = 'powerline_recent_places_v2';

// Curated electrical distribution division presets, substations, and crossing corridors
export const PRESET_LOCATIONS: GeoLocation[] = [
  // 1. SUBSTATIONS & FEEDERS
  {
    name: 'Falakata 33/11kV Sub-Station',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7124,
    lng: 89.2845,
    category: 'substation',
    description: '33/11kV Primary Substation — Falakata Feeder 1 & 2',
  },
  {
    name: 'Birpara 33/11kV Substation & CCC',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7821,
    lng: 89.1235,
    category: 'substation',
    description: 'Birpara CCC — NH-31D Birpara-Falakata Corridor Feeder',
  },
  {
    name: 'Alipurduar 132/33kV Grid Substation',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.4925,
    lng: 89.5283,
    category: 'substation',
    description: 'Central Division Transmission Grid & Distribution Feeders',
  },
  {
    name: 'Siliguri 132/33kV Distribution Hub',
    district: 'Darjeeling',
    state: 'West Bengal',
    lat: 26.7271,
    lng: 88.3953,
    category: 'substation',
    description: 'North Bengal Zonal Hub & Major Urban Feeder Network',
  },
  {
    name: 'Dhupguri 33/11kV Substation Area',
    district: 'Jalpaiguri',
    state: 'West Bengal',
    lat: 26.5982,
    lng: 89.0125,
    category: 'substation',
    description: 'Dhupguri CCC — Agricultural Pump & Rural Feeder',
  },
  {
    name: 'Maynaguri 33/11kV Rural Substation',
    district: 'Jalpaiguri',
    state: 'West Bengal',
    lat: 26.5621,
    lng: 88.8254,
    category: 'substation',
    description: 'Maynaguri CCC — Distribution Lines & 25kVA DTR Schemes',
  },
  {
    name: 'Cooch Behar 132/33kV Power Station',
    district: 'Cooch Behar',
    state: 'West Bengal',
    lat: 26.3242,
    lng: 89.4526,
    category: 'substation',
    description: 'Cooch Behar Town & Sub-Divisional Electrical Feeders',
  },
  {
    name: 'Hasimara / Jaigaon Indo-Bhutan Substation',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7502,
    lng: 89.3401,
    category: 'substation',
    description: 'Border Industrial Feeder & Commercial Substation',
  },
  {
    name: 'Kolkata Bidyut Bhavan Headquarters',
    district: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5867,
    lng: 88.4172,
    category: 'substation',
    description: 'Salt Lake Sector II — WBSEDCL Central Utility Headquarters',
  },

  // 2. TOWNS, VILLAGES & HABITATIONS
  {
    name: 'Satpukuriya Village Habitation',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7058,
    lng: 89.2682,
    category: 'town',
    description: 'Rural Habitation & Papai Barman S/C Consumer Clusters',
  },
  {
    name: 'Promod Nagar Habitation Cluster',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7215,
    lng: 89.2941,
    category: 'town',
    description: 'Rural Electrification Wing & S/C-6 Service Connection Feeder',
  },
  {
    name: 'Falakata Municipal Town & Market',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7185,
    lng: 89.2812,
    category: 'town',
    description: 'Falakata Main Market, Sub-Division Commercial Feeders',
  },
  {
    name: 'Madarihat Jaldapara Feeder Area',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7025,
    lng: 89.2785,
    category: 'town',
    description: 'Ecotourism Feeder & LT AB Cable Conversion',
  },
  {
    name: 'Malbazar Tea Estate Feeder',
    district: 'Jalpaiguri',
    state: 'West Bengal',
    lat: 26.8621,
    lng: 88.7423,
    category: 'town',
    description: 'Dooars Tea Garden HT-OH Transmission Corridor',
  },
  {
    name: 'Kalimpong Hill Sub-Division',
    district: 'Kalimpong',
    state: 'West Bengal',
    lat: 27.0667,
    lng: 88.4667,
    category: 'town',
    description: 'Hill Terrain HT Distribution & RSJ Pole Lines',
  },

  // 3. CROSSING CORRIDORS & HIGHWAYS
  {
    name: 'Mujnai River Crossing Corridor',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7352,
    lng: 89.2154,
    category: 'crossing',
    description: 'River Crossing 50M, 60M, 32M Spans & 25 kVA DTR Pole Induction',
  },
  {
    name: 'Torsa River Floodplain Crossing',
    district: 'Cooch Behar',
    state: 'West Bengal',
    lat: 26.3150,
    lng: 89.4720,
    category: 'crossing',
    description: 'Major Riverbed High-Tension Transmission Crossing',
  },
  {
    name: 'NH-31D Falakata-Birpara Road Crossing',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7450,
    lng: 89.2100,
    category: 'crossing',
    description: 'National Highway Road Crossing with LT AB Cable & Cradle Guard',
  },
  {
    name: 'Rajeshwary Fuel Station Commercial Feeder',
    district: 'Alipurduar',
    state: 'West Bengal',
    lat: 26.7380,
    lng: 89.2450,
    category: 'landmark',
    description: 'Commercial Feeder, 4-Pole Structure & 11kV Metering Unit',
  },
];

interface LocationSearchBarProps {
  currentLocationName?: string;
  onSelectLocation: (location: GeoLocation) => void;
  onPlaceCanvasHere?: (location: GeoLocation) => void;
  compact?: boolean;
}

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  currentLocationName = '',
  onSelectLocation,
  onPlaceCanvasHere,
  compact = false,
}) => {
  const [query, setQuery] = useState(currentLocationName);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'substation' | 'town' | 'crossing'>('all');
  const [results, setResults] = useState<GeoLocation[]>(PRESET_LOCATIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<GeoLocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external location name change
  useEffect(() => {
    if (currentLocationName && currentLocationName !== query) {
      setQuery(currentLocationName);
    }
  }, [currentLocationName]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter or Geocode
  useEffect(() => {
    const trimmed = query.trim();

    // 1. If blank, show presets filtered by category
    if (!trimmed) {
      if (activeCategory === 'all') {
        setResults(PRESET_LOCATIONS);
      } else {
        setResults(PRESET_LOCATIONS.filter((l) => l.category === activeCategory));
      }
      setIsLoading(false);
      return;
    }

    // 2. Filter local presets
    let matched = PRESET_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        (loc.district && loc.district.toLowerCase().includes(trimmed.toLowerCase())) ||
        (loc.state && loc.state.toLowerCase().includes(trimmed.toLowerCase())) ||
        (loc.description && loc.description.toLowerCase().includes(trimmed.toLowerCase()))
    );

    if (activeCategory !== 'all') {
      matched = matched.filter((l) => l.category === activeCategory);
    }

    // 3. Check if GPS Coordinates: e.g. "26.712, 89.284"
    const coordMatch = trimmed.match(/^([-+]?[0-9]*\.?[0-9]+)[,\s]+([-+]?[0-9]*\.?[0-9]+)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setResults([
          {
            name: `GPS Point: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
            lat,
            lng,
            category: 'landmark',
            description: 'Custom Geographic Coordinate Point',
          },
          ...matched,
        ]);
        return;
      }
    }

    setResults(matched);

    // 4. Live OpenStreetMap Geocoding (if >= 3 characters)
    if (trimmed.length >= 3) {
      const timer = setTimeout(async () => {
        setIsLoading(true);
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              trimmed
            )}&limit=5&countrycodes=in&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
              },
            }
          );
          if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data) && data.length > 0) {
              const osmResults: GeoLocation[] = data.map((item: any) => ({
                name: item.name || item.display_name.split(',')[0],
                district: item.address?.state_district || item.address?.county || item.display_name.split(',')[1]?.trim(),
                state: item.address?.state || 'India',
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                category: 'general',
                description: item.display_name,
              }));

              // Merge without duplicates
              const existingNames = new Set(matched.map((m) => m.name.toLowerCase()));
              const filteredOsm = osmResults.filter((o) => !existingNames.has(o.name.toLowerCase()));
              setResults([...matched, ...filteredOsm]);
            }
          }
        } catch (e) {
          console.warn('Geocoding search error:', e);
        } finally {
          setIsLoading(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [query, activeCategory]);

  const saveRecent = (loc: GeoLocation) => {
    const updated = [loc, ...recentSearches.filter((r) => r.name !== loc.name)].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(updated));
    } catch {}
  };

  const handleSelect = (loc: GeoLocation) => {
    setQuery(loc.name);
    setIsOpen(false);
    saveRecent(loc);
    onSelectLocation(loc);
  };

  const handlePlaceCanvas = (e: React.MouseEvent, loc: GeoLocation) => {
    e.stopPropagation();
    setQuery(loc.name);
    setIsOpen(false);
    saveRecent(loc);
    onSelectLocation(loc);
    if (onPlaceCanvasHere) {
      onPlaceCanvasHere(loc);
    }
  };

  const getCategoryBadge = (category?: GeoLocation['category']) => {
    switch (category) {
      case 'substation':
        return (
          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 text-[9px] font-bold flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> Substation
          </span>
        );
      case 'crossing':
        return (
          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 text-[9px] font-bold flex items-center gap-1">
            <Waves className="w-2.5 h-2.5" /> Crossing
          </span>
        );
      case 'town':
        return (
          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[9px] font-bold flex items-center gap-1">
            <Building className="w-2.5 h-2.5" /> Mouza/Town
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-mono">
            GIS Place
          </span>
        );
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-red-400 absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search Place, Substation, Feeder, Mouza or GPS Coordinates..."
          className={`w-full bg-slate-900/95 hover:bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-16 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors shadow-lg ${
            compact ? 'py-1.5 text-xs' : 'py-2'
          }`}
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults(PRESET_LOCATIONS);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Auto-suggest Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 max-h-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 text-xs flex flex-col animate-in fade-in slide-in-from-top-2">
          {/* Category Filter Pills */}
          <div className="p-2 px-3 bg-slate-950/80 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All Places ({PRESET_LOCATIONS.length}+)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('substation')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                activeCategory === 'substation'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Substations</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('town')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                activeCategory === 'town'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Building className="w-3 h-3 text-emerald-400" />
              <span>Mouzas & Towns</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('crossing')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                activeCategory === 'crossing'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Waves className="w-3 h-3 text-sky-400" />
              <span>Crossings</span>
            </button>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto divide-y divide-slate-800/80 flex-1">
            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-2 px-3 bg-slate-950/40">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <History className="w-3 h-3 text-slate-400" />
                  <span>Recent Places</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((rec, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelect(rec)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] flex items-center gap-1.5 border border-slate-700/60"
                    >
                      <MapPin className="w-3 h-3 text-red-400" />
                      <span>{rec.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <p className="font-medium text-slate-300 mb-1">No places found matching "{query}"</p>
                <p className="text-[11px] text-slate-500">
                  Tip: You can search any city, village, feeder, or enter GPS coordinates (e.g. 26.712, 89.284).
                </p>
              </div>
            ) : (
              results.map((loc, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(loc)}
                  className="p-3 hover:bg-slate-800/90 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-red-600/20 group-hover:border-red-500/50 border border-slate-700 flex items-center justify-center text-red-400 shrink-0 mt-0.5 transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{loc.name}</span>
                        {getCategoryBadge(loc.category)}
                      </div>
                      {loc.description && (
                        <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                          {loc.description}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>
                          {loc.lat.toFixed(4)}° N, {loc.lng.toFixed(4)}° E
                        </span>
                        {loc.district && <span>· {loc.district}</span>}
                        {loc.state && <span>· {loc.state}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onPlaceCanvasHere && (
                      <button
                        type="button"
                        onClick={(e) => handlePlaceCanvas(e, loc)}
                        className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm"
                        title="Position the flexible CAD canvas directly over this location"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>Place Canvas</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(loc);
                      }}
                      className="p-2 hover:bg-slate-700 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs transition-colors"
                      title="Fly map to this location"
                    >
                      <Navigation className="w-3.5 h-3.5 text-sky-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
