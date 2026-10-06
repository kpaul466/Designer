/**
 * GIS Map Underlay Component
 * 100% Canvas & Map Size Synchronization (1:1 Locked Framing)
 * Light Theme Matched with Canvas Drawing Workspace:
 * - Map frame background, cartography, and UI match the crisp light canvas theme
 * - Continuous Real-Time Google Maps Zoom (interpolated 12x to 20x zoom)
 * - Dynamic Slippy map tiles (ArcGIS World Satellite Imagery, OpenStreetMap, CartoDB Light Voyager)
 * - Google Maps style floating zoom controls (+, -, scale bar, preset feeder levels)
 * - High-contrast GPS pin marker with location details
 */

import React, { useMemo } from 'react';
import { CanvasBounds, GeoLocation } from '../../types/electrical';
import { MapPin, Crosshair, ZoomIn, ZoomOut, Layers } from 'lucide-react';

interface MapUnderlayProps {
  isVisible: boolean;
  opacity: number;
  mapType: 'satellite' | 'roadmap' | 'terrain' | 'osm';
  locationName: string;
  geoLocation?: GeoLocation;
  zoom: number; // Viewport zoom factor
  fitZoom?: number; // Minimum / fit-to-view zoom level
  panX: number;
  panY: number;
  isLocked: boolean;
  layerPosition?: 'underlay' | 'overlay';
  mapZoomLevel?: number; // Base Google Maps tile zoom (12 to 19, default 16)
  canvasBounds: CanvasBounds; // Map size is STRICTLY identical to canvas bounds
  onMapZoomIn?: () => void;
  onMapZoomOut?: () => void;
  onMapZoomLevelChange?: (level: number) => void;
  onPlaceCanvasHere?: (loc: GeoLocation) => void;
}

// Convert Lon/Lat to Slippy Tile coordinates
function lon2tile(lon: number, zoom: number) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
}

// Calculate approximate meters per pixel for given latitude and zoom level
function getMetersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

export const MapUnderlay: React.FC<MapUnderlayProps> = ({
  isVisible,
  opacity,
  mapType,
  locationName,
  geoLocation,
  zoom,
  fitZoom = 1.0,
  panX,
  panY,
  isLocked,
  layerPosition = 'underlay',
  mapZoomLevel = 16,
  canvasBounds,
  onMapZoomIn,
  onMapZoomOut,
  onMapZoomLevelChange,
  onPlaceCanvasHere,
}) => {
  if (!isVisible || opacity <= 0) return null;

  // Active coordinates (default to Falakata, WB distribution feeder)
  const centerLat = geoLocation?.lat ?? 26.7124;
  const centerLng = geoLocation?.lng ?? 89.2845;

  // Real-time continuous Google Maps zoom calculation:
  // As canvas zoom increases from fitZoom, continuous zoom increases smoothly
  const baseGoogleZoom = mapZoomLevel || 16;
  const zoomRatio = Math.max(zoom / Math.max(fitZoom, 0.05), 0.5);
  const continuousGoogleZoom = Math.min(Math.max(baseGoogleZoom + Math.log2(zoomRatio), 12), 20);

  // Integer tile zoom level for fetching imagery
  const tileZoom = Math.min(Math.max(Math.floor(continuousGoogleZoom), 12), 19);

  // Smooth sub-tile scale multiplier (1.000 to 1.999) matching real-time Google Maps zoom
  const subTileScale = Math.pow(2, continuousGoogleZoom - tileZoom);

  // 7x7 Tile Grid covering the canvas sheet
  const tiles = useMemo(() => {
    const centerTileX = lon2tile(centerLng, tileZoom);
    const centerTileY = lat2tile(centerLat, tileZoom);
    const result: { x: number; y: number; offsetX: number; offsetY: number; url: string }[] = [];

    const tileSize = 256;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        let url = '';

        if (mapType === 'satellite') {
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tileZoom}/${ty}/${tx}`;
        } else if (mapType === 'osm' || mapType === 'roadmap') {
          url = `https://tile.openstreetmap.org/${tileZoom}/${tx}/${ty}.png`;
        } else {
          url = `https://basemaps.cartocdn.com/rastertiles/voyager/${tileZoom}/${tx}/${ty}.png`;
        }

        result.push({
          x: tx,
          y: ty,
          offsetX: dx * tileSize,
          offsetY: dy * tileSize,
          url,
        });
      }
    }
    return result;
  }, [centerLat, centerLng, tileZoom, mapType]);

  const metersPerPixel = getMetersPerPixel(centerLat, continuousGoogleZoom);
  const scaleBarMeters = Math.round(metersPerPixel * 80);

  // Map size and canvas size are strictly 100% identical
  const mapWidth = canvasBounds.width;
  const mapHeight = canvasBounds.height;
  const mapX = canvasBounds.x;
  const mapY = canvasBounds.y;
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2;

  return (
    <div
      className={`absolute inset-0 pointer-events-${isLocked ? 'none' : 'auto'} overflow-hidden select-none ${
        layerPosition === 'overlay' ? 'z-10' : 'z-0'
      }`}
      style={{ opacity: opacity / 100 }}
    >
      {/* World Space Coordinate Transform Container */}
      <div
        className="w-full h-full relative"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Exact Canvas Bounding Box (Map size and Canvas size are 100% Identical in Light Theme) */}
        <div
          className="absolute rounded-xl overflow-hidden shadow-2xl bg-white border border-slate-300"
          style={{
            left: `${mapX}px`,
            top: `${mapY}px`,
            width: `${mapWidth}px`,
            height: `${mapHeight}px`,
          }}
        >
          {/* Continuous Real-Time Google Maps Tile Scaler */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${centerX}px`,
              top: `${centerY}px`,
              transform: `scale(${subTileScale})`,
              transformOrigin: '0 0',
            }}
          >
            <div
              className="absolute"
              style={{
                left: '-896px', // 7 * 256 / 2
                top: '-896px',
              }}
            >
              {tiles.map((tile) => (
                <img
                  key={`${tile.x}-${tile.y}-${tileZoom}`}
                  src={tile.url}
                  alt=""
                  loading="lazy"
                  crossOrigin="anonymous"
                  className="absolute pointer-events-none select-none"
                  style={{
                    width: '256px',
                    height: '256px',
                    left: `${896 + tile.offsetX}px`,
                    top: `${896 + tile.offsetY}px`,
                    imageRendering: 'auto',
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.opacity = '0';
                  }}
                />
              ))}
            </div>
          </div>

          {/* Proportional Vector Cartography Elements (Light-matched Theme) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              left: `${centerX}px`,
              top: `${centerY}px`,
              width: `${mapWidth}px`,
              height: `${mapHeight}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="crop-field-sat-light" width="100" height="70" patternUnits="userSpaceOnUse">
                  <rect width="100" height="70" fill="#16a34a" fillOpacity="0.08" stroke="#15803d" strokeWidth="0.5" strokeOpacity="0.15" />
                  <path d="M 0 25 L 100 25 M 0 50 L 100 50" stroke="#16a34a" strokeWidth="0.5" strokeOpacity="0.12" />
                </pattern>
              </defs>

              {/* Sub-division Agricultural Plots */}
              <rect x="50" y="80" width={mapWidth * 0.35} height={mapHeight * 0.35} fill="url(#crop-field-sat-light)" />
              <rect x={mapWidth * 0.55} y="100" width={mapWidth * 0.4} height={mapHeight * 0.3} fill="url(#crop-field-sat-light)" />

              {/* River Crossing Corridor */}
              <path
                d={`M 0 ${mapHeight * 0.65} Q ${mapWidth * 0.3} ${mapHeight * 0.55}, ${mapWidth * 0.6} ${mapHeight * 0.7} T ${mapWidth} ${mapHeight * 0.62}`}
                fill="none"
                stroke="#0284c7"
                strokeWidth="18"
                strokeLinecap="round"
                opacity="0.65"
              />
              <path
                d={`M 0 ${mapHeight * 0.65} Q ${mapWidth * 0.3} ${mapHeight * 0.55}, ${mapWidth * 0.6} ${mapHeight * 0.7} T ${mapWidth} ${mapHeight * 0.62}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="10 5"
                opacity="0.9"
              />

              {/* Primary Feeder Highway (NH-31D) */}
              <path d={`M 0 ${mapHeight * 0.32} L ${mapWidth} ${mapHeight * 0.32}`} fill="none" stroke="#334155" strokeWidth="8" opacity="0.8" />
              <path d={`M 0 ${mapHeight * 0.32} L ${mapWidth} ${mapHeight * 0.32}`} fill="none" stroke="#f59e0b" strokeWidth="4" opacity="0.85" />
              <path d={`M 0 ${mapHeight * 0.32} L ${mapWidth} ${mapHeight * 0.32}`} fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="8 6" />

              {/* Secondary Feeder Roads */}
              <path d={`M ${mapWidth * 0.3} 0 L ${mapWidth * 0.3} ${mapHeight}`} fill="none" stroke="#64748b" strokeWidth="4.5" opacity="0.7" />
              <path d={`M ${mapWidth * 0.3} 0 L ${mapWidth * 0.3} ${mapHeight}`} fill="none" stroke="#e2e8f0" strokeWidth="2" opacity="0.9" />
            </svg>
          </div>

          {/* Center GPS Place Marker */}
          {geoLocation && (
            <div
              className="absolute pointer-events-auto cursor-pointer group"
              style={{
                left: `${centerX}px`,
                top: `${centerY}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {/* Radar pulse ripples */}
              <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
                <span className="absolute w-8 h-8 -left-4 -top-4 rounded-full bg-red-500/40 animate-ping" />
                <span className="absolute w-4 h-4 -left-2 -top-2 rounded-full bg-red-600 shadow-md shadow-red-500/50" />
              </div>

              {/* Pin Icon with Drop Shadow */}
              <div className="relative flex flex-col items-center animate-bounce">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xl border-2 border-white">
                  <MapPin className="w-4 h-4 fill-white" />
                </div>
                <div className="w-1 h-2 bg-red-600 rounded-b" />
              </div>

              {/* Pin Info Popup Card (Light Theme) */}
              <div className="mt-1 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl text-[10.5px] text-slate-800 flex flex-col items-center whitespace-nowrap min-w-[130px]">
                <span className="font-bold tracking-tight text-slate-900">{geoLocation.name}</span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {centerLat.toFixed(4)}° N, {centerLng.toFixed(4)}° E
                </span>
                {onPlaceCanvasHere && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaceCanvasHere(geoLocation);
                    }}
                    className="mt-1 px-2.5 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[9.5px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Place Canvas Center</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1:1 Page Size & Map Synchronization Tag (Light Theme) */}
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-white/95 border border-sky-400 text-[10px] text-sky-800 font-mono font-bold flex items-center gap-1.5 shadow-sm pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>GIS Map Locked to Page ({mapWidth} × {mapHeight})</span>
          </div>
        </div>
      </div>

      {/* ---------------- REAL-TIME GOOGLE MAPS FLOATING CONTROLS DOCK (Light Theme) ---------------- */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Coordinates, Provider & Scale Bar */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-center gap-2.5 shadow-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-900 tracking-tight">
            {locationName || 'Falakata Distribution Feeder'}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-mono text-[11px]">
            {centerLat.toFixed(4)}° N, {centerLng.toFixed(4)}° E
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-sky-700 font-semibold uppercase text-[10px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            {mapType.toUpperCase()}
          </span>

          {/* Scale Bar */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <div className="w-12 h-1 border-b-2 border-l-2 border-r-2 border-slate-800" />
            <span className="text-[10px] font-mono text-slate-600">{scaleBarMeters} m</span>
          </div>
        </div>

        {/* Google Maps Style Real-Time Zoom Pill */}
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-center gap-2 shadow-xl w-fit">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Google Map Zoom:
          </span>
          {onMapZoomOut && (
            <button
              onClick={onMapZoomOut}
              className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
              title="Zoom out Google Maps layer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="font-mono font-bold text-[11px] text-sky-700 px-1">
            {continuousGoogleZoom.toFixed(1)}x (Lvl {tileZoom})
          </span>
          {onMapZoomIn && (
            <button
              onClick={onMapZoomIn}
              className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
              title="Zoom in Google Maps layer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Preset Zoom Levels */}
          {onMapZoomLevelChange && (
            <div className="flex items-center gap-1">
              {[
                { label: 'Village', level: 15 },
                { label: 'Feeder', level: 16 },
                { label: 'Street', level: 17 },
                { label: 'Pole', level: 19 },
              ].map((lvl) => (
                <button
                  key={lvl.level}
                  onClick={() => onMapZoomLevelChange(lvl.level)}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-medium transition-colors ${
                    tileZoom === lvl.level
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
