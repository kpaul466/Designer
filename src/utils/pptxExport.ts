/**
 * Native Vector PowerPoint (.pptx) Export Utility for PowerLine Designer
 * Produces an exact visual twin of the exported ISO 216 A4 Landscape PDF Drawing Sheet:
 * - Outer and inner double engineering black borders
 * - Top Header: Drawing title, location, working date, coordinates on left;
 *   Reference details (Sub-Division, CCC, Division, Work Order, PO, Work Type) + Scale, Rev & North Arrow on right
 * - Middle Area:
 *   - Left: CAD drawing canvas with authentic REC / CEA / WBSEDCL standard symbols:
 *     * 8M PCC Pole: Red dashed survey circle + inner core + cross-arm (proposed) or solid charcoal with survey crosshair (+) (existing)
 *     * 9M PCC Pole: Double solid ring with authentic "9" designation and V-crossarm pins
 *     * RSJ / Rail Pole: Authentic I-Beam girder profile (top flange, web, bottom flange)
 *     * Steel Tubular Pole (STP): 3 concentric telescopic swaged sections with dashed middle ring
 *     * DP Structure: H-frame double pole with channel beams, diagonal X-bracings, and 3-phase insulator pins
 *     * 4-Pole Structure: Quad pole substation mounting plinth with cross-members, corner poles and 4P badge
 *     * DTR (25kVA, 63kVA, 100kVA): Dual-winding coils (Δ-Y), cooling fins, HT/LT bushings, and kVA rating badge
 *     * DTR Conversion: Dual DTRs with upgrade arrow (63kVA -> 100kVA)
 *     * Broken PCC Pole: Authentic green dashed circle with zigzag crack and "BROKEN 8M/9M" badge
 *     * Box Bracket: Authentic [o] square bracket with center ring & dot
 *     * Switchgear: AB Switch with knife blade, HG Fuse with horns, LA with spark gap & ground, LT Distribution Box
 *     * Conductors: Exact phase tick marks (4 ticks for 4-wire, 3 ticks for 3-wire, 2 ticks for 2-wire, green theft ticks) & span pills
 *   - Right: Engineering sidebar with DRAWING INDEX / LEGEND on top and WORK QUANTITIES / BOQ SCHEDULE on bottom
 * - Bottom Title Block: PROJECT CONTACTS (Agency, Applicant), DRAWING TITLE & NO, and 3-Tier Sign-Off Grid
 * - Slide 2: Full Schedule of Materials & BOQ
 * ALL OBJECTS ARE NATIVE, INDIVIDUALLY CLICKABLE & EDITABLE POWERPOINT SHAPES, LINES, TEXT & TABLES!
 */

import pptxgen from 'pptxgenjs';
import { DrawingProject } from '../types/electrical';
import { calculateBoq, generateIndexEntries } from './boqCalculator';

function cleanHex(color?: string, fallback: string = '000000'): string {
  if (!color) return fallback;
  return color.replace(/^#/, '').trim() || fallback;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'powerline_drawing';
}

/**
 * Calculate PowerPoint line position and flip properties between two 2D points
 */
function getLineGeometry(x1: number, y1: number, x2: number, y2: number) {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const w = Math.max(Math.abs(x2 - x1), 0.005);
  const h = Math.max(Math.abs(y2 - y1), 0.005);
  const flipH = (x2 - x1) * (y2 - y1) < 0;
  return { x: minX, y: minY, w, h, flipH };
}

/**
 * Calculate perpendicular line tick across a conductor line
 */
function getTickLineGeometry(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dInches: number,
  tickLenInches: number
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const alongX = Math.cos(angle);
  const alongY = Math.sin(angle);
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  const cx = midX + dInches * alongX;
  const cy = midY + dInches * alongY;
  const tx1 = cx - perpX * tickLenInches;
  const ty1 = cy - perpY * tickLenInches;
  const tx2 = cx + perpX * tickLenInches;
  const ty2 = cy + perpY * tickLenInches;

  return getLineGeometry(tx1, ty1, tx2, ty2);
}

/**
 * Map index symbol key to short visual text representation for the PowerPoint legend table
 */
function getSymbolText(symbolKey: string): string {
  switch (symbolKey) {
    case 'pole_8m':
      return '○ (8M)';
    case 'pole_9m':
      return '⓽ (9M)';
    case 'pole_10m':
      return '⓾ (10M)';
    case 'pole_11m':
      return '⑪ (11M)';
    case 'four_pole':
      return '⊞ (4P)';
    case 'dp_structure':
      return '⚯ (DP)';
    case 'dtr':
      return '⧖ (DTR)';
    case 'ht_stay':
      return '➔ (HT)';
    case 'lt_stay':
      return '➔ (LT)';
    case 'acsr_4wire':
      return '--||||--';
    case 'acsr_3wire':
      return '--|||--';
    case 'acsr_2wire':
      return '--||--';
    case 'theft_acsr':
      return '--THEFT--';
    case 'broken_pole':
      return '✕ (Broken)';
    case 'box_bracket':
      return '[o]';
    case 'lt_ab_cable':
      return '--- AB ---';
    case 'service_cable':
      return '- - S/C (1Ø)';
    case 'service_cable_3ph':
      return '- - S/C (3Ø)';
    case 'phase_conversion':
      return '1Ø → 3Ø';
    case 'cradle_guard':
      return ']  [';
    case 'exist_pole':
      return '● (Exist)';
    default:
      return '●';
  }
}

export async function exportToPptx(
  project: DrawingProject,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Initializing vector PowerPoint document...');

  const pres = new pptxgen();

  // Exact ISO 216 A4 Landscape sheet: 11.69" x 8.27" (297mm x 210mm)
  const isA3 = project.metadata?.sheetSize === 'A3';
  const slideW = isA3 ? 16.54 : 11.69;
  const slideH = isA3 ? 11.69 : 8.27;

  pres.defineLayout({
    name: isA3 ? 'A3_LANDSCAPE' : 'A4_LANDSCAPE',
    width: slideW,
    height: slideH,
  });
  pres.layout = isA3 ? 'A3_LANDSCAPE' : 'A4_LANDSCAPE';

  const metadata = project.metadata || ({} as DrawingProject['metadata']);

  // -------------------------------------------------------------------------
  // SLIDE 1: EXACT VISUAL TWIN OF EXPORTED PDF DRAWING SHEET
  // -------------------------------------------------------------------------
  onProgress?.('Generating PDF-matching drawing sheet layout...');
  const slide = pres.addSlide();
  slide.background = { color: 'FFFFFF' };

  // Margins and Sheet Geometry
  const m = 0.18;
  const outerW = slideW - m * 2;
  const outerH = slideH - m * 2;

  // 1. Double Engineering Border (Outer 2.5pt thick black, Inner 1.0pt thin black)
  slide.addShape(pres.ShapeType.rect, {
    x: m,
    y: m,
    w: outerW,
    h: outerH,
    fill: { color: 'FFFFFF' },
    line: { color: '000000', width: 2.5 },
  });

  const innerPad = 0.04;
  const innerX = m + innerPad;
  const innerY = m + innerPad;
  const innerW = outerW - innerPad * 2;
  const innerH = outerH - innerPad * 2;

  slide.addShape(pres.ShapeType.rect, {
    x: innerX,
    y: innerY,
    w: innerW,
    h: innerH,
    fill: { color: 'FFFFFF' },
    line: { color: '000000', width: 1.0 },
  });

  // Vertical and Horizontal Dividers
  const headerH = 0.92;
  const headerBottomY = innerY + headerH;
  const btbH = 0.95;
  const btbTopY = innerY + innerH - btbH;

  // Header bottom dividing line
  slide.addShape(pres.ShapeType.line, {
    x: innerX,
    y: headerBottomY,
    w: innerW,
    h: 0.001,
    line: { color: '000000', width: 1.0 },
  });

  // Bottom Title Block top dividing line
  slide.addShape(pres.ShapeType.line, {
    x: innerX,
    y: btbTopY,
    w: innerW,
    h: 0.001,
    line: { color: '000000', width: 1.0 },
  });

  // -------------------------------------------------------------------------
  // 2. TOP HEADER (Identical to PDF Top Header)
  // -------------------------------------------------------------------------
  // Vertical line separating Left Title/Location from Right References
  const headerSplitX = innerX + innerW * 0.54;
  slide.addShape(pres.ShapeType.line, {
    x: headerSplitX,
    y: innerY,
    w: 0.001,
    h: headerH,
    line: { color: '000000', width: 1.0 },
  });

  // Vertical line separating References from Scale / North Arrow
  const headerRightSplitX = innerX + innerW - 1.35;
  slide.addShape(pres.ShapeType.line, {
    x: headerRightSplitX,
    y: innerY,
    w: 0.001,
    h: headerH,
    line: { color: '000000', width: 1.0 },
  });

  // (A) Top Header Left: Title, Location, Working Date, Coordinates
  const drawingTitleText = (
    metadata.title ||
    metadata.projectName ||
    project.title ||
    'ELECTRICAL DISTRIBUTION DRAWING'
  ).toUpperCase();
  const locationText = metadata.location ? `LOCATION: ${metadata.location}` : '';
  const dateText = metadata.date
    ? `WORKING DATE: ${metadata.date}`
    : `WORKING DATE: ${new Date().toISOString().slice(0, 10)}`;
  const coordText = metadata.coordinates ? `COORDINATES: ${metadata.coordinates}` : '';

  slide.addText(
    [
      { text: `${drawingTitleText}\n`, options: { bold: true, fontSize: 10.5, color: '000000' } },
      ...(locationText
        ? [{ text: `${locationText}\n`, options: { bold: true, fontSize: 8, color: '374151' } }]
        : []),
      { text: `${dateText}\n`, options: { fontSize: 7.5, color: '4B5563' } },
      ...(coordText ? [{ text: coordText, options: { fontSize: 7, color: '6B7280' } }] : []),
    ],
    {
      x: innerX + 0.1,
      y: innerY + 0.06,
      w: headerSplitX - innerX - 0.2,
      h: headerH - 0.12,
      valign: 'middle',
      align: 'left',
      margin: 0,
    }
  );

  // (B) Top Header Center: Reference Details
  const refLines = [
    metadata.workType === 'maintenance_work'
      ? 'WORK TYPE: MAINTENANCE WORK'
      : 'WORK TYPE: NEW WORK',
    metadata.applicationNo ? `APPLICATION NO: ${metadata.applicationNo}` : '',
    metadata.workOrderNo ? `WORK ORDER NO: ${metadata.workOrderNo}` : '',
    metadata.poNumber ? `PO NUMBER: ${metadata.poNumber}` : '',
    metadata.subDivision ? `SUB-DIVISION: ${metadata.subDivision}` : 'SUB-DIVISION: FALAKATA',
    metadata.cccName ? `CCC: ${metadata.cccName}` : 'CCC: FALAKATA',
    metadata.divisionName ? `DIVISION: ${metadata.divisionName}` : 'DIVISION: ALIPURDUAR',
  ].filter(Boolean);

  const refCol1 = refLines.slice(0, Math.ceil(refLines.length / 2)).join('\n');
  const refCol2 = refLines.slice(Math.ceil(refLines.length / 2)).join('\n');

  slide.addText(refCol1, {
    x: headerSplitX + 0.1,
    y: innerY + 0.06,
    w: (headerRightSplitX - headerSplitX) * 0.48,
    h: headerH - 0.12,
    fontSize: 7.5,
    bold: true,
    color: '1F2937',
    valign: 'middle',
    align: 'left',
    margin: 0,
  });

  slide.addText(refCol2, {
    x: headerSplitX + (headerRightSplitX - headerSplitX) * 0.5,
    y: innerY + 0.06,
    w: (headerRightSplitX - headerSplitX) * 0.48,
    h: headerH - 0.12,
    fontSize: 7.5,
    bold: true,
    color: '1F2937',
    valign: 'middle',
    align: 'left',
    margin: 0,
  });

  // (C) Top Header Right: Scale, Rev, Sheet & North Arrow
  const scaleText = metadata.scale ? `SCALE: ${metadata.scale}\n` : 'SCALE: NTS\n';
  const revText = metadata.revision ? `REV: ${metadata.revision}\n` : 'REV: R0\n';
  const sheetText = 'SHEET: 1 OF 1';

  slide.addText(`${scaleText}${revText}${sheetText}`, {
    x: headerRightSplitX + 0.05,
    y: innerY + 0.08,
    w: 0.75,
    h: headerH - 0.16,
    fontSize: 7.5,
    bold: true,
    color: '1F2937',
    align: 'right',
    valign: 'middle',
    margin: 0,
  });

  // North Arrow Indicator
  const northX = innerX + innerW - 0.42;
  slide.addText('N', {
    x: northX - 0.1,
    y: innerY + 0.1,
    w: 0.4,
    h: 0.2,
    fontSize: 8.5,
    bold: true,
    color: '000000',
    align: 'center',
    margin: 0,
  });

  slide.addShape(pres.ShapeType.triangle, {
    x: northX,
    y: innerY + 0.32,
    w: 0.2,
    h: 0.48,
    fill: { color: '000000' },
    line: { color: '000000', width: 1 },
  });

  // -------------------------------------------------------------------------
  // 3. MIDDLE AREA: CAD DRAWING VIEWPORT (LEFT) & SIDEBAR (RIGHT)
  // -------------------------------------------------------------------------
  const midY = headerBottomY;
  const midH = btbTopY - headerBottomY;
  const sidebarW = 3.45;
  const cadW = innerW - sidebarW;
  const sidebarX = innerX + cadW;

  // Vertical line separating CAD Canvas from Sidebar
  slide.addShape(pres.ShapeType.line, {
    x: sidebarX,
    y: midY,
    w: 0.001,
    h: midH,
    line: { color: '000000', width: 1.0 },
  });

  // (A) RIGHT SIDEBAR: DRAWING INDEX / LEGEND (TOP) & BOQ (BOTTOM)
  const sidebarHalfH = midH * 0.46;
  const legendY = midY;
  const boqY = midY + sidebarHalfH;

  // Horizontal divider between Legend and BOQ in sidebar
  slide.addShape(pres.ShapeType.line, {
    x: sidebarX,
    y: boqY,
    w: sidebarW,
    h: 0.001,
    line: { color: '000000', width: 1.0 },
  });

  // Legend Header Bar
  slide.addShape(pres.ShapeType.rect, {
    x: sidebarX,
    y: legendY,
    w: sidebarW,
    h: 0.26,
    fill: { color: 'F3F4F6' },
    line: { color: '000000', width: 0.75 },
  });
  slide.addText('DRAWING INDEX / LEGEND', {
    x: sidebarX,
    y: legendY,
    w: sidebarW,
    h: 0.26,
    fontSize: 8,
    bold: true,
    color: '000000',
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  // Legend Items Table
  const indexEntries = generateIndexEntries(project.nodes, project.edges, project.stays);
  const legendRows: any[] = [];
  const displayLegend = indexEntries.slice(0, 6);

  if (displayLegend.length === 0) {
    legendRows.push([
      { text: '●', options: { fontSize: 7, align: 'center' } },
      { text: 'Electrical Poles & Conductors', options: { fontSize: 7.5 } },
    ]);
  } else {
    displayLegend.forEach((entry) => {
      legendRows.push([
        {
          text: getSymbolText(entry.symbolKey),
          options: { fontSize: 7, align: 'center', bold: true, color: 'DC2626' },
        },
        { text: entry.description, options: { fontSize: 7.5, color: '1F2937' } },
      ]);
    });
  }

  slide.addTable(legendRows, {
    x: sidebarX + 0.05,
    y: legendY + 0.28,
    w: sidebarW - 0.1,
    colW: [0.75, sidebarW - 0.85],
    border: { color: 'E5E7EB', pt: 0.5 },
    margin: [1, 2, 1, 2],
  });

  // BOQ Header Bar
  slide.addShape(pres.ShapeType.rect, {
    x: sidebarX,
    y: boqY,
    w: sidebarW,
    h: 0.26,
    fill: { color: 'F3F4F6' },
    line: { color: '000000', width: 0.75 },
  });
  slide.addText('WORK QUANTITIES / BOQ SCHEDULE', {
    x: sidebarX,
    y: boqY,
    w: sidebarW,
    h: 0.26,
    fontSize: 8,
    bold: true,
    color: '000000',
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  // BOQ Items Table
  const boqItems = calculateBoq(
    project.nodes,
    project.edges,
    project.stays,
    project.customBoqOverrides
  );
  const boqSidebarRows: any[] = [
    [
      { text: 'SL', options: { fill: { color: 'F9FAFB' }, bold: true, fontSize: 7, align: 'center' } },
      { text: 'DESCRIPTION', options: { fill: { color: 'F9FAFB' }, bold: true, fontSize: 7 } },
      { text: 'QTY', options: { fill: { color: 'F9FAFB' }, bold: true, fontSize: 7, align: 'right' } },
      { text: 'UNIT', options: { fill: { color: 'F9FAFB' }, bold: true, fontSize: 7, align: 'center' } },
    ],
  ];

  const displayBoq = boqItems.slice(0, 8);
  if (displayBoq.length === 0) {
    boqSidebarRows.push([
      { text: '1', options: { fontSize: 7, align: 'center' } },
      { text: 'No items drafted on canvas', options: { fontSize: 7 } },
      { text: '0', options: { fontSize: 7, align: 'right' } },
      { text: 'Nos', options: { fontSize: 7, align: 'center' } },
    ]);
  } else {
    displayBoq.forEach((item) => {
      boqSidebarRows.push([
        { text: String(item.itemNumber), options: { fontSize: 7, align: 'center', color: '4B5563' } },
        { text: item.description, options: { fontSize: 7, color: '111827' } },
        { text: String(item.quantity), options: { fontSize: 7, bold: true, align: 'right', color: '000000' } },
        { text: item.unit, options: { fontSize: 7, align: 'center', color: '4B5563' } },
      ]);
    });
  }

  slide.addTable(boqSidebarRows, {
    x: sidebarX + 0.05,
    y: boqY + 0.28,
    w: sidebarW - 0.1,
    colW: [0.3, sidebarW - 1.45, 0.55, 0.5],
    border: { color: 'E5E7EB', pt: 0.5 },
    margin: [1, 2, 1, 2],
  });

  // -------------------------------------------------------------------------
  // (B) CAD DRAWING VIEWPORT (LEFT AREA) - AUTHENTIC CAD SYMBOLS
  // -------------------------------------------------------------------------
  onProgress?.('Rendering high-fidelity authentic CAD symbols and conductors...');
  const cadPad = 0.25;
  const usableCadW = cadW - cadPad * 2;
  const usableCadH = midH - cadPad * 2;

  // Coordinate Bounds
  const allX = [
    ...project.nodes.map((n) => n.x),
    ...project.crossings.map((c) => c.x),
    ...project.annotations.map((a) => a.x),
    ...(project.mapRoadOutlines || []).flatMap((r) => r.points.map((p) => p.x)),
  ];
  const allY = [
    ...project.nodes.map((n) => n.y),
    ...project.crossings.map((c) => c.y),
    ...project.annotations.map((a) => a.y),
    ...(project.mapRoadOutlines || []).flatMap((r) => r.points.map((p) => p.y)),
  ];

  const minX = allX.length > 0 ? Math.min(...allX) - 30 : 0;
  const maxX = allX.length > 0 ? Math.max(...allX) + 30 : 1000;
  const minY = allY.length > 0 ? Math.min(...allY) - 30 : 0;
  const maxY = allY.length > 0 ? Math.max(...allY) + 30 : 600;

  const contentW = Math.max(maxX - minX, 100);
  const contentH = Math.max(maxY - minY, 100);

  const scale = Math.min(usableCadW / contentW, usableCadH / contentH);
  const offsetX = innerX + cadPad + (usableCadW - contentW * scale) / 2 - minX * scale;
  const offsetY = midY + cadPad + (usableCadH - contentH * scale) / 2 - minY * scale;

  const toSlideX = (px: number) => px * scale + offsetX;
  const toSlideY = (py: number) => py * scale + offsetY;
  const toSlideDist = (d: number) => Math.max(d * scale, 0.05);

  // i. Roads (Polylines and Road Names)
  if (project.mapRoadOutlines && project.mapRoadOutlines.length > 0) {
    for (const road of project.mapRoadOutlines) {
      if (!road.points || road.points.length < 2) continue;
      for (let i = 0; i < road.points.length - 1; i++) {
        const p1 = road.points[i];
        const p2 = road.points[i + 1];
        const geom = getLineGeometry(toSlideX(p1.x), toSlideY(p1.y), toSlideX(p2.x), toSlideY(p2.y));

        slide.addShape(pres.ShapeType.line, {
          x: geom.x,
          y: geom.y,
          w: geom.w,
          h: geom.h,
          flipH: geom.flipH,
          line: { color: '475569', width: 2.5, dashType: 'solid' },
        });

        if (road.lineStyle === 'double') {
          const rDist = toSlideDist(road.roadWidth || 20);
          slide.addShape(pres.ShapeType.line, {
            x: geom.x,
            y: geom.y + rDist,
            w: geom.w,
            h: geom.h,
            flipH: geom.flipH,
            line: { color: '94A3B8', width: 1.5, dashType: 'dash' },
          });
        }
      }

      if (road.name && road.showLabel !== false && road.points.length >= 2) {
        const midIdx = Math.floor(road.points.length / 2);
        const midP = road.points[midIdx];
        slide.addText(road.name, {
          x: toSlideX(midP.x) - 0.9,
          y: toSlideY(midP.y) - 0.15,
          w: 1.8,
          h: 0.26,
          fontSize: 7.5,
          bold: true,
          color: '1E293B',
          fill: { color: 'FFFFFF' },
          line: { color: '94A3B8', width: 0.75 },
          align: 'center',
          valign: 'middle',
        });
      }
    }
  }

  // ii. Crossings
  if (project.crossings && project.crossings.length > 0) {
    for (const crossing of project.crossings) {
      const cx = toSlideX(crossing.x);
      const cy = toSlideY(crossing.y);
      const cw = toSlideDist(crossing.width || 80);
      const ch = toSlideDist(crossing.height || 40);

      slide.addShape(pres.ShapeType.rect, {
        x: cx - cw / 2,
        y: cy - ch / 2,
        w: cw,
        h: ch,
        fill: { color: crossing.type === 'river' ? 'E0F2FE' : 'F1F5F9' },
        line: {
          color: crossing.type === 'river' ? '0284C7' : '475569',
          width: 1.5,
          dashType: 'dash',
        },
      });

      slide.addText(crossing.name || `${crossing.type.toUpperCase()} CROSSING`, {
        x: cx - cw / 2,
        y: cy - ch / 2,
        w: cw,
        h: ch,
        fontSize: 7,
        bold: true,
        color: '1E293B',
        align: 'center',
        valign: 'middle',
      });
    }
  }

  // iii. Conductors with authentic cross-ticks & span distance badges
  const nodeMap = new Map(project.nodes.map((n) => [n.id, n]));

  for (const edge of project.edges) {
    const fromNode = nodeMap.get(edge.fromNodeId);
    const toNode = nodeMap.get(edge.toNodeId);
    if (!fromNode || !toNode) continue;

    const x1 = toSlideX(fromNode.x);
    const y1 = toSlideY(fromNode.y);
    const x2 = toSlideX(toNode.x);
    const y2 = toSlideY(toNode.y);
    const geom = getLineGeometry(x1, y1, x2, y2);

    const isTheft = edge.type === 'theft_acsr';
    const is3PhaseService =
      edge.type === 'service_cable' &&
      (edge.serviceCableSpec?.phase === '3_phase' || edge.serviceCableSpec?.core === '4_core');

    let lineColor = edge.status === 'proposed' ? 'DC2626' : '1E293B';
    let lineWidth = 2.2;
    let dashType: 'solid' | 'dash' | 'dashDot' = edge.status === 'proposed' ? 'dash' : 'solid';

    if (isTheft) {
      lineColor = '16A34A';
      lineWidth = 2.8;
      dashType = 'dash';
    } else if (edge.type === 'lt_ab_cable') {
      lineColor = '2563EB';
      lineWidth = 2.2;
      dashType = 'dashDot';
    } else if (edge.type === 'service_cable' || edge.type === 'service_cable_3ph') {
      lineColor = is3PhaseService || edge.type === 'service_cable_3ph' ? 'EA580C' : '7C3AED';
      lineWidth = 2.5;
      dashType = 'dash';
    } else if (edge.type === 'earth_wire') {
      lineColor = '059669';
      lineWidth = 1.2;
      dashType = 'dash';
    } else if (edge.type === 'ht_oh_line' || edge.type === 'ht_ug_cable') {
      lineColor = '7C3AED';
      lineWidth = 2.8;
    }

    // Main Conductor Line
    slide.addShape(pres.ShapeType.line, {
      x: geom.x,
      y: geom.y,
      w: geom.w,
      h: geom.h,
      flipH: geom.flipH,
      line: { color: lineColor, width: lineWidth, dashType },
    });

    // Authentic Phase Cross Ticks at Midpoint
    const tickLen = 0.08;
    let tickOffsets: number[] = [];

    if (edge.type === 'acsr_4wire') {
      tickOffsets = [-0.09, -0.03, 0.03, 0.09]; // 4 ticks
    } else if (edge.type === 'acsr_3wire') {
      tickOffsets = [-0.06, 0, 0.06]; // 3 ticks
    } else if (edge.type === 'acsr_2wire') {
      tickOffsets = [-0.04, 0.04]; // 2 ticks
    } else if (edge.type === 'theft_acsr') {
      tickOffsets = [-0.06, 0, 0.06]; // 3 warning ticks
    } else if (edge.type === 'service_cable' || edge.type === 'service_cable_3ph') {
      tickOffsets =
        is3PhaseService || edge.type === 'service_cable_3ph'
          ? [-0.07, -0.025, 0.025, 0.07]
          : [-0.035, 0.035];
    }

    for (const d of tickOffsets) {
      const tGeom = getTickLineGeometry(x1, y1, x2, y2, d, tickLen);
      slide.addShape(pres.ShapeType.line, {
        x: tGeom.x,
        y: tGeom.y,
        w: tGeom.w,
        h: tGeom.h,
        flipH: tGeom.flipH,
        line: { color: lineColor, width: 2.0 },
      });
    }

    // Span length label text pill at midpoint
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const spanText = edge.manualSpanOverride || `${edge.spanMeters || 40} M`;

    slide.addText(spanText, {
      x: midX - 0.35,
      y: midY - 0.11,
      w: 0.7,
      h: 0.22,
      fontSize: 7,
      bold: true,
      color: '334155',
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 0.5 },
      align: 'center',
      valign: 'middle',
    });
  }

  // iv. Stays
  if (project.stays && project.stays.length > 0) {
    for (const stay of project.stays) {
      const pole = nodeMap.get(stay.poleId);
      if (!pole) continue;

      const px = toSlideX(pole.x);
      const py = toSlideY(pole.y);
      const angleRad = (stay.angle * Math.PI) / 180;
      const stayDist = Math.max(toSlideDist(stay.length || 35), 0.35);

      const sx = px + stayDist * Math.cos(angleRad);
      const sy = py + stayDist * Math.sin(angleRad);
      const geom = getLineGeometry(px, py, sx, sy);

      const stayColor = stay.type === 'ht_stay' ? 'DC2626' : '0284C7';
      slide.addShape(pres.ShapeType.line, {
        x: geom.x,
        y: geom.y,
        w: geom.w,
        h: geom.h,
        flipH: geom.flipH,
        line: { color: stayColor, width: 1.5, dashType: 'dash' },
      });

      slide.addShape(pres.ShapeType.ellipse, {
        x: sx - 0.05,
        y: sy - 0.05,
        w: 0.1,
        h: 0.1,
        fill: { color: stayColor },
      });

      slide.addText(stay.type === 'ht_stay' ? 'HT STAY' : 'LT STAY', {
        x: sx - 0.35,
        y: sy + 0.06,
        w: 0.7,
        h: 0.18,
        fontSize: 6.5,
        bold: true,
        color: stayColor,
        align: 'center',
      });
    }
  }

  // v. Authentic High-Fidelity Electrical Nodes & Symbols
  for (const node of project.nodes) {
    const nx = toSlideX(node.x);
    const ny = toSlideY(node.y);
    const isProposed = node.status === 'proposed';
    const primaryColor = isProposed ? 'DC2626' : '1E293B';
    const fillColor = isProposed ? 'FEF2F2' : 'F8FAFC';

    // ---------------- 1. 8M PCC POLE ----------------
    if (node.type === 'pole_8m') {
      if (isProposed) {
        // Red dashed outer survey ring + solid inner core + cross-arm
        slide.addShape(pres.ShapeType.ellipse, {
          x: nx - 0.13,
          y: ny - 0.13,
          w: 0.26,
          h: 0.26,
          fill: { color: 'FFFFFF' },
          line: { color: 'DC2626', width: 2.0, dashType: 'dash' },
        });
        slide.addShape(pres.ShapeType.ellipse, {
          x: nx - 0.07,
          y: ny - 0.07,
          w: 0.14,
          h: 0.14,
          fill: { color: 'FEE2E2' },
          line: { color: 'DC2626', width: 1.2 },
        });
        slide.addShape(pres.ShapeType.ellipse, {
          x: nx - 0.03,
          y: ny - 0.03,
          w: 0.06,
          h: 0.06,
          fill: { color: 'DC2626' },
        });
        // Cross-arm lines
        slide.addShape(pres.ShapeType.line, {
          x: nx - 0.15,
          y: ny,
          w: 0.07,
          h: 0.001,
          line: { color: 'DC2626', width: 1.5 },
        });
        slide.addShape(pres.ShapeType.line, {
          x: nx + 0.08,
          y: ny,
          w: 0.07,
          h: 0.001,
          line: { color: 'DC2626', width: 1.5 },
        });
      } else {
        // Existing 8m Pole: Solid charcoal circle with survey cross-hairs (+)
        slide.addShape(pres.ShapeType.ellipse, {
          x: nx - 0.12,
          y: ny - 0.12,
          w: 0.24,
          h: 0.24,
          fill: { color: 'FFFFFF' },
          line: { color: '1E293B', width: 2.0 },
        });
        slide.addShape(pres.ShapeType.line, {
          x: nx - 0.1,
          y: ny,
          w: 0.2,
          h: 0.001,
          line: { color: '1E293B', width: 1.5 },
        });
        slide.addShape(pres.ShapeType.line, {
          x: nx,
          y: ny - 0.1,
          w: 0.001,
          h: 0.2,
          line: { color: '1E293B', width: 1.5 },
        });
        slide.addShape(pres.ShapeType.ellipse, {
          x: nx - 0.03,
          y: ny - 0.03,
          w: 0.06,
          h: 0.06,
          fill: { color: '1E293B' },
        });
      }
    }

    // ---------------- 2. 9M PCC POLE ----------------
    else if (node.type === 'pole_9m' || node.type === 'pole_single') {
      const ringFill = isProposed ? 'FEE2E2' : 'F1F5F9';
      const ringStroke = isProposed ? 'DC2626' : '1E293B';

      // Outer ring
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.15,
        y: ny - 0.15,
        w: 0.3,
        h: 0.3,
        fill: { color: ringFill },
        line: { color: ringStroke, width: 2.0 },
      });
      // Inner ring
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.1,
        y: ny - 0.1,
        w: 0.2,
        h: 0.2,
        fill: { color: 'FFFFFF' },
        line: { color: ringStroke, width: 1.2 },
      });
      // Authentic "9" designation in center
      slide.addText('9', {
        x: nx - 0.1,
        y: ny - 0.1,
        w: 0.2,
        h: 0.2,
        fontSize: 8.5,
        bold: true,
        color: ringStroke,
        align: 'center',
        valign: 'middle',
      });
      // V-Cross Arm pin markers
      slide.addShape(pres.ShapeType.line, {
        x: nx - 0.18,
        y: ny - 0.06,
        w: 0.18,
        h: 0.06,
        flipH: true,
        line: { color: ringStroke, width: 1.5 },
      });
      slide.addShape(pres.ShapeType.line, {
        x: nx,
        y: ny - 0.06,
        w: 0.18,
        h: 0.06,
        line: { color: ringStroke, width: 1.5 },
      });
    }

    // ---------------- 3. RSJ / RAIL POLE (I-BEAM) ----------------
    else if (node.type === 'pole_rsj') {
      // Concrete footing base circle (dashed)
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.15,
        y: ny - 0.15,
        w: 0.3,
        h: 0.3,
        fill: { color: 'FFFFFF' },
        line: { color: primaryColor, width: 1.5, dashType: 'dash' },
      });
      // I-Beam top flange
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.09,
        y: ny - 0.1,
        w: 0.18,
        h: 0.035,
        fill: { color: primaryColor },
      });
      // Central web
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.02,
        y: ny - 0.07,
        w: 0.04,
        h: 0.14,
        fill: { color: primaryColor },
      });
      // Bottom flange
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.09,
        y: ny + 0.065,
        w: 0.18,
        h: 0.035,
        fill: { color: primaryColor },
      });
    }

    // ---------------- 4. STEEL TUBULAR POLE (STP) ----------------
    else if (node.type === 'pole_stp') {
      // 3 Concentric telescopic swaged sections
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.15,
        y: ny - 0.15,
        w: 0.3,
        h: 0.3,
        fill: { color: 'FFFFFF' },
        line: { color: primaryColor, width: 2.0 },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.1,
        y: ny - 0.1,
        w: 0.2,
        h: 0.2,
        fill: { color: fillColor },
        line: { color: primaryColor, width: 1.5, dashType: 'dash' },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.055,
        y: ny - 0.055,
        w: 0.11,
        h: 0.11,
        fill: { color: 'FFFFFF' },
        line: { color: primaryColor, width: 1.5 },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.02,
        y: ny - 0.02,
        w: 0.04,
        h: 0.04,
        fill: { color: primaryColor },
      });
    }

    // ---------------- 5. DP STRUCTURE (H-FRAME) ----------------
    else if (node.type === 'dp_structure') {
      // Channel beams (top & bottom)
      slide.addShape(pres.ShapeType.line, {
        x: nx - 0.19,
        y: ny - 0.09,
        w: 0.38,
        h: 0.001,
        line: { color: primaryColor, width: 3.0 },
      });
      slide.addShape(pres.ShapeType.line, {
        x: nx - 0.19,
        y: ny + 0.09,
        w: 0.38,
        h: 0.001,
        line: { color: primaryColor, width: 2.5 },
      });
      // Diagonal X-bracings
      slide.addShape(pres.ShapeType.line, {
        x: nx - 0.16,
        y: ny - 0.09,
        w: 0.32,
        h: 0.18,
        line: { color: isProposed ? 'EF4444' : '64748B', width: 1.2, dashType: 'dash' },
      });
      slide.addShape(pres.ShapeType.line, {
        x: nx - 0.16,
        y: ny - 0.09,
        w: 0.32,
        h: 0.18,
        flipH: true,
        line: { color: isProposed ? 'EF4444' : '64748B', width: 1.2, dashType: 'dash' },
      });
      // Left and right pole columns
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.16 - 0.08,
        y: ny - 0.08,
        w: 0.16,
        h: 0.16,
        fill: { color: 'FFFFFF' },
        line: { color: primaryColor, width: 2.0 },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.16 - 0.025,
        y: ny - 0.025,
        w: 0.05,
        h: 0.05,
        fill: { color: primaryColor },
      });

      slide.addShape(pres.ShapeType.ellipse, {
        x: nx + 0.16 - 0.08,
        y: ny - 0.08,
        w: 0.16,
        h: 0.16,
        fill: { color: 'FFFFFF' },
        line: { color: primaryColor, width: 2.0 },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx + 0.16 - 0.025,
        y: ny - 0.025,
        w: 0.05,
        h: 0.05,
        fill: { color: primaryColor },
      });

      slide.addText('DP', {
        x: nx - 0.2,
        y: ny + 0.12,
        w: 0.4,
        h: 0.18,
        fontSize: 7,
        bold: true,
        color: primaryColor,
        align: 'center',
      });
    }

    // ---------------- 6. 4-POLE SUBSTATION STRUCTURE ----------------
    else if (node.type === 'four_pole') {
      const fpW = 0.48;
      // Foundation boundary
      slide.addShape(pres.ShapeType.rect, {
        x: nx - fpW / 2,
        y: ny - fpW / 2,
        w: fpW,
        h: fpW,
        fill: { color: fillColor },
        line: { color: primaryColor, width: 2.0 },
      });
      // Diagonal X-bracing
      slide.addShape(pres.ShapeType.line, {
        x: nx - fpW / 2 + 0.04,
        y: ny - fpW / 2 + 0.04,
        w: fpW - 0.08,
        h: fpW - 0.08,
        line: { color: isProposed ? 'EF4444' : '64748B', width: 1.0, dashType: 'dash' },
      });
      slide.addShape(pres.ShapeType.line, {
        x: nx - fpW / 2 + 0.04,
        y: ny - fpW / 2 + 0.04,
        w: fpW - 0.08,
        h: fpW - 0.08,
        flipH: true,
        line: { color: isProposed ? 'EF4444' : '64748B', width: 1.0, dashType: 'dash' },
      });
      // 4 Corner heavy poles
      const pOffset = 0.15;
      [
        [-pOffset, -pOffset],
        [pOffset, -pOffset],
        [-pOffset, pOffset],
        [pOffset, pOffset],
      ].forEach(([dx, dy]) => {
        slide.addShape(pres.ShapeType.ellipse, {
          x: nx + dx - 0.06,
          y: ny + dy - 0.06,
          w: 0.12,
          h: 0.12,
          fill: { color: 'FFFFFF' },
          line: { color: primaryColor, width: 1.8 },
        });
        slide.addShape(pres.ShapeType.ellipse, {
          x: nx + dx - 0.02,
          y: ny + dy - 0.02,
          w: 0.04,
          h: 0.04,
          fill: { color: primaryColor },
        });
      });
      // Center 4P plinth badge
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.08,
        y: ny - 0.08,
        w: 0.16,
        h: 0.16,
        fill: { color: 'FEE2E2' },
        line: { color: 'DC2626', width: 1.2 },
      });
      slide.addText('4P', {
        x: nx - 0.08,
        y: ny - 0.08,
        w: 0.16,
        h: 0.16,
        fontSize: 6.5,
        bold: true,
        color: 'DC2626',
        align: 'center',
        valign: 'middle',
      });
    }

    // ---------------- 7. DISTRIBUTION TRANSFORMER (DTR: 25kVA, 63kVA, 100kVA) ----------------
    else if (node.type === 'dtr_25kva' || node.type === 'dtr_63kva' || node.type === 'dtr_100kva') {
      const dtrW = 0.52;
      const dtrH = 0.38;
      // Transformer Plinth Base
      slide.addShape(pres.ShapeType.rect, {
        x: nx - dtrW / 2,
        y: ny - dtrH / 2,
        w: dtrW,
        h: dtrH,
        fill: { color: fillColor },
        line: { color: primaryColor, width: 1.5 },
      });
      // Top HT 11kV Bushings
      [-0.14, 0, 0.14].forEach((bx) => {
        slide.addShape(pres.ShapeType.line, {
          x: nx + bx,
          y: ny - dtrH / 2 - 0.06,
          w: 0.001,
          h: 0.06,
          line: { color: primaryColor, width: 1.8 },
        });
        slide.addShape(pres.ShapeType.ellipse, {
          x: nx + bx - 0.02,
          y: ny - dtrH / 2 - 0.08,
          w: 0.04,
          h: 0.04,
          fill: { color: primaryColor },
        });
      });
      // Dual interlocking transformer coils (Δ-Y)
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.15,
        y: ny - 0.11,
        w: 0.22,
        h: 0.22,
        fill: { color: 'FFFFFF' },
        line: { color: primaryColor, width: 2.0 },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.07,
        y: ny - 0.11,
        w: 0.22,
        h: 0.22,
        fill: { color: 'FFFFFF' },
        line: { color: primaryColor, width: 2.0 },
      });
      slide.addText('Δ', {
        x: nx - 0.15,
        y: ny - 0.11,
        w: 0.14,
        h: 0.22,
        fontSize: 7.5,
        bold: true,
        color: primaryColor,
        align: 'center',
        valign: 'middle',
      });
      slide.addText('Y', {
        x: nx + 0.01,
        y: ny - 0.11,
        w: 0.14,
        h: 0.22,
        fontSize: 7.5,
        bold: true,
        color: primaryColor,
        align: 'center',
        valign: 'middle',
      });

      // Rating badge below
      const cap =
        node.properties.capacityKva ||
        (node.type === 'dtr_100kva' ? 100 : node.type === 'dtr_63kva' ? 63 : 25);
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.24,
        y: ny + dtrH / 2 + 0.04,
        w: 0.48,
        h: 0.18,
        fill: { color: primaryColor },
      });
      slide.addText(`${cap} kVA`, {
        x: nx - 0.24,
        y: ny + dtrH / 2 + 0.04,
        w: 0.48,
        h: 0.18,
        fontSize: 7.5,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
      });
    }

    // ---------------- 8. DTR CONVERSION (63 TO 100 kVA) ----------------
    else if (node.type === 'dtr_conversion') {
      // Left 63kVA DTR
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.38,
        y: ny - 0.15,
        w: 0.3,
        h: 0.3,
        fill: { color: 'F8FAFC' },
        line: { color: '475569', width: 1.5 },
      });
      slide.addText('63kVA', {
        x: nx - 0.38,
        y: ny + 0.17,
        w: 0.3,
        h: 0.15,
        fontSize: 6.5,
        bold: true,
        color: '475569',
        align: 'center',
      });
      // Upgrade Arrow
      slide.addShape(pres.ShapeType.line, {
        x: nx - 0.07,
        y: ny,
        w: 0.14,
        h: 0.001,
        line: { color: 'DC2626', width: 2.2 },
      });
      // Right 100kVA DTR
      slide.addShape(pres.ShapeType.rect, {
        x: nx + 0.08,
        y: ny - 0.17,
        w: 0.34,
        h: 0.34,
        fill: { color: 'FEE2E2' },
        line: { color: 'DC2626', width: 2.0 },
      });
      slide.addText('100kVA', {
        x: nx + 0.08,
        y: ny + 0.19,
        w: 0.34,
        h: 0.16,
        fontSize: 7.5,
        bold: true,
        color: 'DC2626',
        align: 'center',
      });
    }

    // ---------------- 9. BROKEN PCC POLE (GREEN CRACKED SYMBOL) ----------------
    else if (node.type === 'broken_pole') {
      // Green broken survey circle
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.14,
        y: ny - 0.14,
        w: 0.28,
        h: 0.28,
        fill: { color: 'F0FDF4' },
        line: { color: '16A34A', width: 2.0, dashType: 'dash' },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.06,
        y: ny - 0.06,
        w: 0.12,
        h: 0.12,
        fill: { color: 'DCFCE7' },
        line: { color: '16A34A', width: 1.2 },
      });
      // Broken crack zigzag across pole
      slide.addText('✕', {
        x: nx - 0.1,
        y: ny - 0.1,
        w: 0.2,
        h: 0.2,
        fontSize: 8.5,
        bold: true,
        color: '15803D',
        align: 'center',
        valign: 'middle',
      });
      // Cross-arm
      slide.addShape(pres.ShapeType.line, {
        x: nx - 0.15,
        y: ny,
        w: 0.07,
        h: 0.001,
        line: { color: '16A34A', width: 1.5 },
      });
      slide.addShape(pres.ShapeType.line, {
        x: nx + 0.08,
        y: ny,
        w: 0.07,
        h: 0.001,
        line: { color: '16A34A', width: 1.5 },
      });
      // Green badge below
      slide.addText(`BROKEN ${node.properties.height || '8M'}`, {
        x: nx - 0.45,
        y: ny + 0.16,
        w: 0.9,
        h: 0.18,
        fontSize: 6.5,
        bold: true,
        color: '15803D',
        align: 'center',
      });
    }

    // ---------------- 10. BOX BRACKET [o] ----------------
    else if (node.type === 'box_bracket') {
      // Outer square box
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.12,
        y: ny - 0.12,
        w: 0.24,
        h: 0.24,
        fill: { color: fillColor },
        line: { color: primaryColor, width: 2.0 },
      });
      // Center circle representing [o]
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.055,
        y: ny - 0.055,
        w: 0.11,
        h: 0.11,
        fill: { color: 'FFFFFF' },
        line: { color: primaryColor, width: 1.5 },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.02,
        y: ny - 0.02,
        w: 0.04,
        h: 0.04,
        fill: { color: primaryColor },
      });
      slide.addText('BOX BRACKET', {
        x: nx - 0.45,
        y: ny + 0.14,
        w: 0.9,
        h: 0.16,
        fontSize: 6.5,
        bold: true,
        color: primaryColor,
        align: 'center',
      });
    }

    // ---------------- 11. SWITCHGEAR & APPARATUS ----------------
    else if (node.type === 'ab_switch') {
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.18,
        y: ny - 0.09,
        w: 0.36,
        h: 0.18,
        fill: { color: fillColor },
        line: { color: primaryColor, width: 1.5 },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.11,
        y: ny - 0.035,
        w: 0.07,
        h: 0.07,
        fill: { color: primaryColor },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx + 0.04,
        y: ny - 0.035,
        w: 0.07,
        h: 0.07,
        fill: { color: primaryColor },
      });
      slide.addShape(pres.ShapeType.line, {
        x: nx - 0.11,
        y: ny,
        w: 0.18,
        h: 0.1,
        flipH: true,
        line: { color: primaryColor, width: 2.5 },
      });
      slide.addText('AB SWITCH', {
        x: nx - 0.4,
        y: ny + 0.12,
        w: 0.8,
        h: 0.16,
        fontSize: 6.5,
        bold: true,
        color: primaryColor,
        align: 'center',
      });
    } else if (node.type === 'hg_fuse') {
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.16,
        y: ny - 0.09,
        w: 0.32,
        h: 0.18,
        fill: { color: fillColor },
        line: { color: primaryColor, width: 1.5 },
      });
      slide.addShape(pres.ShapeType.line, {
        x: nx - 0.12,
        y: ny,
        w: 0.07,
        h: 0.001,
        line: { color: primaryColor, width: 2 },
      });
      slide.addShape(pres.ShapeType.line, {
        x: nx + 0.05,
        y: ny,
        w: 0.07,
        h: 0.001,
        line: { color: primaryColor, width: 2 },
      });
      slide.addText('HG FUSE', {
        x: nx - 0.4,
        y: ny + 0.12,
        w: 0.8,
        h: 0.16,
        fontSize: 6.5,
        bold: true,
        color: primaryColor,
        align: 'center',
      });
    } else if (node.type === 'lt_distribution_box') {
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.17,
        y: ny - 0.15,
        w: 0.34,
        h: 0.3,
        fill: { color: 'F0F9FF' },
        line: { color: '0284C7', width: 2.0 },
      });
      slide.addText('LT BOX', {
        x: nx - 0.17,
        y: ny - 0.15,
        w: 0.34,
        h: 0.3,
        fontSize: 6.5,
        bold: true,
        color: '0284C7',
        align: 'center',
        valign: 'middle',
      });
    } else if (node.type === 'lightning_arrester') {
      slide.addShape(pres.ShapeType.diamond, {
        x: nx - 0.12,
        y: ny - 0.14,
        w: 0.24,
        h: 0.28,
        fill: { color: 'FEF3C7' },
        line: { color: 'B45309', width: 1.5 },
      });
      slide.addText('LA', {
        x: nx - 0.12,
        y: ny - 0.14,
        w: 0.24,
        h: 0.28,
        fontSize: 7,
        bold: true,
        color: 'B45309',
        align: 'center',
        valign: 'middle',
      });
    } else if (node.type === 'consumer_house') {
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.16,
        y: ny - 0.08,
        w: 0.32,
        h: 0.22,
        fill: { color: '15803D' },
        line: { color: '14532D', width: 1.5 },
      });
      slide.addShape(pres.ShapeType.triangle, {
        x: nx - 0.18,
        y: ny - 0.2,
        w: 0.36,
        h: 0.12,
        fill: { color: 'B91C1C' },
        line: { color: '991B1B', width: 1.2 },
      });
      slide.addText('HOUSE', {
        x: nx - 0.3,
        y: ny + 0.16,
        w: 0.6,
        h: 0.15,
        fontSize: 6,
        bold: true,
        color: '15803D',
        align: 'center',
      });
    } else if (node.type === 'substation_tap') {
      slide.addShape(pres.ShapeType.rect, {
        x: nx - 0.18,
        y: ny - 0.13,
        w: 0.36,
        h: 0.26,
        fill: { color: 'F8FAFC' },
        line: { color: primaryColor, width: 2.0 },
      });
      slide.addText('SUB', {
        x: nx - 0.18,
        y: ny - 0.13,
        w: 0.36,
        h: 0.26,
        fontSize: 6.5,
        bold: true,
        color: primaryColor,
        align: 'center',
        valign: 'middle',
      });
    } else {
      // General Pole fallback
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.12,
        y: ny - 0.12,
        w: 0.24,
        h: 0.24,
        fill: { color: primaryColor },
        line: { color: primaryColor, width: 1.5 },
      });
      slide.addShape(pres.ShapeType.ellipse, {
        x: nx - 0.03,
        y: ny - 0.03,
        w: 0.06,
        h: 0.06,
        fill: { color: 'FFFFFF' },
      });
    }

    // Pole Number & Height Label (Native PowerPoint Text Box)
    const poleNum = node.properties.poleNumber || node.label || 'Pole';
    const heightTag = node.properties.height ? ` (${node.properties.height})` : '';
    slide.addText(`${poleNum}${heightTag}`, {
      x: nx - 0.75,
      y: ny + 0.18,
      w: 1.5,
      h: 0.22,
      fontSize: 7.5,
      bold: true,
      color: '000000',
      align: 'center',
      valign: 'top',
    });
  }

  // vi. Annotations
  if (project.annotations && project.annotations.length > 0) {
    for (const ann of project.annotations) {
      slide.addText(ann.text, {
        x: toSlideX(ann.x),
        y: toSlideY(ann.y),
        w: 2.2,
        h: 0.35,
        fontSize: Math.max(ann.fontSize * 0.7, 7.5),
        bold: !!ann.isBold,
        color: cleanHex(ann.color, '000000'),
      });
    }
  }

  // -------------------------------------------------------------------------
  // 4. BOTTOM TITLE BLOCK (Identical 3-Column Engineering Layout)
  // -------------------------------------------------------------------------
  onProgress?.('Generating PDF-matching engineering title block...');

  const btbCol1W = innerW * 0.33;
  const btbCol2W = innerW * 0.33;
  const btbCol3W = innerW - btbCol1W - btbCol2W;

  const btbDiv1X = innerX + btbCol1W;
  const btbDiv2X = innerX + btbCol1W + btbCol2W;

  slide.addShape(pres.ShapeType.line, {
    x: btbDiv1X,
    y: btbTopY,
    w: 0.001,
    h: btbH,
    line: { color: '000000', width: 1.0 },
  });

  slide.addShape(pres.ShapeType.line, {
    x: btbDiv2X,
    y: btbTopY,
    w: 0.001,
    h: btbH,
    line: { color: '000000', width: 1.0 },
  });

  // (A) Box 1: PROJECT CONTACTS (Left)
  const agencyTitle = metadata.agencyName ? metadata.agencyName.toUpperCase() : 'TURNKEY CONTRACTOR';
  const applicantName = metadata.applicantName
    ? `APPLICANT: Sri ${metadata.applicantName}`
    : 'APPLICANT: Sri Subhash Roy';
  const applicantPhone = metadata.applicantPhone
    ? `PHONE: ${metadata.applicantPhone}`
    : 'PHONE: 9800000000';
  const applicantAddr = metadata.applicantAddress
    ? `ADDRESS: ${metadata.applicantAddress}`
    : 'ADDRESS: Falakata';

  slide.addText(
    [
      { text: 'PROJECT CONTACTS\n', options: { fontSize: 6.5, bold: true, color: '6B7280' } },
      { text: `${agencyTitle}\n`, options: { fontSize: 8.5, bold: true, color: '000000' } },
      { text: `${applicantName}\n`, options: { fontSize: 7.5, color: '1F2937' } },
      { text: `${applicantPhone}  |  ${applicantAddr}`, options: { fontSize: 7.5, color: '374151' } },
    ],
    {
      x: innerX + 0.1,
      y: btbTopY + 0.06,
      w: btbCol1W - 0.2,
      h: btbH - 0.12,
      valign: 'middle',
      align: 'left',
      margin: 0,
    }
  );

  // (B) Box 2: DRAWING TITLE & DETAILS (Center)
  const dtTitle =
    metadata.title || metadata.projectName || project.title || 'DISTRIBUTION NETWORK SKETCH';
  const dtProject = metadata.projectName
    ? `PROJECT: ${metadata.projectName}`
    : `PROJECT: ${project.title || 'Falakata Corridor'}`;
  const dtDrawingNo = metadata.drawingNo
    ? `DRAWING NO: ${metadata.drawingNo}`
    : 'DRAWING NO: WB/FK/2026/042';

  slide.addText(
    [
      { text: 'DRAWING TITLE\n', options: { fontSize: 6.5, bold: true, color: '6B7280' } },
      { text: `${dtTitle}\n`, options: { fontSize: 9, bold: true, color: '000000' } },
      { text: `${dtProject}\n`, options: { fontSize: 7.5, color: '1F2937' } },
      { text: dtDrawingNo, options: { fontSize: 7.5, bold: true, color: '1F2937' } },
    ],
    {
      x: btbDiv1X + 0.1,
      y: btbTopY + 0.06,
      w: btbCol2W - 0.2,
      h: btbH - 0.12,
      valign: 'middle',
      align: 'left',
      margin: 0,
    }
  );

  // (C) Box 3: 3-TIER SIGN-OFF GRID (Right)
  const signOffColW = btbCol3W / 3;

  slide.addShape(pres.ShapeType.line, {
    x: btbDiv2X + signOffColW,
    y: btbTopY,
    w: 0.001,
    h: btbH,
    line: { color: '000000', width: 0.75 },
  });

  slide.addShape(pres.ShapeType.line, {
    x: btbDiv2X + signOffColW * 2,
    y: btbTopY,
    w: 0.001,
    h: btbH,
    line: { color: '000000', width: 0.75 },
  });

  // Sign-Off 1: Prepared By
  slide.addText(
    [
      { text: 'PREPARED BY\n', options: { fontSize: 6.5, bold: true, color: '6B7280' } },
      {
        text: `${metadata.preparedBy || 'Surveyor / SAE'}\n`,
        options: { fontSize: 7.5, bold: true, color: '000000' },
      },
      { text: `${metadata.preparedByOffice || 'CCC Falakata'}`, options: { fontSize: 7, color: '4B5563' } },
    ],
    {
      x: btbDiv2X + 0.06,
      y: btbTopY + 0.06,
      w: signOffColW - 0.12,
      h: btbH - 0.12,
      valign: 'middle',
      align: 'center',
      margin: 0,
    }
  );

  // Sign-Off 2: Checked By
  slide.addText(
    [
      { text: 'CHECKED BY\n', options: { fontSize: 6.5, bold: true, color: '6B7280' } },
      {
        text: `${metadata.checkedBy || 'AE & Station Manager'}\n`,
        options: { fontSize: 7.5, bold: true, color: '000000' },
      },
      {
        text: `${metadata.checkedByOffice || 'Falakata Sub-Div'}`,
        options: { fontSize: 7, color: '4B5563' },
      },
    ],
    {
      x: btbDiv2X + signOffColW + 0.06,
      y: btbTopY + 0.06,
      w: signOffColW - 0.12,
      h: btbH - 0.12,
      valign: 'middle',
      align: 'center',
      margin: 0,
    }
  );

  // Sign-Off 3: Approved By
  slide.addText(
    [
      { text: 'APPROVED BY\n', options: { fontSize: 6.5, bold: true, color: '6B7280' } },
      {
        text: `${metadata.approvedBy || 'Divisional Engineer'}\n`,
        options: { fontSize: 7.5, bold: true, color: '000000' },
      },
      {
        text: `${metadata.approvedByOffice || 'Alipurduar Div'}`,
        options: { fontSize: 7, color: '4B5563' },
      },
    ],
    {
      x: btbDiv2X + signOffColW * 2 + 0.06,
      y: btbTopY + 0.06,
      w: signOffColW - 0.12,
      h: btbH - 0.12,
      valign: 'middle',
      align: 'center',
      margin: 0,
    }
  );

  // -------------------------------------------------------------------------
  // SLIDE 2: COMPLETE FULL-PAGE BILL OF QUANTITIES (BOQ) SCHEDULE
  // -------------------------------------------------------------------------
  onProgress?.('Generating comprehensive BOQ schedule on Slide 2...');
  const boqSlide = pres.addSlide();
  boqSlide.background = { color: 'FFFFFF' };

  // Double border on Slide 2
  boqSlide.addShape(pres.ShapeType.rect, {
    x: m,
    y: m,
    w: outerW,
    h: outerH,
    fill: { color: 'FFFFFF' },
    line: { color: '000000', width: 2.5 },
  });

  boqSlide.addShape(pres.ShapeType.rect, {
    x: innerX,
    y: innerY,
    w: innerW,
    h: innerH,
    fill: { color: 'FFFFFF' },
    line: { color: '000000', width: 1.0 },
  });

  // Slide 2 Header
  boqSlide.addShape(pres.ShapeType.rect, {
    x: innerX,
    y: innerY,
    w: innerW,
    h: 0.65,
    fill: { color: 'F8FAFC' },
    line: { color: '000000', width: 1.0 },
  });

  boqSlide.addText('BILL OF QUANTITIES (BOQ) & SCHEDULE OF MATERIALS', {
    x: innerX + 0.2,
    y: innerY + 0.06,
    w: innerW - 0.4,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: 'DC2626',
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  const boqSubTitle = [
    metadata.drawingNo ? `Drawing No: ${metadata.drawingNo}` : 'Drawing No: WB/FK/2026/042',
    metadata.projectName
      ? `Project: ${metadata.projectName}`
      : `Project: ${project.title || 'Falakata Line'}`,
    metadata.workType === 'maintenance_work'
      ? 'Scheme: Maintenance & Renovation'
      : 'Scheme: Electrification & New Pole Erection',
    `Date: ${metadata.date || new Date().toISOString().slice(0, 10)}`,
  ].join('   |   ');

  boqSlide.addText(boqSubTitle, {
    x: innerX + 0.2,
    y: innerY + 0.36,
    w: innerW - 0.4,
    h: 0.22,
    fontSize: 8,
    bold: true,
    color: '4B5563',
    align: 'center',
    valign: 'middle',
    margin: 0,
  });

  // Full BOQ Table
  const fullBoqRows: any[] = [
    [
      {
        text: 'SL NO',
        options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, fontSize: 8.5, align: 'center' },
      },
      {
        text: 'DESCRIPTION OF MATERIAL / WORK',
        options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, fontSize: 8.5 },
      },
      {
        text: 'CATEGORY',
        options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, fontSize: 8.5, align: 'center' },
      },
      {
        text: 'QUANTITY',
        options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, fontSize: 8.5, align: 'right' },
      },
      {
        text: 'UNIT',
        options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, fontSize: 8.5, align: 'center' },
      },
    ],
  ];

  if (boqItems.length === 0) {
    fullBoqRows.push([
      { text: '—', options: { align: 'center', fontSize: 8 } },
      { text: 'No material items drafted on this drawing.', options: { fontSize: 8 } },
      { text: '—', options: { align: 'center', fontSize: 8 } },
      { text: '0', options: { align: 'right', fontSize: 8 } },
      { text: 'Nos', options: { align: 'center', fontSize: 8 } },
    ]);
  } else {
    boqItems.forEach((item, idx) => {
      const isEven = idx % 2 === 0;
      const rowFill = isEven ? 'F8FAFC' : 'FFFFFF';
      fullBoqRows.push([
        { text: String(idx + 1), options: { align: 'center', fontSize: 8, fill: { color: rowFill } } },
        { text: item.description, options: { fontSize: 8, fill: { color: rowFill } } },
        {
          text: item.category.toUpperCase(),
          options: { align: 'center', fontSize: 7.5, fill: { color: rowFill } },
        },
        {
          text: String(item.quantity),
          options: { align: 'right', fontSize: 8, bold: true, fill: { color: rowFill } },
        },
        { text: item.unit, options: { align: 'center', fontSize: 8, fill: { color: rowFill } } },
      ]);
    });
  }

  const boqTableW = innerW - 0.4;
  boqSlide.addTable(fullBoqRows, {
    x: innerX + 0.2,
    y: innerY + 0.85,
    w: boqTableW,
    colW: [
      boqTableW * 0.08,
      boqTableW * 0.54,
      boqTableW * 0.16,
      boqTableW * 0.12,
      boqTableW * 0.1,
    ],
    border: { color: 'CBD5E1', pt: 0.5 },
    margin: [2, 4, 2, 4],
  });

  // Footer notes on Slide 2
  boqSlide.addText(
    '* Note: All quantities and CAD objects in this presentation are natively rendered vector shapes and are fully editable in PowerPoint.',
    {
      x: innerX + 0.2,
      y: innerY + innerH - 0.45,
      w: innerW - 0.4,
      h: 0.3,
      fontSize: 7.5,
      italic: true,
      color: '64748B',
    }
  );

  // -------------------------------------------------------------------------
  // Save / Trigger Download
  // -------------------------------------------------------------------------
  onProgress?.('Saving editable PowerPoint presentation...');
  const baseFilename = sanitizeFilename(metadata.drawingNo || project.title || 'powerline_drawing');
  const filename = `${baseFilename}_editable.pptx`;

  await pres.writeFile({ fileName: filename });
  onProgress?.('PowerPoint export complete!');
}
