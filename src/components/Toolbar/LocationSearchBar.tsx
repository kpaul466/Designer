/**
 * Area & Place Search Engine for PowerLine Designer GIS
 * Search places from OpenStreetMap.
 * Features:
 * - OpenStreetMap geocoding and place search
 * - GPS Coordinate parser (Lat, Lng)
 * - Category filter tabs (All, Substations, Habitations, Crossings)
 * - Actions: "Fly Map to Place", "Place Canvas Here", "Drop Pin Marker"
 * - Recent search history saved to localStorage
 */

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
} from 'lucide-react';
import { GeoLocation } from '../../types/electrical';
import { searchLocations, GeoOrigin } from '../../utils/locationService';
import {
  getWbGeoPlacesMeta,
  prefetchWbGeoPlaces,
  searchWbGeoPlaces,
  wbGeoCategoryColor,
} from '../../utils/wbGeoPlaces';

const STORAGE_KEY_RECENT_SEARCHES = 'powerline_recent_places_v4';

interface LocationSearchBarProps {
  currentLocationName?: string;
  onSelectLocation: (location: GeoLocation) => void;
  onPlaceCanvasHere?: (location: GeoLocation) => void;
  compact?: boolean;
  /** Current drawing area — biases search results to nearby villages/shops/buildings. */
  origin?: GeoOrigin;
}

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  currentLocationName = '',
  onSelectLocation,
  onPlaceCanvasHere,
  compact = false,
  origin,
}) => {
  const [query, setQuery] = useState(currentLocationName);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'substation' | 'town' | 'crossing'>('all');
  // Tier 1 — instant matches from the offline West Bengal dataset.
  const [localResults, setLocalResults] = useState<GeoLocation[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  // Tier 2 — online geocoders (Nominatim + Photon), merged afterwards.
  const [onlineResults, setOnlineResults] = useState<GeoLocation[]>([]);
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [datasetCount, setDatasetCount] = useState<number | null>(null);
  const [datasetSource, setDatasetSource] = useState<'indexeddb' | 'network' | null>(null);
  const localResultsRef = useRef<GeoLocation[]>([]);
  const [recentSearches, setRecentSearches] = useState<GeoLocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Highlighted row for keyboard navigation (ArrowUp/Down + Enter). Reset when
  // the result set changes; clamped for rendering below.
  const [activeIndex, setActiveIndex] = useState(0);

  /**
   * The suggestion menu is rendered through a portal with fixed positioning:
   * the search bar lives inside toolbars/panels that scroll or clip their
   * overflow (`overflow-x-auto`, `overflow-hidden`), which previously cut the
   * dropdown down to the height of the toolbar strip so it never appeared.
   */
  const [menuBox, setMenuBox] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const updateMenuBox = useCallback(() => {
    const anchor = dropdownRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(Math.max(rect.width, 300), window.innerWidth - margin * 2);
    const left = Math.min(Math.max(rect.left, margin), Math.max(margin, window.innerWidth - width - margin));
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openBelow = spaceBelow >= 240 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(180, Math.min(384, openBelow ? spaceBelow : spaceAbove));
    setMenuBox(
      openBelow
        ? { left, top: rect.bottom + 6, width, maxHeight }
        : { left, bottom: window.innerHeight - rect.top + 6, width, maxHeight }
    );
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuBox();
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateMenuBox();
      });
    };
    // Reposition while the toolbar is dragged, the panel scrolls or the window
    // resizes, so the menu stays glued to the input.
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('pointermove', schedule, true);
    return () => {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('pointermove', schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isOpen, updateMenuBox]);

  // Sync external location name change
  useEffect(() => {
    if (currentLocationName && currentLocationName !== query) {
      setQuery(currentLocationName);
    }
  }, [currentLocationName]);

  // Click outside listener (the menu itself is portaled outside dropdownRef)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset the online tier when the active category changes so a stale mixed
  // list never lingers under a narrower tab.
  useEffect(() => {
    setOnlineResults([]);
  }, [activeCategory]);

  // Tier 1 — instant offline results (~60 ms debounce). This answers before any
  // network round-trip and works with zero connectivity once the asset is in
  // the service-worker cache.
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setLocalResults([]);
      setIsLoadingLocal(false);
      return;
    }

    let isCurrentSearch = true;
    setIsLoadingLocal(true);
    prefetchWbGeoPlaces();

    const debounceTimer = window.setTimeout(() => {
      searchWbGeoPlaces(trimmedQuery, 12, origin)
        .then((locations) => {
          if (isCurrentSearch) setLocalResults(locations);
        })
        .catch(() => {
          if (isCurrentSearch) setLocalResults([]);
        })
        .finally(() => {
          if (isCurrentSearch) setIsLoadingLocal(false);
        });
    }, 60);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(debounceTimer);
    };
    // Primitive deps avoid re-running the search when a parent re-renders and
    // passes a fresh origin object with the same coordinates.
  }, [query, origin?.lat, origin?.lng]);

  // Tier 2 — online geocoders Nominatim + Photon (debounced to stay inside
  // their public rate limits), then merged below the instant offline hits.
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setOnlineResults([]);
      setSearchError(null);
      setIsLoadingOnline(false);
      return;
    }

    let isCurrentSearch = true;
    setSearchError(null);
    setIsLoadingOnline(true);

    const debounceTimer = window.setTimeout(() => {
      searchLocations(trimmedQuery, activeCategory, 20, origin)
        .then((locations) => {
          if (isCurrentSearch) setOnlineResults(locations);
        })
        .catch((error: unknown) => {
          if (!isCurrentSearch) return;
          setOnlineResults([]);
          // The offline tier already answers — only surface an error when it
          // produced nothing at all.
          if (!localResultsRef.current.length) {
            setSearchError(
              error instanceof Error ? error.message : 'Unable to search OpenStreetMap.'
            );
          }
        })
        .finally(() => {
          if (isCurrentSearch) setIsLoadingOnline(false);
        });
    }, 550);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(debounceTimer);
    };
    // Primitive deps avoid re-running the search when a parent re-renders and
    // passes a fresh origin object with the same coordinates.
  }, [query, activeCategory, origin?.lat, origin?.lng]);

  // Category-filter the offline hits with the same semantics as the online ones.
  const filteredLocalResults = localResults.filter(
    (location) => activeCategory === 'all' || location.category === activeCategory
  );

  const mergedResults = useMemo(() => {
    const seen = new Set<string>();
    const merged: GeoLocation[] = [];
    for (const location of [...filteredLocalResults, ...onlineResults]) {
      const key = `${location.name.toLocaleLowerCase()}@${location.lat.toFixed(3)},${location.lng.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(location);
    }
    return merged;
  }, [filteredLocalResults, onlineResults]);

  localResultsRef.current = filteredLocalResults;

  // Clamp the keyboard highlight to the current result list.
  const activeRow = Math.min(activeIndex, Math.max(mergedResults.length - 1, 0));

  const offlineKeys = useMemo(
    () =>
      new Set(
        filteredLocalResults.map(
          (location) => `${location.name.toLocaleLowerCase()}@${location.lat.toFixed(3)},${location.lng.toFixed(3)}`
        )
      ),
    [filteredLocalResults]
  );

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

  /** Enter selects the highlighted result, ArrowUp/Down move the highlight,
   *  Escape closes; bare coordinates + Enter still jump the map directly. */
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (isOpen) {
        e.stopPropagation();
        setIsOpen(false);
      }
      return;
    }
    if (e.key === 'ArrowDown' && mergedResults.length > 0) {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, mergedResults.length - 1));
      return;
    }
    if (e.key === 'ArrowUp' && mergedResults.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      const selected = mergedResults[activeRow];
      if (selected) {
        e.preventDefault();
        handleSelect(selected);
        return;
      }
      const coords = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
      if (coords) {
        const lat = parseFloat(coords[1]);
        const lng = parseFloat(coords[2]);
        if (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          Math.abs(lat) <= 90 &&
          Math.abs(lng) <= 180
        ) {
          e.preventDefault();
          setIsOpen(false);
          onSelectLocation({
            name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
            category: 'general',
            description: 'GPS coordinates',
          });
        }
      }
    }
  };

  const getCategoryBadge = (category?: GeoLocation['category'], isOfflineHit = false) => {
    const offlineTag = isOfflineHit ? ' · WB offline' : '';
    switch (category) {
      case 'substation':
        return (
          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 text-[9px] font-bold flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> Substation{offlineTag}
          </span>
        );
      case 'crossing':
        return (
          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 text-[9px] font-bold flex items-center gap-1">
            <Waves className="w-2.5 h-2.5" /> Crossing{offlineTag}
          </span>
        );
      case 'town':
        return (
          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[9px] font-bold flex items-center gap-1">
            <Building className="w-2.5 h-2.5" /> Mouza/Town{offlineTag}
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-mono">
            {isOfflineHit ? 'WB Place' : 'GIS Place'}
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
            setActiveIndex(0);
          }}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            setIsOpen(true);
            // Warm the offline West Bengal dataset (~29k places) in the
            // background so the first village search answers without network.
            prefetchWbGeoPlaces();
            void getWbGeoPlacesMeta().then((meta) => {
              if (meta) {
                setDatasetCount(meta.count);
                setDatasetSource(meta.source);
              }
            });
          }}
          placeholder="Search Place, Substation, Feeder, Mouza or GPS Coordinates..."
          className={`w-full bg-slate-900/95 hover:bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-16 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors shadow-lg ${
            compact ? 'py-1.5 text-xs' : 'py-2'
          }`}
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {(isLoadingLocal || isLoadingOnline) && (
            <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
          )}
          {query && (
            <button
              onClick={() => {
                setQuery('');
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

      {/* Auto-suggest Dropdown Menu — portaled to <body> so no toolbar/panel
          overflow or stacking context can clip it. */}
      {isOpen && menuBox && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: menuBox.left,
            top: menuBox.top,
            bottom: menuBox.bottom,
            width: menuBox.width,
            maxHeight: menuBox.maxHeight,
            zIndex: 4000,
          }}
          className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-xs flex flex-col animate-in fade-in slide-in-from-top-2"
        >
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
              All OpenStreetMap Places
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
            {searchError && (
              <div role="status" className="px-3 py-2 text-[11px] text-amber-300 bg-amber-950/30">
                {searchError}
              </div>
            )}

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

            {mergedResults.length === 0 ? (
              !searchError &&
              (isLoadingLocal ? (
                <div role="status" className="px-3 py-2 text-[11px] text-sky-300 bg-sky-950/30">
                  Loading West Bengal offline dataset… first search warms it up.
                </div>
              ) : isLoadingOnline ? (
                <div role="status" className="px-3 py-2 text-[11px] text-amber-300 bg-amber-950/30">
                  No instant match in the offline dataset — searching OpenStreetMap…
                </div>
              ) : query.trim().length < 2 ? (
                <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                  Type at least 2 letters to search the West Bengal land database — villages,
                  roads, landmarks, schools, shops and more.
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400">
                  <p className="font-medium text-slate-300 mb-1">No places found matching "{query}"</p>
                  <p className="text-[11px] text-slate-500">
                    Villages, landmarks, shops and street names are searched from the offline West
                    Bengal dataset and OpenStreetMap near your drawing area. Try shortening the
                    name, adding the nearby town, or enter GPS coordinates (e.g. 22.57, 88.36).
                  </p>
                </div>
              ))
            ) : (
              mergedResults.map((loc, idx) => {
                const offlineKey = `${loc.name.toLocaleLowerCase()}@${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
                const isOfflineHit = offlineKeys.has(offlineKey);
                return (
                <div
                  key={idx}
                  onClick={() => handleSelect(loc)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`p-3 cursor-pointer flex items-center justify-between group transition-colors ${
                    activeRow === idx ? 'bg-slate-800' : 'hover:bg-slate-800/90'
                  }`}
                >
                  <div className="flex flex-1 items-start gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-red-600/20 group-hover:border-red-500/50 border border-slate-700 flex items-center justify-center text-red-400 shrink-0 mt-0.5 transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span title={loc.name} className="basis-full min-w-0 font-bold text-white text-xs line-clamp-2 break-words">{loc.name}</span>
                        {isOfflineHit && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: wbGeoCategoryColor(loc.category ?? '') }}
                            title="From the West Bengal offline dataset"
                          />
                        )}
                        {getCategoryBadge(loc.category, isOfflineHit)}
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
                );
              })
            )}
          </div>
          <div className="px-3 py-1.5 text-[9px] text-slate-500 border-t border-slate-800 flex items-center justify-between gap-2">
            <span>
              ©{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-300 underline"
              >
                OpenStreetMap contributors
              </a>
            </span>
            <span title="Offline West Bengal land database (IndexedDB)">
              {datasetCount !== null
                ? `WB dataset · ${datasetCount.toLocaleString()} places${
                    datasetSource === 'indexeddb' ? ' · IndexedDB' : ''
                  }`
                : 'WB dataset · loading…'}
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
