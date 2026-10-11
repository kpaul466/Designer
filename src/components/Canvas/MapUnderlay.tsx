/**
 * GIS Map Underlay Component
 * OpenLayers map viewport matches the fixed-size drawing sheet
 * Light Theme Matched with Canvas Drawing Workspace:
 * - Map frame and cartography are clipped exactly to the page bounds
 * - Continuous real-time basemap zoom (interpolated 12x to 20x zoom)
 * - OpenStreetMap raster tiles
 * - Floating zoom controls (+, -, scale bar, preset feeder levels)
 * - High-contrast GPS pin marker with location details
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  CanvasBounds,
  GeoLocation,
  MapFeatureSelection,
  MapRoadCandidate,
} from '../../types/electrical';
import { MapPin, Crosshair, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import DragPan from 'ol/interaction/DragPan.js';
import Geometry from 'ol/geom/Geometry.js';
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import { Fill, Stroke, Style, Text } from 'ol/style.js';
import OSM from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import {
  CachedOSMElement,
  readOSMFeatureCache,
  writeOSMFeatureCache,
} from '../../services/osmFeatureCache';
import 'ol/ol.css';

interface MapUnderlayProps {
  isVisible: boolean;
  opacity: number;
  locationName: string;
  geoLocation?: GeoLocation;
  zoom: number; // Viewport zoom factor
  fitZoom?: number; // Minimum / fit-to-view zoom level
  panX: number;
  panY: number;
  isLocked: boolean;
  layerPosition?: 'underlay' | 'overlay';
  mapZoomLevel?: number; // Base map tile zoom (12 to 19, default 16)
  canvasBounds: CanvasBounds;
  onMapZoomIn?: () => void;
  onMapZoomOut?: () => void;
  onMapZoomLevelChange?: (level: number) => void;
  onPlaceCanvasHere?: (loc: GeoLocation) => void;
  onMapCenterChange?: (lat: number, lng: number) => void;
  onRoadFeaturesChange?: (roads: MapRoadCandidate[]) => void;
  mapFeatures?: MapFeatureSelection;
  printMode?: boolean;
}

// Calculate approximate meters per pixel for given latitude and zoom level
function getMetersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

function getOSMCacheBounds(
  extent: [number, number, number, number],
  zoom: number
): { key: string; bounds: [number, number, number, number] } {
  const gridSize = zoom >= 18 ? 0.002 : zoom >= 16 ? 0.008 : 0.025;
  const [west, south, east, north] = extent;
  const bounds: [number, number, number, number] = [
    Math.floor(west / gridSize) * gridSize,
    Math.floor(south / gridSize) * gridSize,
    Math.ceil(east / gridSize) * gridSize,
    Math.ceil(north / gridSize) * gridSize,
  ];
  const key = bounds.map((coordinate) => coordinate.toFixed(6)).join(',');
  return { key, bounds };
}

function featuresFromOSM(elements: CachedOSMElement[]): Feature<Geometry>[] {
  const seenElements = new Set<string>();
  const features: Feature<Geometry>[] = [];
  elements.forEach((element) => {
    const key = element.type && element.id !== undefined ? `${element.type}/${element.id}` : undefined;
    if (key && seenElements.has(key)) return;
    if (key) seenElements.add(key);

    const name = element.tags?.name?.trim();
    const highway = element.tags?.highway;
    const waterway = element.tags?.waterway;
    if (highway && element.geometry && element.geometry.length > 1) {
      features.push(
        new Feature({
          geometry: new LineString(
            element.geometry.map(({ lat, lon }) => fromLonLat([lon, lat]))
          ),
          name: name || '',
          highway,
          osmId: key || '',
          kind: 'road-line',
        })
      );
      return;
    }
    if (waterway && element.geometry && element.geometry.length > 1) {
      features.push(
        new Feature({
          geometry: new LineString(
            element.geometry.map(({ lat, lon }) => fromLonLat([lon, lat]))
          ),
          name: name || '',
          waterway,
          kind: 'river-line',
        })
      );
      return;
    }

    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!name || lat === undefined || lon === undefined) return;
    features.push(
      new Feature({
        geometry: new Point(fromLonLat([lon, lat])),
        name,
        kind: 'place',
      })
    );
  });
  return features;
}

function roadCandidatesFromFeatures(
  map: Map,
  source: VectorSource<Feature<Geometry>>,
  canvasBounds: CanvasBounds
): MapRoadCandidate[] {
  return source.getFeatures().flatMap((feature) => {
    if (feature.get('kind') !== 'road-line') return [];
    const geometry = feature.getGeometry();
    const id = String(feature.get('osmId') || '');
    if (!(geometry instanceof LineString) || !id) return [];
    const points = geometry.getCoordinates().flatMap((coordinate) => {
      const pixel = map.getPixelFromCoordinate(coordinate);
      return pixel ? [{ x: canvasBounds.x + pixel[0], y: canvasBounds.y + pixel[1] }] : [];
    });
    return points.length > 1
      ? [{ id, name: String(feature.get('name') || 'Unnamed road'), points }]
      : [];
  });
}

export const MapUnderlay: React.FC<MapUnderlayProps> = ({
  isVisible,
  opacity,
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
  onMapCenterChange,
  onRoadFeaturesChange,
  mapFeatures = { roads: true, rivers: true, streetNames: true, placeNames: true, crossings: true },
  printMode = false,
}) => {
  const mapTargetRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const canvasBoundsRef = useRef(canvasBounds);
  const localFeaturesRef = useRef(new VectorSource<Feature<Geometry>>());
  const outerZoomRef = useRef(zoom);
  const mapFeaturesRef = useRef(mapFeatures);
  const onMapCenterChangeRef = useRef(onMapCenterChange);
  const onRoadFeaturesChangeRef = useRef(onRoadFeaturesChange);
  const isLockedRef = useRef(isLocked);
  const isDraggingMapRef = useRef(false);
  const [localNamesStatus, setLocalNamesStatus] = useState('Loading local names…');

  useEffect(() => {
    canvasBoundsRef.current = canvasBounds;
  }, [canvasBounds]);

  useEffect(() => {
    outerZoomRef.current = zoom;
    mapRef.current?.render();
  }, [zoom]);

  useEffect(() => {
    mapFeaturesRef.current = mapFeatures;
    mapRef.current?.render();
  }, [mapFeatures]);

  useEffect(() => {
    onMapCenterChangeRef.current = onMapCenterChange;
    onRoadFeaturesChangeRef.current = onRoadFeaturesChange;
    isLockedRef.current = isLocked;
  }, [onMapCenterChange, onRoadFeaturesChange, isLocked]);

  // Active coordinates (default to Falakata, WB distribution feeder)
  const centerLat = geoLocation?.lat ?? 26.7124;
  const centerLng = geoLocation?.lng ?? 89.2845;

  // Real-time continuous basemap zoom calculation:
  // As canvas zoom increases from fitZoom, continuous zoom increases smoothly
  const baseMapZoom = mapZoomLevel || 16;
  const zoomRatio = Math.max(zoom / Math.max(fitZoom, 0.05), 0.5);
  const continuousMapZoom = Math.min(Math.max(baseMapZoom + Math.log2(zoomRatio), 12), 19);
  const tileZoom = Math.floor(continuousMapZoom);

  useEffect(() => {
    if (!isVisible || opacity <= 0 || !mapTargetRef.current || mapRef.current) return;

    const map = new Map({
      target: mapTargetRef.current,
      layers: [
        new TileLayer({ source: new OSM({ crossOrigin: 'anonymous' }) }),
        new VectorLayer({
          source: localFeaturesRef.current,
          declutter: true,
          style: (feature) => {
            const screenScale = 1 / Math.max(outerZoomRef.current, 0.1);
            if (feature.get('kind') === 'road-line') {
              if (!mapFeaturesRef.current.roads) return undefined;
              const highway = String(feature.get('highway') || '');
              const isAlleyOrPath = highway === 'service' || highway === 'track' || highway === 'path' ||
                highway === 'footway' || highway === 'pedestrian' || highway === 'cycleway' ||
                highway === 'living_street' || highway === 'residential' || highway === 'unclassified';
              const width = isAlleyOrPath
                ? 2.4 * screenScale
                : highway === 'motorway' || highway === 'trunk' || highway === 'primary'
                  ? 4 * screenScale
                  : 3.2 * screenScale;
              const roadStyles = [
                new Style({
                  stroke: new Stroke({ color: 'rgba(255,255,255,0.94)', width: width + 1.6 * screenScale }),
                }),
                new Style({
                  stroke: new Stroke({ color: isAlleyOrPath ? '#78716c' : '#a16207', width }),
                }),
              ];
              const name = mapFeaturesRef.current.streetNames ? String(feature.get('name') || '') : '';
              if (!name) return roadStyles;
              return [
                ...roadStyles,
                new Style({
                  text: new Text({
                    text: name,
                    placement: 'line',
                    repeat: 180 * screenScale,
                    maxAngle: 0.45,
                    font: `600 ${12 * screenScale}px "Plus Jakarta Sans", sans-serif`,
                    fill: new Fill({ color: '#334155' }),
                    stroke: new Stroke({ color: 'rgba(255,255,255,0.96)', width: 3 * screenScale }),
                    overflow: true,
                  }),
                }),
              ];
            }

            if (feature.get('kind') === 'river-line') {
              if (!mapFeaturesRef.current.rivers) return undefined;
              const riverStyles = [
                new Style({
                  stroke: new Stroke({ color: 'rgba(255,255,255,0.92)', width: 4 * screenScale }),
                }),
                new Style({
                  stroke: new Stroke({ color: '#0284c7', width: 2.4 * screenScale }),
                }),
              ];
              const name = mapFeaturesRef.current.streetNames ? String(feature.get('name') || '') : '';
              return name
                ? [
                    ...riverStyles,
                    new Style({
                      text: new Text({
                        text: name,
                        placement: 'line',
                        repeat: 220 * screenScale,
                        font: `600 ${11 * screenScale}px "Plus Jakarta Sans", sans-serif`,
                        fill: new Fill({ color: '#075985' }),
                        stroke: new Stroke({ color: 'rgba(255,255,255,0.96)', width: 3 * screenScale }),
                        overflow: true,
                      }),
                    }),
                  ]
                : riverStyles;
            }

            if (!mapFeaturesRef.current.placeNames) return undefined;
            return new Style({
              text: new Text({
                text: String(feature.get('name') || ''),
                font: `600 ${12 * screenScale}px "Plus Jakarta Sans", sans-serif`,
                fill: new Fill({ color: '#0f172a' }),
                stroke: new Stroke({ color: 'rgba(255,255,255,0.96)', width: 3 * screenScale }),
                offsetY: -4 * screenScale,
                overflow: false,
              }),
            });
          },
        }),
      ],
      view: new View({
        center: fromLonLat([centerLng, centerLat]),
        zoom: continuousMapZoom,
        minZoom: 12,
        maxZoom: 19,
      }),
      controls: defaultControls({ zoom: false, rotate: false, attribution: false }),
      interactions: [],
    });
    mapRef.current = map;
    map.on('pointerdrag', () => {
      isDraggingMapRef.current = true;
    });
    map.on('moveend', () => {
      if (!isDraggingMapRef.current) return;
      isDraggingMapRef.current = false;
      if (isLockedRef.current) return;
      const center = map.getView().getCenter();
      if (!center) return;
      const [lng, lat] = toLonLat(center);
      onMapCenterChangeRef.current?.(lat, lng);
    });
    map.updateSize();
    map.on('moveend', () => {
      onRoadFeaturesChangeRef.current?.(
        roadCandidatesFromFeatures(map, localFeaturesRef.current, canvasBoundsRef.current)
      );
    });

    return () => {
      map.setTarget(undefined);
      map.dispose();
      mapRef.current = null;
    };
  }, [isVisible && opacity > 0]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isVisible || opacity <= 0) return;

    let controller: AbortController | undefined;
    let disposed = false;
    const timeout = window.setTimeout(async () => {
      const view = map.getView();
      const mapSize = map.getSize();
      if (!mapSize) return;

      if (view.getZoom() !== undefined && view.getZoom()! < 14) {
        localFeaturesRef.current.clear();
        setLocalNamesStatus('Zoom in to level 14 to load local names');
        return;
      }

      const extent = view.calculateExtent(mapSize);
      const geographicExtent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326') as [
        number,
        number,
        number,
        number,
      ];
      const { key, bounds } = getOSMCacheBounds(geographicExtent, continuousMapZoom);
      const bbox = `${bounds[1]},${bounds[0]},${bounds[3]},${bounds[2]}`;
      const query = `[out:json][timeout:20][maxsize:33554432];(way["highway"](${bbox});way["waterway"](${bbox}););out tags geom;(node["name"](${bbox});way["name"](${bbox});relation["name"](${bbox}););out center tags;`;

      let cachedElements: CachedOSMElement[] | null = null;
      try {
        cachedElements = await readOSMFeatureCache(key);
      } catch (error) {
        if (disposed) return;
        setLocalNamesStatus(
          `Local database unavailable: ${error instanceof Error ? error.message : 'read failed'}`
        );
      }

      if (disposed) return;
      if (cachedElements) {
        const cachedFeatures = featuresFromOSM(cachedElements);
        localFeaturesRef.current.clear();
        localFeaturesRef.current.addFeatures(cachedFeatures);
        map.renderSync();
        onRoadFeaturesChangeRef.current?.(
          roadCandidatesFromFeatures(map, localFeaturesRef.current, canvasBounds)
        );
        const cachedRoadCount = cachedFeatures.filter((feature) => feature.get('kind') === 'road-line').length;
        setLocalNamesStatus(
          `Local database · ${cachedRoadCount} streets · ${cachedFeatures.length - cachedRoadCount} names`
        );
      } else {
        localFeaturesRef.current.clear();
        setLocalNamesStatus('Loading local names…');
      }

      controller = new AbortController();
      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`OpenStreetMap local data request failed (${response.status}).`);

        const result = (await response.json()) as { elements?: CachedOSMElement[] };
        const elements = result.elements || [];
        const features = featuresFromOSM(elements);
        localFeaturesRef.current.clear();
        localFeaturesRef.current.addFeatures(features);
        map.renderSync();
        onRoadFeaturesChangeRef.current?.(
          roadCandidatesFromFeatures(map, localFeaturesRef.current, canvasBounds)
        );
        const roadCount = features.filter((feature) => feature.get('kind') === 'road-line').length;
        const nameCount = features.length - roadCount;
        try {
          await writeOSMFeatureCache(key, elements);
          if (!disposed) setLocalNamesStatus(`Saved locally · ${roadCount} streets · ${nameCount} names`);
        } catch (error) {
          if (!disposed) {
            setLocalNamesStatus(
              `Loaded ${roadCount} streets · ${nameCount} names; local save failed: ${
                error instanceof Error ? error.message : 'database write failed'
              }`
            );
          }
        }
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === 'AbortError')) return;
        if (cachedElements) {
          setLocalNamesStatus('Offline · showing saved OpenStreetMap data');
        } else {
          localFeaturesRef.current.clear();
          setLocalNamesStatus(error instanceof Error ? error.message : 'Unable to load local names.');
        }
      }
    }, 450);

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller?.abort();
    };
  }, [centerLat, centerLng, continuousMapZoom, isVisible, opacity, canvasBounds.x, canvasBounds.y, canvasBounds.width, canvasBounds.height]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const interactions = map.getInteractions();
    interactions.clear();
    if (!isLocked) interactions.push(new DragPan());
  }, [isLocked, isVisible, opacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isVisible || opacity <= 0) return;
    map.getView().setCenter(fromLonLat([centerLng, centerLat]));
    map.getView().setZoom(continuousMapZoom);
    map.updateSize();
  }, [
    centerLat,
    centerLng,
    continuousMapZoom,
    isVisible,
    opacity,
    canvasBounds.width,
    canvasBounds.height,
    zoom,
  ]);

  if (!isVisible || opacity <= 0) return null;

  const metersPerPixel = getMetersPerPixel(centerLat, continuousMapZoom);
  const scaleBarMeters = Math.round(metersPerPixel * 80);

  const centerX = canvasBounds.width / 2;
  const centerY = canvasBounds.height / 2;
  const attribution = '© OpenStreetMap contributors';

  return (
    <div
      className={`absolute inset-0 ${
        isLocked ? 'pointer-events-none' : 'pointer-events-auto'
      } overflow-hidden select-none ${
        layerPosition === 'overlay' ? 'z-10' : 'z-0'
      }`}
      style={{ opacity: opacity / 100 }}
    >
      {/* Match the drawing sheet's world-space transform and bounds. */}
      <div
        className="w-full h-full relative"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <div
          className="absolute overflow-hidden"
          style={{
            left: printMode ? 0 : `${canvasBounds.x}px`,
            top: printMode ? 0 : `${canvasBounds.y}px`,
            width: printMode ? '100%' : `${canvasBounds.width}px`,
            height: printMode ? '100%' : `${canvasBounds.height}px`,
          }}
        >
          <div
            ref={mapTargetRef}
            className={`absolute inset-0 ${isLocked ? 'pointer-events-none' : 'pointer-events-auto cursor-grab active:cursor-grabbing'}`}
            aria-label="OpenStreetMap with local place names"
          />

          {layerPosition === 'overlay' && (
            <div
              className="absolute z-10 border-2 border-sky-400 pointer-events-none"
              style={{
                inset: 0,
              }}
            />
          )}

          {/* Center GPS Place Marker */}
          {geoLocation && !printMode && (
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
          {!printMode && <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-white/95 border border-sky-400 text-[10px] text-sky-800 font-mono font-bold flex items-center gap-1.5 shadow-sm pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>OpenStreetMap · Fixed sheet ({canvasBounds.width} × {canvasBounds.height})</span>
          </div>}

          {!printMode && <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-1 right-2 z-10 bg-white/85 px-1.5 py-0.5 rounded text-[8px] text-slate-700 hover:text-sky-700 pointer-events-auto"
          >
            {attribution}
          </a>}
          {printMode && (
            <span className="absolute bottom-1 right-2 z-10 bg-white/85 px-1.5 py-0.5 rounded text-[8px] text-slate-700 pointer-events-none">
              {attribution}
            </span>
          )}
          {!printMode && <div className="absolute top-2 right-2 z-10 rounded-md bg-white/90 border border-slate-200 px-2 py-1 text-[9px] font-medium text-slate-600 shadow-sm pointer-events-none">
            {localNamesStatus}
          </div>}
        </div>
      </div>

      {/* ---------------- REAL-TIME BASEMAP FLOATING CONTROLS DOCK (Light Theme) ---------------- */}
      {!printMode && (
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
            OPENSTREETMAP
          </span>

          {/* Scale Bar */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <div className="w-12 h-1 border-b-2 border-l-2 border-r-2 border-slate-800" />
            <span className="text-[10px] font-mono text-slate-600">{scaleBarMeters} m</span>
          </div>
        </div>

        {/* Real-time basemap zoom pill */}
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-center gap-2 shadow-xl w-fit">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Basemap Zoom:
          </span>
          {onMapZoomOut && (
            <button
              onClick={onMapZoomOut}
              className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
              title="Zoom out basemap"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="font-mono font-bold text-[11px] text-sky-700 px-1">
            {continuousMapZoom.toFixed(1)}x (Lvl {tileZoom})
          </span>
          {onMapZoomIn && (
            <button
              onClick={onMapZoomIn}
              className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
              title="Zoom in basemap"
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
                  onClick={() =>
                    onMapZoomLevelChange(
                      Math.min(Math.max(lvl.level - Math.log2(zoomRatio), 12), 19)
                    )
                  }
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

        {/* Map Zoom Slider */}
        {onMapZoomLevelChange && (
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 flex items-center gap-2.5 shadow-xl w-full">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Map Zoom
            </span>
            <input
              type="range"
              min="12"
              max="19"
              step="0.1"
              value={baseMapZoom}
              onChange={(e) => onMapZoomLevelChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              aria-label="Basemap zoom level"
            />
            <span className="font-mono font-bold text-[10px] text-sky-700 w-8 text-right">
              {baseMapZoom.toFixed(1)}
            </span>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
