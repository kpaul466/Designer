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
 * Offset a polyline by `offset` units along its normal.
 * Uses averaged normals with a clamped miter at interior vertices, so a
 * two-line road stays parallel through bends without huge spikes.
 */
export function offsetPolyline(points: Point[], offset: number): Point[] {
  if (points.length < 2 || offset === 0) return points;

  const segmentNormals: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const length = Math.hypot(dx, dy) || 1;
    segmentNormals.push({ x: -dy / length, y: dx / length });
  }

  return points.map((point, index) => {
    if (index === 0) {
      const normal = segmentNormals[0];
      return { x: point.x + normal.x * offset, y: point.y + normal.y * offset };
    }

    if (index === points.length - 1) {
      const normal = segmentNormals[segmentNormals.length - 1];
      return { x: point.x + normal.x * offset, y: point.y + normal.y * offset };
    }

    const previous = segmentNormals[index - 1];
    const next = segmentNormals[index];
    let nx = previous.x + next.x;
    let ny = previous.y + next.y;
    const length = Math.hypot(nx, ny) || 1;
    nx /= length;
    ny /= length;

    // Clamp sharp corners so the miter cannot shoot off to infinity.
    const cos = Math.max(0.25, previous.x * nx + previous.y * ny);
    return { x: point.x + nx * (offset / cos), y: point.y + ny * (offset / cos) };
  });
}

export function pointsToSvgString(points: Point[]): string {
  return points.map(({ x, y }) => `${x},${y}`).join(' ');
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

/**
 * Calculate the optimal anchor point and natural tangent angle for a road label along a polyline.
 * Finds the longest segment, returns its midpoint and readability-normalized angle in degrees.
 */
export function getRoadLabelPlacement(points: Point[]): { point: Point; angle: number } | null {
  if (!points || points.length === 0) return null;
  if (points.length === 1) return { point: points[0], angle: 0 };

  let maxLen = -1;
  let bestP1 = points[0];
  let bestP2 = points[1];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (len > maxLen) {
      maxLen = len;
      bestP1 = p1;
      bestP2 = p2;
    }
  }

  const mid = midpoint(bestP1, bestP2);
  let deg = radToDeg(angleBetween(bestP1, bestP2));
  // Keep angle readable from left-to-right (between -90 and 90 degrees)
  while (deg > 90) deg -= 180;
  while (deg < -90) deg += 180;

  return {
    point: mid,
    angle: Math.round(deg),
  };
}

