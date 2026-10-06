# PowerLine Designer — Electrical Distribution Line Drawing & Management System

An engineering-grade web application for creating, editing, managing, and exporting professional electrical distribution line drawings (maintenance, erection, phase conversion, and DTR capacity upgrades) with precision CAD drafting, interactive GIS map underlay, automated Bill of Quantities (BOQ), and print-ready A4 Landscape PDF export.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions incorporate your answers and match the technical conventions of the 6 provided sample drawings:

- **Confirmed Decision 1 (Templates & Starter Projects)**: Starting with a blank canvas accompanied by a rich **Template Picker** containing pre-configured layouts for all 6 sample drawing types:
  1. *River Crossing, 25 kVA DTR & 1-Phase to 3-Phase Conversion (1.119 KM)*
  2. *Rural Consumer Line with S/C Connections & 8m PCC Poles (Papai Barman, etc.)*
  3. *DTR Capacity Conversion (63 kVA to 100 kVA) with ACSR Resagging & Service Drops*
  4. *HT-OH Line Induction with 25 kVA DTR on 9m PCC Pole (Ashok Saha)*
  5. *Highway Road Crossing with LT AB Cable & Commercial Consumer (Birpara-Falakata Rd)*
  6. *Commercial Fuel Station Connection (Rajeshwary Fuel Station, NH Road, 4-Pole Structure)*
- **Confirmed Decision 2 (Export Specification)**: Standard **A4 Landscape** drawing sheet layout (297mm × 210mm) featuring an engineering title block (Application No, Consumer Name, Address, Phone, Checked By, Approved By), dynamic Symbol Index / Legend, and an editable Bill of Quantities (BOQ) schedule.
- **Confirmed Decision 3 (Workspace Layout)**: **Dual-mode workspace** pairing a high-precision SVG/Canvas CAD drafting grid (pan, zoom, snap-to-grid, snap-to-pole) with an optional toggleable GIS Satellite/Road map underlay (opacity control, lock coordinates, GPS reference).

---

## 1. Overview & Core Concept

### What It Does
PowerLine Designer provides power distribution engineers, electrical contractors, and utility surveyors with a dedicated drafting environment tailored to low-tension (LT) and high-tension (HT) distribution networks. Unlike generic drawing software, every object—PCC pole (8m/9m/single/DP), transformer (25/63/100 kVA), stay set (HT/LT), conductor (ACSR 3-wire/4-wire, AB cable, phase conversion), river crossing, or service connection (S/C)—is a typed electrical entity with live properties (material, height, conductor gauge, span length, existing vs. proposed status).

### Target Audience & Persona
- **Distribution Engineers & Surveyors**: Creating field survey drawings, phase conversion proposals, and pole replacement schemes.
- **Electrical Sub-Division Officers**: Reviewing proposals, checking span measurements, verifying consumer connections, and approving official work orders.
- **Contractors & Linemen**: Utilizing exported A4 work sheets with exact pole numbers, stay directions, and BOQ schedules for erection and maintenance.

### Key Value
Automates span measurement, automatic dimensioning, line-type styling (existing black dashed vs. proposed red lines with phase tick marks), dynamic symbol legend generation, and instant calculation of conductor lengths and material quantities in a single unified workflow.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│   Dashboard    │ ──> │ Template Picker  │ ──> │      CAD Canvas       │
│ Projects/Files │     │ Sample / Blank   │     │ Precision Grid & Tools│
└────────────────┘     └──────────────────┘     └──────────┬────────────┘
                                                           │
        ┌──────────────────────────────────────────────────┴────────────────────────────────┐
        ▼                                                  ▼                                ▼
┌────────────────────┐                           ┌────────────────────┐           ┌────────────────────┐
│ Electrical Palette │                           │ GIS Map Underlay   │           │ Live BOQ & Index   │
│ Poles, Stays, DTR, │                           │ Satellite/Road View│           │ Auto-Quantities    │
│ Lines, Crossings   │                           │ Lock & Opacity     │           │ Title Block Form   │
└────────┬───────────┘                           └─────────┬──────────┘           └────────┬───────────┘
         │                                                 │                               │
         └─────────────────────────────────────────────────┴───────────────────────────────┘
                                                           │
                                                           ▼
                                                ┌───────────────────────┐
                                                │   A4 Landscape PDF    │
                                                │ Vector Print / Export │
                                                └───────────────────────┘
```

1. **Dashboard & Project Launch**: View existing projects or click `+ New Drawing` to select a blank canvas or one of the 6 pre-configured sample blueprints.
2. **Interactive Drafting**:
   - Select tools from the left toolbox (PCC Pole, DP Structure, DTR, HT Line, LT Line, AB Cable, Stay Set, River Crossing, Road, Consumer House).
   - Click or drag on the canvas; automatic snap lines align poles and calculate real-time span distances (e.g., `45 M`, `40 M`, `35 M`).
   - Draw conductors between poles; lines automatically anchor to pole centers, render span dimension tags, and insert conductor type tick marks (e.g. 4-wire cross hatches).
   - Place river or road crossings with dedicated bounding visual ribbons and span annotations.
3. **Inspector & Status Toggle**: Click any object to edit attributes (e.g., switch status between `Existing` (black/neutral) and `Proposed` (vibrant engineering red), adjust DTR capacity from 63 kVA to 100 kVA, or attach consumer names/phone numbers).
4. **BOQ & Index Review**: Open the floating or docked BOQ panel to view the calculated quantities (e.g., `8m PCC Pole = 12 Nos`, `ACSR 50 sq.mm 4-wire = 0.075 KM`), override values if required, and customize the engineering title block.
5. **A4 Sheet Export**: Trigger the Print/Export modal with a real-time WYSIWYG A4 Landscape preview, configure margins and border frames, and download a crisp, publication-ready PDF or vector SVG.

### Visual Identity & Theme
- **Aesthetic Direction**: Professional industrial CAD workspace inspired by AutoCAD and electrical GIS suites. Clean neutral surfaces, high-contrast drafting lines, zero ornamental clutter, and crisp typography.
- **Color Palette**:
  - *Canvas Neutral*: `#F8FAFC` (pure drafting sheet) with fine grid lines `#E2E8F0` / dark mode canvas option `#0F172A`.
  - *Existing Infrastructure*: Deep Charcoal `#1E293B` (solid or dashed per sample standards).
  - *Proposed Infrastructure*: High-Visibility Signal Red `#DC2626` / `#EF4444` (bold red lines, symbols, and arrows matching sample blueprints).
  - *LT AB Cable*: Electrical Blue `#2563EB` (dashed pattern with blue directional arrows).
  - *River / Waterways*: Gentle Cyan `#0284C7` with soft riparian boundary waves.
  - *Structural UI Surfaces*: Slate `#0F172A`, `#1E293B`, and `#334155` for high-density toolbars and status docks.
- **Typography**:
  - *Display / Titles*: `Plus Jakarta Sans` or `Cabinet Grotesk` for clean engineering headers and dialogs.
  - *Engineering Sheet / Canvas Annotations*: Clean uppercase sans-serif with tabular figures (`tabular-nums`) matching official distribution blueprint fonts (`45 M`, `S/C - 06`, `25 KVA DTR`).
- **Component Styling & Layout**:
  - Top CAD bar: File, Edit, View, Insert, Tools, Map, Export, with breadcrumbs and project metadata.
  - Left Tool Palette: Categorized icons (Poles, Transformers, Conductors, Stays, Civil/Landscape, Annotations).
  - Center Viewport: Infinite SVG canvas with smooth pan, zoom, scale-to-fit, and grid snapping.
  - Right Property Dock: Context-sensitive inspector, Layer manager, and BOQ schedule table.
  - Bottom Status Bar: Cursor coordinates (X, Y), Active Tool, Zoom Level, Selected Object Count, and Auto-save indicator.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: High-Performance SVG Object Model vs. Raw HTML5 Canvas
- **Chosen Approach**: SVG-based vector scene graph with structured JSON entity definitions (`PoleNode`, `ConductorEdge`, `StayItem`, `TransformerItem`, `CrossingRegion`, `ConsumerNode`).
- **Why**: SVGs produce razor-sharp vector rendering at any zoom level, allow direct CSS/class styling for "Existing" vs. "Proposed" infrastructure, render native crisp text on A4 export, and support direct DOM interaction and drag-drop selection.
- **Alternative Considered**: Raster HTML5 Canvas (faster for 100,000+ points, but degrades on high-DPI A4 print export and requires complex manual hit-testing for text selection).

### Decision 2: Pure Client-Side Vector A4 PDF Generation (`jsPDF` + SVG Rendering)
- **Chosen Approach**: Direct vector PDF generation using `jspdf` and canvas/SVG drawing pipeline calibrated to exact ISO 216 A4 Landscape dimensions (297mm × 210mm at 300 DPI).
- **Why**: Zero external server dependency, immediate instant download, and flawless rendering of standard electrical title blocks, index tables, and BOQ matrices without layout shifts.
- **Alternative Considered**: Server-side Puppeteer rendering (heavy headless Chrome dependency, high latency, and fails in hermetic offline environments).

### Decision 3: Dual CAD Drafting Grid + GIS Map Underlay
- **Chosen Approach**: A dual-layer architecture where the base layer can toggle between an architectural grid (ortho/isometric grid dots) and an interactive satellite/road map view. An opacity slider (0% to 100%) and a position lock prevent accidental shifts during drafting.
- **Why**: Linemen and field engineers often trace physical road alignments and river banks from satellite imagery, but need standard white CAD sheets for official paper submissions.

### Decision 4: LocalStorage & Client Database Persistence with JSON Import/Export
- **Chosen Approach**: Automatic debounced state persistence in local browser storage, with explicit Project JSON Export/Import, version history snapshots, and full session recovery.
- **Why**: Ensures no work is lost on accidental browser refresh or network disconnection, while allowing easy project backup and file sharing among engineers.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PowerLine Designer App                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Top Bar: Project Title · Undo/Redo · View Mode · Grid Snap · Export · Help │
├───────────────────┬─────────────────────────────────────┬───────────────────┤
│ Left Toolbar      │ Center Viewport                     │ Right Dock        │
│ ───────────────── │ ─────────────────────────────────── │ ───────────────── │
│ • Select / Move   │ ┌─────────────────────────────────┐ │ • Properties      │
│ • 8m/9m PCC Pole  │ │ Optional GIS Map Layer (Road/Sat│ │   - Type, ID      │
│ • DP Structure    │ ├─────────────────────────────────┤ │   - Status        │
│ • 25/63/100kVA DTR│ │ Interactive SVG Drawing Canvas  │ │   - Dimensions    │
│ • ACSR 3W / 4W    │ │ • Pole Nodes (Snap Targets)     │ • Layer Manager   │
│ • LT AB Cable     │ │ • Conductor Edges (Spans, Ticks)│ • Work BOQ Table  │
│ • HT / LT Stays   │ │ • River / Road Crossing Ribbons │ • Title Block Form│
│ • Phase Conversion│ │ • Consumer Houses (S/C Drops)   │                   │
│ • Dimensions/Text │ └─────────────────────────────────┘ │                   │
├───────────────────┴─────────────────────────────────────┴───────────────────┤
│ Bottom Dock: Coordinates · Active Tool · Snap Status · Zoom Controls · Save │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │  Drawing State Store  │             │   PDF Export Engine   │
        │ • Items, Edges, Text  │             │ • A4 Landscape (297x210)
        │ • Undo/Redo History   │             │ • Engineering Border  │
        │ • Project Metadata    │             │ • Title Block & BOQ   │
        │ • Auto-save Engine    │             │ • Crisp Vector Print  │
        └───────────────────────┘             └───────────────────────┘
```

### Data Model & Entity Schema

```typescript
// Core Electrical Object Types
export type InfrastructureStatus = 'existing' | 'proposed' | 'removed' | 'modified';

export interface ElectricalNode {
  id: string;
  type: 'pole' | 'dp_structure' | 'four_pole' | 'dtr' | 'consumer' | 'substation';
  x: number;
  y: number;
  rotation: number;
  status: InfrastructureStatus;
  label?: string;
  properties: {
    height?: '8M' | '9M' | '10M' | '11M';
    material?: 'PCC' | 'RSJ' | 'STEEL_TUBULAR' | 'RAIL';
    capacityKva?: 25 | 63 | 100 | 160 | 250;
    conversionCapacityKva?: number; // e.g. 63 to 100
    poleNumber?: string;
    consumerName?: string;
    consumerAddress?: string;
    consumerPhone?: string;
    serviceConnectionCount?: number; // e.g. S/C-6, S/C-4
  };
}

export interface ConductorEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'acsr_3wire' | 'acsr_4wire' | 'acsr_2wire' | 'lt_ab_cable' | 'phase_conversion' | 'cradle_guard' | 'ht_oh_line';
  status: InfrastructureStatus;
  spanMeters: number; // e.g. 45, 40, 50
  wireGauge?: string; // e.g. '50 sq.mm'
  isResagging?: boolean;
  manualSpanOverride?: string;
  label?: string;
}

export interface StayItem {
  id: string;
  poleId: string;
  type: 'ht_stay' | 'lt_stay' | 'strut';
  angle: number;
  length: number;
  status: InfrastructureStatus;
  count: number; // e.g. 1 set, 2 sets
}

export interface CrossingFeature {
  id: string;
  type: 'river' | 'road' | 'railway';
  name: string; // e.g. 'RIVER CROSSING', 'FALAKATA - BIRPARA - ROAD'
  pathPoints: { x: number; y: number }[];
  width: number;
  spans: number[]; // e.g. [50, 60, 32]
}

export interface ProjectMetadata {
  title: string;
  drawingNo: string;
  applicationNo: string;
  projectName: string;
  applicantName: string;
  applicantAddress: string;
  applicantPhone: string;
  location: string;
  subDivision: string;
  preparedBy: string;
  checkedBy: string;
  approvedBy: string;
  date: string;
  revision: string;
}
```

### BOQ Calculation Strategy
The system inspects all drawing objects in real time:
- Counts poles by height (`8m PCC`, `9m PCC`) and type (`DP structure`, `4-Pole`).
- Aggregates conductor lengths in kilometers by type (`ACSR 50 sq.mm 3-wire`, `ACSR 50 sq.mm 4-wire`, `LT AB cable`, `Phase conversion 1-ph to 3-ph`).
- Tallies stay sets by category (`HT Stay Set`, `LT Stay Set`).
- Identifies transformers (`25 kVA DTR`, `Conversion 63 to 100 kVA`).
- Generates a structured table with editable quantities and notes.

---

## 5. Implementation Phases & Milestones

1. **Phase 1: Project Foundation & CAD Canvas Engine**
   - Setup project structure, Tailwind styling, vector math utilities, and coordinate transformations.
   - Implement SVG canvas with smooth pan, zoom, grid rendering, and precision object snap.
2. **Phase 2: Electrical Symbol & Conductor Toolsets**
   - Build authentic SVG symbols matching the sample drawings (8m/9m PCC pole, DP structure, 25/63/100 kVA DTR, HT/LT stays, consumer houses).
   - Implement line drawing with auto-anchoring, span dimension tags, and phase tick marks.
   - Build River Crossing and Road Crossing tools.
3. **Phase 3: Sample Blueprint Templates & Template Picker**
   - Implement the Template Picker with all 6 sample drawings fully pre-loaded and editable.
   - Allow instant switching between templates and starting from blank.
4. **Phase 4: Work Quantity (BOQ) Engine & Drawing Index**
   - Real-time BOQ generator summarizing poles, conductor KM, stays, and transformers.
   - Dynamic Symbol Index legend matching the sample drawing formats.
   - Full engineering title block editor (Application No, Consumer Name, Address, Approvals).
5. **Phase 5: GIS Map Underlay & Location Controls**
   - Toggleable satellite and road map underlay with transparency slider and coordinate lock.
6. **Phase 6: A4 Landscape PDF Export & Vector Print Layout**
   - Build high-resolution A4 Landscape export engine with engineering sheet border, title block, BOQ, and crisp vector electrical graphics.
   - Add SVG, PNG, and Project JSON export/import.
7. **Phase 7: Testing, Verification & Polish**
   - Verify keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete, Ctrl+S, G, F), undo/redo stack, and auto-save recovery.
   - Final end-to-end verification across desktop and mobile viewports.
