/**
 * Sheet georeferencing helpers.
 *
 * A drawing sheet is fixed in size. Its centre is calibrated to one geographic
 * point at a fixed OpenStreetMap zoom. Canvas coordinates can then be converted
 * to/from GPS without depending on the current canvas pan/zoom.
 *
 * This is the single source of truth used by:
 * - pole GPS capture in the drawing canvas
 * - the on-screen map underlay
 * - the printed/PDF map underlay
 */

import {
  CanvasBounds,
  DrawingProject,
  ElectricalNode,
  GeoLocation,
  GeoReference,
  GpsPoint,
} from '../types/electrical';

const EARTH_RADIUS = 6378137;
const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;
export const DEFAULT_MAP_ZOOM = 16;
export const DEFAULT_GEO_CENTER: GpsPoint = { lat: 26.7124, lng: 89.2845 };

export function clampLatitude(lat: number): number {
  return Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
}

export function lngToMercatorX(lng: number): number {
  return (EARTH_RADIUS * lng * Math.PI) / 180;
}

export function mercatorXToLng(x: number): number {
  return (x / EARTH_RADIUS) * (180 / Math.PI);
}

export function latToMercatorY(lat: number): number {
  const clamped = clampLatitude(lat);
  return EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360));
}

export function mercatorYToLat(y: number): number {
  return (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * (180 / Math.PI);
}

/** EPSG:3857 projected metres represented by one drawing pixel at this zoom. */
export function getMercatorResolution(zoom: number): number {
  return (2 * Math.PI * EARTH_RADIUS) / (TILE_SIZE * Math.pow(2, zoom));
}

export function createGeoReference(
  center: Pick<GeoLocation, 'lat' | 'lng'> | GpsPoint,
  zoom: number,
  canvasBounds: Pick<CanvasBounds, 'width' | 'height'>
): GeoReference {
  return {
    centerLat: clampLatitude(center.lat),
    centerLng: center.lng,
    zoom: Number.isFinite(zoom) ? zoom : DEFAULT_MAP_ZOOM,
    width: canvasBounds.width,
    height: canvasBounds.height,
  };
}

export function canvasPointToGps(
  x: number,
  y: number,
  canvasBounds: Pick<CanvasBounds, 'x' | 'y' | 'width' | 'height'>,
  reference: GeoReference
): GpsPoint {
  const resolution = getMercatorResolution(reference.zoom);
  const canvasCenterX = canvasBounds.x + canvasBounds.width / 2;
  const canvasCenterY = canvasBounds.y + canvasBounds.height / 2;
  const centerX = lngToMercatorX(reference.centerLng);
  const centerY = latToMercatorY(reference.centerLat);

  const mercatorX = centerX + (x - canvasCenterX) * resolution;
  const mercatorY = centerY - (y - canvasCenterY) * resolution;

  return {
    lat: Number(mercatorYToLat(mercatorY).toFixed(7)),
    lng: Number(mercatorXToLng(mercatorX).toFixed(7)),
  };
}

export function gpsToCanvasPoint(
  gps: GpsPoint,
  canvasBounds: Pick<CanvasBounds, 'x' | 'y' | 'width' | 'height'>,
  reference: GeoReference
): { x: number; y: number } {
  const resolution = getMercatorResolution(reference.zoom);
  const canvasCenterX = canvasBounds.x + canvasBounds.width / 2;
  const canvasCenterY = canvasBounds.y + canvasBounds.height / 2;
  const centerX = lngToMercatorX(reference.centerLng);
  const centerY = latToMercatorY(reference.centerLat);
  const pointX = lngToMercatorX(gps.lng);
  const pointY = latToMercatorY(gps.lat);

  return {
    x: canvasCenterX + (pointX - centerX) / resolution,
    y: canvasCenterY - (pointY - centerY) / resolution,
  };
}

/** Parse values such as "26.7124, 89.2841" or "26.7124° N, 89.2841° E". */
export function parseCoordinateText(text?: string): GpsPoint | null {
  if (!text) return null;
  const match = text.match(
    /(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?[,\s]+(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i
  );
  if (!match) return null;

  let lat = Number(match[1]);
  let lng = Number(match[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const latHemisphere = match[2]?.toUpperCase();
  const lngHemisphere = match[4]?.toUpperCase();
  if (latHemisphere === 'S') lat = -Math.abs(lat);
  if (lngHemisphere === 'W') lng = -Math.abs(lng);

  return { lat, lng };
}

export function getProjectGeoCenter(project: DrawingProject): GpsPoint {
  const geo = project.geoLocation;
  if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
    return { lat: geo.lat, lng: geo.lng };
  }
  if (
    project.geoReference &&
    Number.isFinite(project.geoReference.centerLat) &&
    Number.isFinite(project.geoReference.centerLng)
  ) {
    return {
      lat: project.geoReference.centerLat,
      lng: project.geoReference.centerLng,
    };
  }
  return parseCoordinateText(project.metadata.coordinates) ?? DEFAULT_GEO_CENTER;
}

/**
 * Resolve the calibration used by the printed map. An existing project
 * reference wins so a saved drawing always prints with the same coordinates
 * that were used when its poles were captured.
 */
export function resolveProjectGeoReference(
  project: DrawingProject,
  canvasBounds: Pick<CanvasBounds, 'width' | 'height'>
): GeoReference {
  if (project.geoReference) {
    return createGeoReference(
      { lat: project.geoReference.centerLat, lng: project.geoReference.centerLng },
      project.geoReference.zoom,
      canvasBounds
    );
  }
  return createGeoReference(
    getProjectGeoCenter(project),
    project.mapSettings?.zoomLevel ?? DEFAULT_MAP_ZOOM,
    canvasBounds
  );
}

export function gpsChanged(a?: GpsPoint, b?: GpsPoint): boolean {
  if (!a || !b) return true;
  return Math.abs(a.lat - b.lat) > 1e-7 || Math.abs(a.lng - b.lng) > 1e-7;
}

export function withNodeGps(
  node: ElectricalNode,
  canvasBounds: Pick<CanvasBounds, 'x' | 'y' | 'width' | 'height'>,
  reference: GeoReference
): ElectricalNode {
  const gps = canvasPointToGps(node.x, node.y, canvasBounds, reference);
  return gpsChanged(node.gps, gps) ? { ...node, gps } : node;
}

export function formatGps(gps?: GpsPoint): string {
  if (!gps) return '—';
  const latHemisphere = gps.lat >= 0 ? 'N' : 'S';
  const lngHemisphere = gps.lng >= 0 ? 'E' : 'W';
  return `${Math.abs(gps.lat).toFixed(6)}° ${latHemisphere}, ${Math.abs(gps.lng).toFixed(6)}° ${lngHemisphere}`;
}
