/**
 * Location / Area Search Modal
 * Enables searching any area, mouza, feeder sector, or GPS coordinates,
 * centering the map, and placing the CAD drawing sheet directly at that location.
 */

import React, { useEffect, useState } from 'react';
import {
  Compass,
  MapPin,
  Move,
  Navigation,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { searchLocations, UTILITY_LOCATIONS_DATABASE } from '../../utils/locationService';
import { GeoLocation } from '../../types/electrical';

interface LocationSearchModalProps {
  isOpen: boolean;
  currentLocationName: string;
  onSelectLocation: (loc: GeoLocation, moveCanvasHere: boolean) => void;
  onClose: () => void;
}

export const LocationSearchModal: React.FC<LocationSearchModalProps> = ({
  isOpen,
  currentLocationName,
  onSelectLocation,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoLocation[]>(UTILITY_LOCATIONS_DATABASE.slice(0, 8));
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchLocations(query);
        setResults(res);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-950">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Search Area / Location</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Search utility sub-divisions, mouzas, highway crossings or enter GPS coordinates.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search area (e.g. Falakata, Birpara, Promod Nagar, 26.71, 89.28)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-sky-500 font-medium"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span>Popular:</span>
            {['Falakata', 'Promod Nagar', 'Birpara', 'Satpukuriya', 'Alipurduar'].map((pop) => (
              <button
                key={pop}
                onClick={() => setQuery(pop)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {pop}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {isSearching && (
            <div className="text-center py-4 text-slate-400 text-xs flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>Searching locations...</span>
            </div>
          )}

          {!isSearching && results.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              <MapPin className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No matching locations found for "{query}".</p>
              <p className="text-[11px] mt-1 text-slate-600">
                You can also enter coordinates directly, like <strong>26.7124, 89.2841</strong>.
              </p>
            </div>
          )}

          {results.map((loc, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-600/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors group"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm group-hover:text-sky-300 transition-colors">
                    {loc.name}
                  </span>
                  {loc.district && (
                    <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-medium">
                      {loc.district}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/50">
                    {loc.lat.toFixed(4)}° N, {loc.lng.toFixed(4)}° E
                  </span>
                </div>
                {loc.description && (
                  <p className="text-[11px] text-slate-400 leading-tight truncate">
                    {loc.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => {
                    onSelectLocation(loc, false);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
                  title="Center map on this area"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  <span>Center Map</span>
                </button>

                <button
                  onClick={() => {
                    onSelectLocation(loc, true);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow"
                  title="Move and place CAD Drawing Canvas Sheet right here"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>Place Canvas Here</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 px-6 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Current Location: <strong className="text-white">{currentLocationName || 'Falakata'}</strong></span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
