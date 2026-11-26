# PowerLine Designer Architecture & Subsystem Map

This document provides a complete structural map of the PowerLine Designer CAD application. Use this reference instead of re-reading or scanning the entire codebase.

---

## 1. Directory Structure Overview

```text
Designer/
├── .agents/
│   └── skills/
│       └── powerline-feature-dev/      # Feature addition & verification skill
│           ├── SKILL.md
│           ├── references/
│           │   ├── architecture-map.md
│           │   ├── feature-recipes.md
│           │   └── safety-invariants.md
│           └── scripts/
│               └── verify-feature.mjs  # Automated cross-subsystem integrity check
├── electron/
│   ├── main.cjs                        # Electron main process, IPC, .pld file associations
│   └── preload.cjs                     # Electron preload script
├── public/                             # Static assets, icons, version.json
├── scripts/                            # Build scripts (version generation, WB place data)
└── src/
    ├── App.tsx                         # Root component, state orchestrator, history stack
    ├── main.tsx                        # React 19 entry point
    ├── index.css                       # Tailwind CSS v4 styling
    ├── components/
    │   ├── Canvas/                     # Vector SVG CAD Engine & Renderers
    │   │   ├── DrawingCanvas.tsx       # Core canvas event loop, tools, pan/zoom, snap
    │   │   ├── NodeRenderer.tsx        # High-fidelity electrical node SVG renderer
    │   │   ├── ConductorRenderer.tsx   # Conductor/cable SVG renderer with span annotations
    │   │   ├── StayRenderer.tsx        # HT/LT stay set SVG renderer
    │   │   ├── CrossingRenderer.tsx    # River, road, railway crossing graphics
    │   │   ├── GridBackground.tsx      # CAD grid (lines or dots) with sheet boundary
    │   │   └── MapUnderlay.tsx         # OpenStreetMap GIS tile layer & geo-referencing
    │   ├── Panels/                     # Inspector and Modal Dialogs
    │   │   ├── PropertyInspector.tsx   # Real-time entity attribute & spec editor
    │   │   ├── BoqPanel.tsx            # Bill of Quantities schedule drawer
    │   │   ├── ExportModal.tsx         # A4 Landscape PDF export & preview
    │   │   ├── TitleBlockModal.tsx     # Engineering drawing sheet metadata & title block
    │   │   ├── ProjectSetupModal.tsx   # Project setup wizard
    │   │   ├── SavedProjectsModal.tsx  # LocalStorage project catalog manager
    │   │   ├── NewDrawingModal.tsx     # New drawing workflow (Save / Discard)
    │   │   ├── CustomToolModal.tsx     # Dynamic custom electrical symbol builder
    │   │   ├── TemplatePickerModal.tsx # Project template loader
    │   │   ├── KeyboardShortcutsModal.tsx
    │   │   ├── AppVersionModal.tsx
    │   │   └── AboutDeveloperModal.tsx
    │   └── Toolbar/                    # Top & Left Toolbars, Status Bar
    │       ├── LeftToolbox.tsx         # Left CAD tool palette (categories, icons, badges)
    │       ├── TopBar.tsx              # Top navigation, file menu, page sizes, actions
    │       ├── StatusBar.tsx           # Bottom coordinate tracker, entity counts, zoom %
    │       ├── LocationSearchBar.tsx   # West Bengal GIS area & mouza search
    │       ├── LocationSearchModal.tsx
    │       └── UpdateNotificationBanner.tsx
    ├── constants/
    │   └── pageSizes.ts                # ISO 216 page presets (A4, A3, A2, Corridor, Square)
    ├── data/
    │   └── westbengal_geo_data.json    # Offline database of 12,000+ WB mouzas and substations
    ├── services/
    │   ├── localStorageService.ts      # LocalStorage catalog, autosave, template storage
    │   ├── pldFileService.ts           # Stateful .pld file format export, import, parse
    │   ├── osmFeatureCache.ts          # OpenStreetMap vector feature caching
    │   └── updateService.ts            # Web/PWA & Electron update check logic
    ├── types/
    │   └── electrical.ts               # Complete TypeScript types and schemas
    └── utils/
        ├── boqCalculator.ts            # Automated BOQ calculation & symbol index engine
        ├── geometry.ts                 # CAD geometric math (distance, angle, polyline, snap)
        ├── geoReference.ts             # GIS coordinates to CAD sheet coordinates mapping
        ├── locationService.ts          # Nominatim & OSM feature fetching
        ├── pdfExport.ts                # ISO 216 A4 Landscape PDF generation (jspdf & html2canvas)
        ├── serviceCableUtils.ts        # Service connection formatting & calculations
        └── wbGeoPlaces.ts              # IndexedDB storage and querying for WB places
```

---

## 2. Core Data Models (`src/types/electrical.ts`)

### `DrawingProject`
The root state representing an entire CAD drawing:
- `id: string` & `title: string`
- `createdAt: string` & `updatedAt: string`
- `nodes: ElectricalNode[]` — All poles, substations, DTRs, landmarks.
- `edges: ConductorEdge[]` — All lines connecting nodes.
- `stays: StayItem[]` — Guy wire / stay sets attached to poles.
- `crossings: CrossingFeature[]` — River, road, railway crossing graphics.
- `roadOutlines: MapRoadOutline[]` — Road geometries imported from GIS.
- `annotations: AnnotationItem[]` — Freeform text labels on canvas.
- `boqItems: BoqItem[]` — Custom or generated BOQ schedule items.
- `metadata: ProjectMetadata` — Title block fields (drawingNo, agencyName, workType, etc.).
- `canvasBounds: CanvasBounds` — Sheet boundaries matching page size (default A4: 1122x793).
- `geoReference?: GeoReference` — GIS anchor (centerLat, centerLng, zoom, width, height).
- `customTools?: CustomToolDefinition[]` — User-defined symbols and tools.

### `ElectricalNode`
- `id: string`
- `type: NodeType` (e.g. `'pole_8m'`, `'dp_structure'`, `'dtr_63kva'`, `'substation_tap'`, `'custom_symbol'`)
- `x: number`, `y: number`, `rotation: number`
- `status: InfrastructureStatus` (`'existing'` | `'proposed'` | `'removed'` | `'modified'`)
- `gps?: GpsPoint` (lat/lng derived from sheet georeference)
- `properties`:
  - `poleNumber?: string`
  - `height?: '8M' | '9M' | '10M' | '11M'`
  - `material?: 'PCC' | 'RSJ' | 'STEEL' | 'RAIL' | 'STP'`
  - `capacityKva?: 16 | 25 | 63 | 100 | 160 | 250`
  - `serviceConnectionCount?: number`
  - `notes?: string`

### `ConductorEdge`
- `id: string`
- `fromNodeId: string`, `toNodeId: string`
- `type: ConductorType` (e.g. `'acsr_4wire'`, `'lt_ab_cable'`, `'service_cable'`, `'ht_oh_line'`)
- `status: InfrastructureStatus`
- `spanMeters: number` (calculated from geometry or overridden)
- `manualSpanOverride?: string`
- `wireGauge?: string`
- `serviceCableSpec?: ServiceCableSpec`

---

## 3. State Management & Lifecycle (`src/App.tsx`)

1. **State Ownership**:
   - `project`: Current active drawing.
   - `history` & `historyIndex`: Undo / Redo linear history stack.
   - `activeTool`: Currently active CAD tool or mode (e.g. `'select'`, `'hand'`, `'pole_8m'`, `'acsr_4wire'`).
   - `selectedEntities`: Array of selected `{ id, type }`.
   - `zoom`, `panX`, `panY`: Viewport navigation state.
2. **History Rule (`onUpdateProject`)**:
   - Handled via `onUpdateProject(updatedProject, pushHistory = true)`.
   - If `pushHistory` is true, trims forward history, pushes `updatedProject`, and caps at 30 entries.
   - Triggers autosave to `LocalStorage` via `saveActiveProject(updatedProject)`.
3. **Modal Orchestration**:
   - Modals are controlled by boolean state flags (`isExportModalOpen`, `isTitleBlockModalOpen`, `isBoqOpen`, etc.).
