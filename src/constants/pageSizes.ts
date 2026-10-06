/**
 * Official Engineering Page Sizes & Canvas Dimensions
 * Enforces requirement:
 * - Canvas size is fixed to selected page size (1:1 lock)
 * - Map size and canvas size are strictly identical
 */

import { CanvasBounds, SheetSizeType } from '../types/electrical';

export interface PageSizeDefinition {
  id: SheetSizeType;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  dimensionsMm: string;
  aspectRatio: string;
  description: string;
}

export const PAGE_SIZE_DEFINITIONS: Record<SheetSizeType, PageSizeDefinition> = {
  A4: {
    id: 'A4',
    label: 'ISO A4 Landscape',
    shortLabel: 'A4 (297×210 mm)',
    width: 1414,
    height: 1000,
    dimensionsMm: '297 × 210 mm',
    aspectRatio: '1.414 : 1 (ISO 216)',
    description: 'Official Single-Consumer & Standard Line Erection Drawing',
  },
  A3: {
    id: 'A3',
    label: 'ISO A3 Landscape',
    shortLabel: 'A3 (420×297 mm)',
    width: 2000,
    height: 1414,
    dimensionsMm: '420 × 297 mm',
    aspectRatio: '1.414 : 1 (ISO 216)',
    description: 'Sub-Divisional Feeder & Village Habitation Blueprint',
  },
  A2: {
    id: 'A2',
    label: 'ISO A2 Blueprint',
    shortLabel: 'A2 (594×420 mm)',
    width: 2828,
    height: 2000,
    dimensionsMm: '594 × 420 mm',
    aspectRatio: '1.414 : 1 (ISO 216)',
    description: 'Large Zonal Transmission & Multi-Feeder Electrical Grid',
  },
  corridor: {
    id: 'corridor',
    label: 'Feeder Corridor (Long)',
    shortLabel: 'Corridor (3200×1200)',
    width: 3200,
    height: 1200,
    dimensionsMm: 'Wide Alignment',
    aspectRatio: '2.67 : 1',
    description: 'Long Distance Road / River / Railway Highway Alignment',
  },
  square: {
    id: 'square',
    label: 'Substation Yard (Square)',
    shortLabel: 'Square (1600×1600)',
    width: 1600,
    height: 1600,
    dimensionsMm: 'Square Yard',
    aspectRatio: '1 : 1',
    description: '33/11kV Substation Switchyard & Terminal Array',
  },
};

export const ALL_PAGE_SIZES = Object.values(PAGE_SIZE_DEFINITIONS);

/**
 * Ensures canvas bounds are permanently locked 1:1 to the selected page size
 */
export function getCanvasBoundsForPageSize(
  pageSizeId: SheetSizeType,
  currentBounds?: Partial<CanvasBounds>
): CanvasBounds {
  const def = PAGE_SIZE_DEFINITIONS[pageSizeId] || PAGE_SIZE_DEFINITIONS.A4;
  return {
    width: def.width,
    height: def.height,
    x: currentBounds?.x ?? 0,
    y: currentBounds?.y ?? 0,
    preset: def.id,
    showSheetBorder: true,
    sheetFillOpacity: currentBounds?.sheetFillOpacity ?? 0.85,
  };
}
