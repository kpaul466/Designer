/**
 * CAD Drafting Grid Background Component (Dot & Mesh modes)
 * Automatically adapts when GIS Map is active so the map is never obscured by opaque canvas fill!
 */

import React from 'react';

interface GridBackgroundProps {
  showGrid: boolean;
  gridType: 'dots' | 'lines';
  gridSize?: number;
  isDarkCanvas?: boolean;
  isMapVisible?: boolean;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  showGrid,
  gridType,
  gridSize = 20,
  isDarkCanvas = false,
  isMapVisible = false,
}) => {
  // If map is visible, background must be transparent so the map is clearly seen behind the vectors
  const bgFill = isMapVisible ? 'transparent' : isDarkCanvas ? '#0f172a' : '#ffffff';

  if (!showGrid) {
    if (isMapVisible) return null; // Completely transparent when map is ON and grid is OFF
    return (
      <rect
        x="-50000"
        y="-50000"
        width="100000"
        height="100000"
        fill={bgFill}
      />
    );
  }

  const majorSize = gridSize * 5;
  // If map is visible, use high-contrast semi-transparent lines/dots so they don't block the map.
  const strokeMinor = isMapVisible
    ? 'rgba(255, 255, 255, 0.25)'
    : isDarkCanvas
    ? '#1e293b'
    : '#f1f5f9';
  const strokeMajor = isMapVisible
    ? 'rgba(255, 255, 255, 0.45)'
    : isDarkCanvas
    ? '#334155'
    : '#e2e8f0';
  const dotColor = isMapVisible
    ? 'rgba(255, 255, 255, 0.6)'
    : isDarkCanvas
    ? '#334155'
    : '#cbd5e1';

  return (
    <>
      <defs>
        {gridType === 'lines' ? (
          <>
            {/* Minor grid */}
            <pattern
              id="grid-minor"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke={strokeMinor}
                strokeWidth="0.75"
              />
            </pattern>
            {/* Major grid */}
            <pattern
              id="grid-major"
              width={majorSize}
              height={majorSize}
              patternUnits="userSpaceOnUse"
            >
              <rect width={majorSize} height={majorSize} fill="url(#grid-minor)" />
              <path
                d={`M ${majorSize} 0 L 0 0 0 ${majorSize}`}
                fill="none"
                stroke={strokeMajor}
                strokeWidth="1.25"
              />
            </pattern>
          </>
        ) : (
          <pattern
            id="grid-dots"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.2" fill={dotColor} />
          </pattern>
        )}
      </defs>

      {/* Background fill (transparent if map is visible) */}
      {!isMapVisible && (
        <rect
          x="-50000"
          y="-50000"
          width="100000"
          height="100000"
          fill={bgFill}
        />
      )}

      {/* Grid Pattern Mesh */}
      <rect
        x="-50000"
        y="-50000"
        width="100000"
        height="100000"
        fill={`url(#${gridType === 'lines' ? 'grid-major' : 'grid-dots'})`}
      />
    </>
  );
};
