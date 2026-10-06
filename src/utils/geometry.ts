/**
 * Geometry and vector math utilities for PowerLine Designer
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Snap coordinate to grid
 */
export function snapToGrid(val: number, gridSize: number = 20): number {
  return Math.round(val / gridSize) * gridSize;
}

export function snapPointToGrid(pt: Point, gridSize: number = 20): Point {
  return {
    x: snapToGrid(pt.x, gridSize),
    y: snapToGrid(pt.y, gridSize),
  };
}

/**
 * Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Angle in radians between two points
 */
export function angleBetween(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Midpoint between two points
 */
export function midpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Convert radians to degrees
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Approximate real-world span distance in meters from screen pixel distance
 * Base scale: 10 pixels ≈ 5 meters (e.g. 80px = 40M)
 */
export function pixelDistanceToSpanMeters(pxDist: number, meterPerPixel: number = 0.5): number {
  const calculated = Math.round(pxDist * meterPerPixel);
  // Quantize to common distribution spans (30M, 35M, 40M, 42M, 45M, 50M, 60M) if close
  if (calculated <= 25) return 25;
  if (calculated >= 28 && calculated <= 32) return 30;
  if (calculated >= 33 && calculated <= 37) return 35;
  if (calculated >= 38 && calculated <= 41) return 40;
  if (calculated >= 42 && calculated <= 43) return 42;
  if (calculated >= 44 && calculated <= 48) return 45;
  if (calculated >= 49 && calculated <= 54) return 50;
  if (calculated >= 55 && calculated <= 65) return 60;
  return calculated;
}

/**
 * Perpendicular offset point for dimension lines or annotations
 */
export function perpendicularOffset(p1: Point, p2: Point, offsetDistance: number): Point {
  const mid = midpoint(p1, p2);
  const ang = angleBetween(p1, p2);
  // Perpendicular angle
  const perpAng = ang + Math.PI / 2;
  return {
    x: mid.x + Math.cos(perpAng) * offsetDistance,
    y: mid.y + Math.sin(perpAng) * offsetDistance,
  };
}

/**
 * Point on line at parameter t (0 <= t <= 1)
 */
export function interpolate(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}
