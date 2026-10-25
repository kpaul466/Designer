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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CanvasBounds,
  GeoLocation,
  GeoReference,
  MapFeatureSelection,
  MapRoadCandidate,
} from '../../types/electrical';
import { MapPin, Crosshair, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import Feature, { FeatureLike } from 'ol/Feature.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Overlay from 'ol/Overlay.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import DragPan from 'ol/interaction/DragPan.js';
import Geometry from 'ol/geom/Geometry.js';
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import CircleStyle from 'ol/style/Circle.js';
import { Fill, Stroke, Style, Text } from 'ol/style.js';
import OSM from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import {
  CachedOSMElement,
  readOSMFeatureCache,
  writeOSMFeatureCache,
} from '../../services/osmFeatureCache';
import {
  WbGeoPlace,
  getWbGeoPlacesSource,
  isGenericStreetName,
  loadWbGeoPlaces,
  placeToGeoLocation,
  selectPlacesForMapExtent,
  wbGeoCategoryColor,
  wbGeoCategoryRadius,
} from '../../utils/wbGeoPlaces';
import 'ol/ol.css';

interface MapUnderlayProps {
  isVisible: boolean;
  opacity: number;
  locationName: string;
  geoLocation?: GeoLocation;
  /** Fixed sheet calibration shared by pole GPS and the printed map. */
  geoReference?: GeoReference;
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
  /** Fires when the map and its visible tiles have finished rendering. */
  onRenderComplete?: () => void;
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

/** Slippy-map zoom level for a map resolution (EPSG:3857, 256px tiles). */
function zoomForResolution(resolution: number): number {
  return Math.log2(156543.03392 / Math.max(resolution, 1e-9));
}

/** Turns selected dataset records into map dot features. */
/**
 * Style factory for the WB places marker layer: category-coloured dots with
 * name labels that switch on at high zoom (only while the placeNames toggle
 * allows text labels). Sizes counteract the outer sheet zoom so markers keep a
 * constant screen size.
 */
function createWbPlacesStyle(
  mapFeaturesRef: React.MutableRefObject<MapFeatureSelection>,
  outerZoomRef: React.MutableRefObject<number>
) {
  return (feature: FeatureLike, resolution: number): Style | Style[] | undefined => {
    const settings = mapFeaturesRef.current;
    if (!settings || !settings.wbPlaces) return undefined;

    const place = feature.get('wbPlace') as WbGeoPlace | undefined;
    if (!place) return undefined;

    const screenScale = 1 / Math.max(outerZoomRef.current, 0.1);
    const radius = wbGeoCategoryRadius(place.category) * screenScale;
    const color = wbGeoCategoryColor(place.category);

    const styles: Style[] = [
      new Style({
        image: new CircleStyle({
          radius,
          fill: new Fill({ color }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.95)', width: 1.6 * screenScale }),
        }),
      }),
    ];

    const zoom = zoomForResolution(resolution);
    // Habitations (villages/towns) label before POI dots, which stay dots until
    // the user is zoomed far in; text follows the placeNames toggle. The font
    // grows with the basemap zoom so names stay readable all the way in.
    const labelZoom = place.category === 'locality' ? 15.2 : 16.6;
    if (settings.placeNames && zoom >= labelZoom && place.name) {
      const fontPx = 13.5 + Math.min(Math.max(zoom - labelZoom, 0), 3.5);
      styles.push(
        new Style({
          text: new Text({
            text: place.name,
            font: `600 ${fontPx * screenScale}px "Plus Jakarta Sans", sans-serif`,
            fill: new Fill({ color: '#0f172a' }),
            stroke: new Stroke({ color: 'rgba(255,255,255,0.96)', width: 3.4 * screenScale }),
            offsetY: -(radius + 9 * screenScale),
            overflow: false,
          }),
        })
      );
    }
    return styles;
  };
}

/**
 * Builds the WB place popup card (light theme, safe text insertion only) into
 * the shared overlay element.
 */
function buildWbPlacePopup(
  popupEl: HTMLDivElement,
  feature: Feature<Geometry>,
  onPlaceCanvasHere: (loc: GeoLocation) => void,
  close: () => void
): void {
  const place = feature.get('wbPlace') as WbGeoPlace | undefined;
  if (!place) return;

  popupEl.innerHTML = '';
  popupEl.className =
    'pointer-events-auto w-max min-w-[190px] max-w-[280px] rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md px-3 py-2 shadow-2xl text-[11px] text-slate-800';
  const root = document.createElement('div');
  root.className = 'flex flex-col gap-1';

  // Title row + close button
  const header = document.createElement('div');
  header.className = 'flex items-start justify-between gap-2';
  const title = document.createElement('span');
  title.className = 'font-bold text-slate-900 break-words leading-tight';
  title.textContent = place.name;
  header.appendChild(title);
  const closeButton = document.createElement('button');
  closeButton.className =
    'shrink-0 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors';
  closeButton.setAttribute('aria-label', 'Close place details');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => close());
  header.appendChild(closeButton);
  root.appendChild(header);

  // Category + sub-type chip
  const chipRow = document.createElement('div');
  chipRow.className = 'flex items-center gap-1.5';
  const dot = document.createElement('span');
  dot.className = 'w-2 h-2 rounded-full shrink-0';
  dot.style.backgroundColor = wbGeoCategoryColor(place.category);
  chipRow.appendChild(dot);
  const chip = document.createElement('span');
  chip.className =
    'px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-[9.5px] font-semibold text-sky-800 truncate';
  chip.textContent = place.subType || place.category || 'Place';
  chipRow.appendChild(chip);
  root.appendChild(chipRow);

  // Contextual rows
  const rows: Array<[string, string]> = [];
  if (place.address && !isGenericStreetName(place.address) && place.address !== place.streetName) {
    rows.push(['Address', place.address]);
  } else if (place.streetName && !isGenericStreetName(place.streetName)) {
    rows.push(['Street', place.streetName]);
  }
  if (place.city || place.areaName) rows.push(['Area', [place.areaName, place.city].filter(Boolean).join(', ')]);
  if (place.district) rows.push(['District', place.district]);
  if (place.phone) rows.push(['Phone', place.phone]);

  const dl = document.createElement('div');
  dl.className = 'flex flex-col gap-0.5';
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'flex gap-1.5 items-baseline';
    const labelEl = document.createElement('span');
    labelEl.className = 'text-slate-400 shrink-0 w-12 text-right text-[9.5px]';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'min-w-0 flex-1 break-words';
    labelEl.textContent = label;
    if (label === 'Phone') {
      const tel = document.createElement('a');
      tel.textContent = value;
      tel.className = 'text-sky-700 hover:underline';
      tel.href = `tel:${value.replace(/[^+\d]/g, '')}`;
      valueEl.appendChild(tel);
    } else {
      valueEl.textContent = value;
    }
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    dl.appendChild(row);
  }
  if (dl.childElementCount > 0) root.appendChild(dl);

  // Coordinates
  const coords = document.createElement('div');
  coords.className = 'text-slate-500 font-mono text-[9.5px]';
  coords.textContent = `${place.lat.toFixed(4)}° N, ${place.lng.toFixed(4)}° E`;
  root.appendChild(coords);

  // Website (safe full URL check only)
  if (/^https?:\/\//i.test(place.website)) {
    const link = document.createElement('a');
    link.textContent = place.website.replace(/^https?:\/\//, '').slice(0, 40);
    link.href = place.website;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'text-sky-700 hover:underline break-all';
    root.appendChild(link);
  }

  // Action: reposition the drawing sheet at this place
  const actions = document.createElement('div');
  actions.className = 'mt-1 flex justify-center';
  const placeButton = document.createElement('button');
  placeButton.className =
    'px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[9.5px] font-bold flex items-center gap-1 shadow-sm transition-colors';
  placeButton.textContent = 'Place Canvas Here';
  placeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    close();
    onPlaceCanvasHere(placeToGeoLocation(place));
  });
  actions.appendChild(placeButton);
  root.appendChild(actions);

  popupEl.appendChild(root);
}

export const MapUnderlay: React.FC<MapUnderlayProps> = ({
  isVisible,
  opacity,
  locationName,
  geoLocation,
  geoReference,
  zoom,
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
  mapFeatures = {
    roads: true,
    rivers: true,
    streetNames: true,
    placeNames: true,
    crossings: true,
    wbPlaces: true,
  },
  printMode = false,
  onRenderComplete,
}) => {
  const mapTargetRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const canvasBoundsRef = useRef(canvasBounds);
  const localFeaturesRef = useRef(new VectorSource<Feature<Geometry>>());
  const outerZoomRef = useRef(zoom);
  const mapFeaturesRef = useRef(mapFeatures);
  const onMapCenterChangeRef = useRef(onMapCenterChange);
  const onRoadFeaturesChangeRef = useRef(onRoadFeaturesChange);
  const onRenderCompleteRef = useRef(onRenderComplete);
  const isLockedRef = useRef(isLocked);
  const isDraggingMapRef = useRef(false);
  const [localNamesStatus, setLocalNamesStatus] = useState('Loading local names…');
  const [mapPixelWidth, setMapPixelWidth] = useState(canvasBounds.width);

  // Active coordinates (default to Falakata, WB distribution feeder)
  const centerLat = geoReference?.centerLat ?? geoLocation?.lat ?? 26.7124;
  const centerLng = geoReference?.centerLng ?? geoLocation?.lng ?? 89.2845;

  // --- West Bengal offline places (dataset markers + popup) ---
  const wbPlacesSourceRef = useRef(new VectorSource<Feature<Geometry>>());
  const wbPlacesDataRef = useRef<WbGeoPlace[] | null>(null);
  const wbPopupOverlayRef = useRef<Overlay | null>(null);
  const onPlaceCanvasHereRef = useRef(onPlaceCanvasHere);
  const printModeRef = useRef(printMode);
  const wbRebuildTimerRef = useRef<number>(0);
  const [wbPlacesStatus, setWbPlacesStatus] = useState('');

  /**
   * Re-selects WB place markers for the current map extent (called on view
   * changes and when the dataset finishes loading). Skipped in print mode —
   * the printed sheet rebuild is handled by the layer itself.
   */
  const rebuildWbPlaces = useCallback(() => {
    const map = mapRef.current;
    const places = wbPlacesDataRef.current;
    if (!map || !places) return;
    const size = map.getSize();
    if (!size || size[0] <= 0 || size[1] <= 0) return;
    if (!mapFeaturesRef.current.wbPlaces) {
      setWbPlacesStatus('');
      return;
    }

    const view = map.getView();
    const zoom = view.getZoom() ?? 16;
    if (zoom < 14) {
      if (wbPlacesSourceRef.current.getFeatures().length > 0) {
        wbPlacesSourceRef.current.clear();
        map.render();
      }
      setWbPlacesStatus('Zoom to level 14+ to show dataset places');
      return;
    }

    const extent = transformExtent(view.calculateExtent(size), 'EPSG:3857', 'EPSG:4326') as [
      number,
      number,
      number,
      number,
    ];
    const selected = selectPlacesForMapExtent(places, extent);

    // Diff against the current feature set instead of clearing and re-adding
    // everything: surviving features keep their identity, so OpenLayers'
    // declutter layout (label positions/priority) doesn't reshuffle on every
    // pan or zoom — labels stay where they were instead of flickering.
    const source = wbPlacesSourceRef.current;
    const wantedIds = new Set(selected.map((place) => place.id));
    const fittedIds = new Set<string>();
    const stale: Feature<Geometry>[] = [];
    for (const feature of source.getFeatures()) {
      const place = feature.get('wbPlace') as WbGeoPlace | undefined;
      if (place && wantedIds.has(place.id)) fittedIds.add(place.id);
      else stale.push(feature);
    }
    const fresh: Feature<Geometry>[] = [];
    for (const place of selected) {
      if (!fittedIds.has(place.id)) {
        fresh.push(
          new Feature({
            geometry: new Point(fromLonLat([place.lng, place.lat])),
            kind: 'wb-place',
            wbPlace: place,
          })
        );
      }
    }
    if (stale.length > 0) source.removeFeatures(stale);
    if (fresh.length > 0) source.addFeatures(fresh);
    // Async render keeps declutter organisation inside OL's own frame.
    if (stale.length > 0 || fresh.length > 0) map.render();
    setWbPlacesStatus(`${selected.length} of ${places.length.toLocaleString()} places in view`);
  }, []);

  const scheduleWbRebuild = useCallback(
    (delay = 250) => {
      window.clearTimeout(wbRebuildTimerRef.current);
      wbRebuildTimerRef.current = window.setTimeout(() => {
        rebuildWbPlaces();
      }, delay);
    },
    [rebuildWbPlaces]
  );

  // Load the bundled dataset as soon as the map is visible; markers (and the
  // instant search tier) share the same loaded index.
  useEffect(() => {
    if (!isVisible || opacity <= 0) return;
    let cancelled = false;
    if (wbPlacesDataRef.current) {
      scheduleWbRebuild(100);
      return;
    }
    void loadWbGeoPlaces().then((places) => {
      if (cancelled) return;
      if (!places) {
        setWbPlacesStatus('dataset unavailable');
        return;
      }
      wbPlacesDataRef.current = places;
      const storedLocally = getWbGeoPlacesSource() === 'indexeddb';
      setWbPlacesStatus(
        `${places.length.toLocaleString()} places${storedLocally ? ' · IndexedDB' : ' indexed'}`
      );
      scheduleWbRebuild(50);
    });
    return () => {
      cancelled = true;
    };
  }, [isVisible, opacity, scheduleWbRebuild]);

  useEffect(() => {
    onPlaceCanvasHereRef.current = onPlaceCanvasHere;
  }, [onPlaceCanvasHere]);

  useEffect(() => {
    printModeRef.current = printMode;
  }, [printMode]);

  useEffect(() => {
    canvasBoundsRef.current = canvasBounds;
  }, [canvasBounds]);

  // The map element can be rendered at a different CSS size from the drawing
  // sheet (for example in the PDF preview). Adjust the map zoom by the exact
  // size ratio so one drawing pixel keeps the same geographic size.
  useEffect(() => {
    const target = mapTargetRef.current;
    if (!target) return;
    const updateSize = () => {
      const width = target.clientWidth;
      if (width > 0) setMapPixelWidth(width);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(target);
    return () => observer.disconnect();
  }, [isVisible, opacity, canvasBounds.width]);

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
    onRenderCompleteRef.current = onRenderComplete;
    isLockedRef.current = isLocked;
  }, [onMapCenterChange, onRoadFeaturesChange, onRenderComplete, isLocked]);

  // The calibration zoom is the geographic scale at one drawing pixel. If the
  // map is displayed at a different CSS size, compensate with the exact ratio
  // so the printed map stays registered with the vector sheet.
  const baseMapZoom = geoReference?.zoom ?? mapZoomLevel ?? 16;
  const mapScale =
    canvasBounds.width > 0 ? mapPixelWidth / Math.max(canvasBounds.width, 1) : 1;
  const continuousMapZoom = baseMapZoom + Math.log2(Math.max(mapScale, 0.01));
  const tileZoom = Math.floor(continuousMapZoom);

  const wbPlacesStyle = createWbPlacesStyle(mapFeaturesRef, outerZoomRef);

  // Popup card shown when a WB place marker is clicked (created once per map).
  const wbPopupElRef = useRef<HTMLDivElement | null>(null);
  if (!wbPopupElRef.current) wbPopupElRef.current = document.createElement('div');
  const wbPopupEl = wbPopupElRef.current;
  const hideWbPopup = () => wbPopupOverlayRef.current?.setPosition(undefined);
  useEffect(() => {
    if (!isVisible || opacity <= 0 || !mapTargetRef.current || mapRef.current) return;

    const wbPopupOverlay = new Overlay({
      element: wbPopupEl,
      positioning: 'bottom-center',
      offset: [0, -12],
      stopEvent: true,
    });
    wbPopupOverlayRef.current = wbPopupOverlay;

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
        new VectorLayer({
          source: wbPlacesSourceRef.current,
          declutter: true,
          style: wbPlacesStyle,
        }),
      ],
      view: new View({
        center: fromLonLat([centerLng, centerLat]),
        zoom: continuousMapZoom,
        minZoom: 8,
        maxZoom: 22,
      }),
      controls: defaultControls({ zoom: false, rotate: false, attribution: false }),
      interactions: [],
    });
    mapRef.current = map;
    map.addOverlay(wbPopupOverlay);
    map.on('rendercomplete', () => {
      onRenderCompleteRef.current?.();
    });
    map.on('pointerdrag', () => {
      isDraggingMapRef.current = true;
      hideWbPopup();
    });
    map.on('singleclick', (event) => {
      if (printModeRef.current) return;
      let hit: Feature<Geometry> | undefined;
      map.getFeaturesAtPixel(event.pixel, {
        layerFilter: (candidate) => candidate.getSource() === wbPlacesSourceRef.current,
        hitTolerance: 8,
      }).forEach((found) => {
        if (!hit && found.get('kind') === 'wb-place') hit = found as Feature<Geometry>;
      });
      if (!hit) {
        hideWbPopup();
        return;
      }
      const geometry = hit.getGeometry();
      const onPlaceCanvas = onPlaceCanvasHereRef.current;
      buildWbPlacePopup(
        wbPopupEl,
        hit,
        (loc) => onPlaceCanvas?.(loc),
        () => hideWbPopup()
      );
      if (geometry instanceof Point) wbPopupOverlay.setPosition(geometry.getCoordinates());
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
      scheduleWbRebuild(0);
    });

    // While the map is locked its surface has pointer-events none — the
    // drawing SVG above it receives the click — and the popup above can never
    // open through OL's own event pipeline. Hit-test from a document-level
    // capture listener so dataset marker clicks work in every lock state.
    const wbDocClick = (event: MouseEvent) => {
      if (printModeRef.current) return;
      const target = event.target as Element | null;
      if (!target || typeof target.closest !== 'function') return;
      if (wbPopupEl.contains(target)) return; // popup buttons handle themselves
      const viewport = map.getViewport();
      if (!viewport) return;
      if (viewport.contains(event.target as Node)) return; // unlocked clicks: singleclick handles these
      if (!target.closest('[data-canvas-surface="true"]')) return; // toolbar/modal clicks
      const size = map.getSize();
      const rect = viewport.getBoundingClientRect();
      if (!size || !rect.width || !rect.height || size[0] <= 0) return;
      const scale = rect.width / size[0]; // sheet zoom ↔ map pixel ratio
      const x = (event.clientX - rect.left) / scale;
      const y = (event.clientY - rect.top) / scale;
      if (x < 0 || y < 0 || x > size[0] || y > size[1]) return;

      let hit: Feature<Geometry> | undefined;
      map.getFeaturesAtPixel([x, y], {
        layerFilter: (candidate) => candidate.getSource() === wbPlacesSourceRef.current,
        hitTolerance: 10,
      }).forEach((found) => {
        if (!hit && found.get('kind') === 'wb-place') hit = found as Feature<Geometry>;
      });

      if (hit) {
        const geometry = hit.getGeometry();
        const onPlaceCanvas = onPlaceCanvasHereRef.current;
        buildWbPlacePopup(
          wbPopupEl,
          hit,
          (loc) => onPlaceCanvas?.(loc),
          () => hideWbPopup()
        );
        if (geometry instanceof Point) wbPopupOverlay.setPosition(geometry.getCoordinates());
        // Marker intent wins over the drawing tool underneath.
        event.preventDefault();
        event.stopPropagation();
      } else {
        hideWbPopup();
      }
    };
    document.addEventListener('click', wbDocClick, true);

    return () => {
      document.removeEventListener('click', wbDocClick, true);
      window.clearTimeout(wbRebuildTimerRef.current);
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
    scheduleWbRebuild(300);
  }, [
    centerLat,
    centerLng,
    continuousMapZoom,
    isVisible,
    opacity,
    canvasBounds.width,
    canvasBounds.height,
    mapPixelWidth,
    zoom,
    scheduleWbRebuild,
  ]);

  if (!isVisible || opacity <= 0) return null;

  const metersPerPixel = getMetersPerPixel(centerLat, baseMapZoom);
  const scaleBarMeters = Math.round((metersPerPixel * 80) / Math.max(zoom, 0.05));

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
          {!printMode && (
            <div className="absolute top-2 right-2 z-10 max-w-[60%] rounded-md bg-white/90 border border-slate-200 px-2 py-1 text-[9px] font-medium text-slate-600 shadow-sm pointer-events-none">
              <div className="truncate">{localNamesStatus}</div>
              {wbPlacesStatus && (
                <div className="truncate text-sky-700">WB geo · {wbPlacesStatus}</div>
              )}
            </div>
          )}
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
