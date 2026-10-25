# PowerLine Designer — Codebase Notes & Handoff

> Purpose of this file: a single-source map of the project so a future session (or a
> new developer) does **not** have to re-read every source file to get productive.
> It captures architecture, the domain model, feature inventory, data flow, and the
> current git state / known discrepancies between the docs and the actual code.
>
> Last verified: this doc was written after a full read-through + `tsc --noEmit` +
> `npm run build` (both pass). If you change code, update the relevant section here.

---

## 1. What this project is

**PowerLine Designer** is a **100% client-side** (offline-capable) web CAD tool for
electrical utility engineers. It lets a user draft an electrical **distribution line
drawing** (11 kV HT lines, LT 3-phase 4-wire, AB cable, DTR/transformer installations,
stays, river/road/railway crossings, consumer service connections), overlay an
**OpenStreetMap GIS underlay**, auto-generate a **Bill of Quantities (BOQ)** and a
**symbol index**, and export an **ISO 216 A4/A3 landscape PDF sheet** with title block.

There is **no backend**. All persistence is browser `localStorage`. GIS features come
from public OSM services over the network (the only networked feature besides tiles).

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| UI framework | React **19** (`react` / `react-dom`) |
| Language | TypeScript (~7.0.2 in devDeps) |
| Build / dev server | Vite **8** (`@vitejs/plugin-react`) |
| Styling | Tailwind CSS **v4** via `@tailwindcss/vite` + `src/index.css` |
| Icons | `lucide-react` |
| Animation | `motion` (Framer Motion successor) |
| Vector engine | Hand-written **SVG** scene graph (no canvas lib for drafting) |
| GIS | OpenLayers `ol` v10 (raster OSM tiles) + Overpass API + Nominatim |
| Export | `jspdf` + `html2canvas-pro` (oklch-capable fork of `html2canvas`); SVG export is native serialization |
| Storage | `localStorage` (projects/settings) + IndexedDB (WB place index + OSM feature cache) |

### Run / build commands
```bash
npm install
npm run dev      # Vite dev server on http://localhost:3000 (host 0.0.0.0)
npm run build    # production build -> dist/
npm run preview  # preview built output
npm run lint     # NOTE: this is `tsc --noEmit`, not ESLint
```
> `npm run lint` runs the **TypeScript compiler**, there is no ESLint config.

---

## 3. Directory map (file → role)

```
Designer/
├─ index.html                 # app shell; loads manifest, icon, Google fonts, /src/main.tsx
├─ vite.config.ts             # base: './' (VITE_BASE_PATH override), react+tailwind plugins, '@' alias
├─ tsconfig.json              # TS config (strict)
├─ package.json               # scripts + deps (name is still "react-example")
├─ metadata.json              # AI-Studio metadata (name/description)
├─ plan.md                    # original roadmap/spec (aspirational, 7 phases)
├─ progress.md                # phase log claiming 100% incl. Supabase/auth (NOT in code, see §11)
├─ README.md                  # user-facing docs (also describes features not in code, see §11)
├─ .env.example               # GEMINI_API_KEY + Supabase vars — unused by src/
├─ public/
│  ├─ manifest.webmanifest    # PWA manifest with .pld file_handlers
│  ├─ sw.js                   # PWA service worker (app-shell cache)
│  ├─ download.html           # Dedicated multi-platform installer download page
│  ├─ powerline-icon.svg
│  └─ powerline-icon.png      # 512x512 high-res raster icon for desktop & mobile
├─ electron/
│  ├─ main.cjs                # Electron main process (OS file associations for .pld, native dialogs)
│  └─ preload.cjs             # IPC context bridge (window.electronAPI)
├─ capacitor.config.json      # Capacitor Android mobile configuration
├─ .github/workflows/
│  └─ build-and-release.yml   # Multi-platform CI/CD: GitHub Pages + Windows, Android, Mac, Linux matrix
└─ src/
   ├─ main.tsx                # React root; registers service worker in PROD
   ├─ App.tsx                 # ROOT state container + deep linking + shortcuts + modal orchestration
   ├─ index.css              # Tailwind entry + light-theme overrides
   ├─ types/electrical.ts     # ⭐ entire domain model (single file)
   ├─ constants/pageSizes.ts  # A4/A3/A2/corridor/square sheet definitions + 1:1 bounds lock
   ├─ utils/
   │  ├─ geometry.ts          # snap, distance, angle, midpoint, span conversion, interpolate
   │  ├─ boqCalculator.ts     # ⭐ calculateBoq() + generateIndexEntries()
   │  ├─ pdfExport.ts         # exportToA4Pdf / exportToSvg / exportToPng / exportToJson
   │  ├─ locationService.ts   # Nominatim/Photon geocoding + offline WB dataset search (wbGeoPlaces)
   │  └─ wbGeoPlaces.ts       # ⭐ loads src/data/westbengal_geo_data.json — offline search index + map markers
   │  └─ data/westbengal_geo_data.json  # ~34 MB WB places dataset (29.7k records) served as a lazy ?url asset
   ├─ services/
   │  ├─ pldFileService.ts       # ⭐ Native .pld (PowerLine Drawing) stateful file import/export & parsing
   │  ├─ localStorageService.ts  # ⭐ catalog/active/template persistence + JSON import/export
   │  └─ osmFeatureCache.ts      # IndexedDB cache for Overpass API results
   └─ components/
      ├─ Canvas/
      │  ├─ DrawingCanvas.tsx    # ⭐ 1556-line SVG CAD engine (tools, pan/zoom, selection, drag)
      │  ├─ GridBackground.tsx   # dot/line grid
      │  ├─ NodeRenderer.tsx     # 520-line symbol renderer for all ElectricalNode types
      │  ├─ ConductorRenderer.tsx# conductor edge rendering (wire ticks per ConductorType)
      │  ├─ StayRenderer.tsx     # HT/LT stay rendering with direction arrows
      │  ├─ CrossingRenderer.tsx # river/road/railway crossing rendering
      │  └─ MapUnderlay.tsx      # 666-line OL tile overlay + Overpass fetch + canvas sheet placement
      ├─ Toolbar/
      │  ├─ TopBar.tsx           # 838-line software menu bar + single-row tool ribbon + version/download pill
      │  ├─ LeftToolbox.tsx      # left tool palette (symbols, conductors, stays, crossings)
      │  ├─ StatusBar.tsx        # bottom status bar (cursor, zoom, counts, selection)
      │  ├─ LocationSearchBar.tsx# geocoding autocomplete UI
      │  └─ LocationSearchModal.tsx  # ⚠️ dead code — not imported anywhere (see §11)
      └─ Panels/
         ├─ PropertyInspector.tsx # 710-line right inspector (edits selected entities)
         ├─ BoqPanel.tsx          # BOQ table + override editing
         ├─ ExportModal.tsx       # 810-line A4 sheet preview + PDF/SVG/PNG/JSON export
         ├─ ProjectSetupModal.tsx # project metadata / application no. / agency / sign-off / work type
         ├─ TitleBlockModal.tsx   # title block sign-off fields
         ├─ SavedProjectsModal.tsx# drawing catalog (open/duplicate/delete/import/export)
         ├─ NewDrawingModal.tsx   # Save / Discard / Delete previous drawing confirmation
         ├─ AboutDeveloperModal.tsx # Lead developer profile, engineering mission & architecture
         ├─ AppVersionModal.tsx   # Cross-platform installer download hub, version & changelog
         ├─ TemplatePickerModal.tsx
         ├─ CustomToolModal.tsx   # create custom symbols
         └─ KeyboardShortcutsModal.tsx
```

⭐ = the four files that carry most of the logic: `App.tsx`, `types/electrical.ts`,
`DrawingCanvas.tsx`, and (for output) `boqCalculator.ts` + `localStorageService.ts`.

---

## 4. Domain model — `src/types/electrical.ts`

Everything is defined in one file. Key types:

- **`DrawingProject`** — the persisted unit of work. Holds `metadata`, and arrays of
  `nodes`, `edges`, `stays`, `crossings`, `annotations`, plus optional `customTools`,
  `customBoqOverrides`, `canvasBounds`, `geoLocation`, `mapSettings`, `mapRoadOutlines`,
  and `id / title / createdAt / updatedAt / version`.
- **`ElectricalNode`** — a placed symbol. `type: NodeType` (poles, DP/4-pole structures,
  DTRs 25/63/100 kVA, DTR conversion, AB switch, HG fuse, LT DB, lightning arrester,
  consumer house, commercial facility, religious/school landmarks, substation tap,
  `custom_symbol`). Carries `status` (`existing | proposed | removed | modified`) — BOQ
  counts are driven mostly off `status === 'proposed'`. Freeform `properties` bag holds
  poleNumber/height/material/capacity/consumer details.
- **`ConductorEdge`** — a line between two node ids. `type: ConductorType`
  (`acsr_2wire | acsr_3wire | acsr_4wire | lt_ab_cable | service_cable | ht_ug_cable |
  earth_wire | jumper_connection | phase_conversion | cradle_guard | ht_oh_line |
  resagging_line`). Stores `spanMeters`, optional `wireGauge`, `isResagging`.
- **`StayItem`** — HT/LT stay anchored to a pole (`poleId`, `angle`, `length`, `count`).
- **`CrossingFeature`** — river/road/railway crossing box with `width/height/rotation`
  and optional `spans` labels (e.g. `["50M","60M"]`).
- **`AnnotationItem`** — free text on canvas.
- **`BoqItem` / `IndexEntry`** — generated output rows (not persisted directly; derived).
- **`CanvasBounds`** — fixed sheet rectangle (`preset`, `showSheetBorder`, `sheetFillOpacity`).
- **`MapSettings`** — map visibility/opacity/zoom/scale/sizeMode/layerPosition/features/pins,
  plus `printIncludeMap` (optional; **defaults to false**, so maps stay out of PDF/print),
  and `printMapOpacity` (optional; percentage 10–100, defaults to canvas map opacity or 100).
- **`CustomToolDefinition`** — user-defined symbol (shape, color, unit, boqDescription).
- **`ActiveTool`** — the discriminated union of every selectable tool; includes
  `` `custom_${string}` `` for custom tools.
- **`SelectedItem`** — `{ type: 'node'|'edge'|'stay'|'crossing'|'annotation'|'mapRoad', id }`.

> **Invariant worth knowing:** the canvas coordinate space is **not** geographic — the
> sheet is a fixed 1:1 page (e.g. A4 = 1414×1000 px). The GIS map is a *separate*
> world-space layer that can extend beyond the sheet; `MapUnderlay` maps lat/lng ↔
> canvas px. See §8.

---

## 5. Architecture & data flow

**State ownership is centralized in `App.tsx`.** The canvas and panels are mostly
controlled/presentational and receive data + callbacks via props.

```
App (owns: project, history[], historyIndex, activeTool, selectedEntities,
          clipboard, zoom/pan, grid/snap, map state, modal open flags, toast)
 ├─ TopBar            File/Edit/View/Insert/Tools/Help menu bar + single-row ribbon
 ├─ LeftToolbox       activeTool selector
 ├─ DrawingCanvas     SVG engine; calls onUpdateProject(nextProject)
 │   └─ renderers     GridBackground, NodeRenderer, ConductorRenderer,
 │                    StayRenderer, CrossingRenderer, MapUnderlay
 ├─ PropertyInspector edits selected entity -> onUpdateProject
 ├─ BoqPanel          reads project -> calculateBoq(); writes customBoqOverrides
 └─ modals           NewDrawing / Setup / TitleBlock / Export / Templates / SavedProjects /
                     CustomTool / Shortcuts
```

**The single mutation path:** `App.handleUpdateProject(newProject, pushHistory=true)`.
It sets state, autosaves to `localStorage` (`saveActiveProject`), and optionally pushes
onto the undo/redo history stack. Any component that edits the drawing calls this via the
`onUpdateProject` prop. When adding a feature, route writes through this function so undo
and autosave stay correct.

**Undo/redo:** snapshot-based. `history: DrawingProject[]` + `historyIndex`. New edits
truncate the redo tail. `handleUndo`/`handleRedo` re-point index and persist. Not a
command log — whole-project snapshots.

**Clipboard:** in-memory `ClipboardData` (nodes/edges/stays/crossings). Paste re-issues
fresh ids (`idMap`) and offsets by 40px, remapping edge/stay foreign keys.

### Application chrome (`src/components/Toolbar/TopBar.tsx`)
- **Row 1 — menubar:** `File / Edit / View / Insert / Tools / Help`, plus quick-access
  save/undo/redo and the page-size selector. Menus open on click, switch on hover while
  open, and close on outside click or `Escape`. Menu items reuse App handlers (clipboard,
  zoom/fit, page size, map, project setup, export).
- **Row 2 — single-line ribbon:** `h-12`, `flex-nowrap`, `overflow-x-auto`. It never wraps;
  on narrow screens it scrolls sideways. Groups: file, edit, draw tools, view toggles,
  project, map, output. The active drawing tool is highlighted.
- **Map panel:** anchored below the header (`absolute right-2 top-full`), so it is not
  clipped by the ribbon's horizontal scroll container. Holds feature toggles, OSM street
  outlines, map lock, **print-map toggle**, layer placement and opacity.
- **Print map:** `mapSettings.printIncludeMap` is optional and `false` when absent. It is
  surfaced in View → Include Map in PDF / Print, in the map panel, and in Export → Print
  options. The old "Show map on canvas & PDF" checkbox is now split into separate
  **canvas** and **print** choices. A dedicated **`printMapOpacity`** option allows adjusting
  map opacity for print/PDF output (slider, presets 25%–100%, and quick on-preview control)
  independently from the drafting canvas.
- **Responsive layout (< `lg`, 1024 px):** the desktop tool rail is hidden and the ribbon's
  **All Tools** button opens a left slide-over `LeftToolbox` drawer (`variant="drawer"`).
  The drawer closes on tool selection, backdrop click, or `Escape`; `LeftToolbox` shows
  labels and the quick guide inside the drawer. The header condenses its brand text and
  quick-access buttons on phones so the menubar stays on one line, and the canvas floating
  toolbar is hidden below `lg`. When the map is turned on (`showMap === true`), a dedicated
  collapsible mobile search bar (`LocationSearchBar`) appears at the top of the canvas.

### Persistence keys (`src/services/localStorageService.ts`)
| Key | Purpose |
|---|---|
| `powerline_designer_active_project` | currently open drawing (autosaved on every update) |
| `powerline_designer_saved_projects_catalog` | all saved drawings |
| `powerline_designer_templates` | user-saved templates only (no bundled samples) |

Helpers: `createBlankDrawing`, `loadActiveProject`, `saveActiveProject`,
`getSavedProjectsCatalog`, `saveProjectToCatalog`, `deleteProjectFromCatalog`,
`duplicateProjectInCatalog`, `getSavedTemplates`, `saveProjectAsTemplate`,
`deleteSavedTemplate`, `exportProjectAsJson`, `importProjectFromJson`.
`saveActiveProject` also mirrors into the catalog. Catalog init lazily seeds itself with
the active project if empty.

---

## 6. Canvas engine — `src/components/Canvas/DrawingCanvas.tsx`

The heart of the app (~1556 lines). Notable mechanics:

- **Viewport transform:** `zoom`, `panX`, `panY` owned by `App`; `clientToCanvas()`
  converts screen px → canvas coords. **Ctrl+wheel** zooms centered on cursor (native
  non-passive wheel listener); when the map is on *and unlocked*, Ctrl+wheel instead
  steps the map tile zoom (12–19). Plain wheel pans **only when zoomed in** (the sheet is
  clamped to fit otherwise); `Space` temporarily enables pan; `H` selects pan tool.
  Canvas auto-fits on first load and re-fits on page-size change.
- **Fit is bounded:** there is a computed `minZoom` (fit zoom) so the sheet can't be
  shrunk below fit; user zoom is clamped in `[minZoom, 5]`.
- **Sheet vs map modes:** a "Move Canvas on Map" mode (`isMovingCanvasMode`) with a toggle
  (`moveWithElements`) to either drag the sheet frame only or drag the sheet *and* all
  elements together. Resize handles exist on the sheet frame.
- **Tool dispatch on mouse down** (`handleMouseDown`): the big branch keyed on
  `activeTool` — places nodes, starts a conductor (line tools set `lineStartNodeId`),
  places stays, places crossings, creates annotations, starts road drawing
  (`isDrawingRoad` + `roadDraftPoints`), or begins marquee selection.
- **Freeform road (multi-point polyline):** each click drops a vertex; the draft shows a
  rubber-band preview from the last vertex to the cursor. **Double-click (or Enter)**
  commits, **Esc** cancels, and switching tools discards the draft. Roads can be drawn
  as a **single centerline** or a **two-line road** (`lineStyle: 'double'` +
  `roadWidth`); the toggle/width live in the floating "Freeform Road" panel. Committed
  roads render parallel offset polylines (miter joins via
  `offsetPolyline` in `utils/geometry.ts`) plus a transparent centerline hit area.
  Selected roads can change style/width in the Property Inspector.
  (`freeform_road` no longer uses drag-to-draw; `road_segment` remains the 2-click line.)
- **Conductor creation:** line tools ("isLineTool" set) → click first node, click second
  node → builds a `ConductorEdge` with `spanMeters` computed from pixel distance via
  `pixelDistanceToSpanMeters` (default 0.5 m/px).
- **Selection:** single click, shift/modifier merge, and marquee box (`selectionBox`)
  which hit-tests nodes, edges (bbox overlap), stays (endpoint), and crossings.
- **Dragging:** nodes (`draggingNodeId`), annotations (`draggingAnnotationId`), with
  per-item `dragInitialPositions` and optional snap-to-grid (20px) during drag.
- **Floating canvas toolbar:** draggable on-canvas control cluster
  (`floatingToolbarPosition`, clamped to container) for sheet/map management and a
  sheet-fill opacity stepper (`sheetFillOpacity` steps differ for map vs dark canvas).
- **Keyboard:** `Space` pan is handled *inside* the canvas; all other shortcuts are in
  `App.tsx` (see §7).

### Renderers
| Component | Responsibility |
|---|---|
| `GridBackground` | dot or line grid; becomes transparent when the map is on |
| `NodeRenderer` | 520 lines — draws every `NodeType` symbol; consumes custom tool defs |
| `ConductorRenderer` | draws edges; wire/ phase-tick styling per `ConductorType` |
| `StayRenderer` | draws stay line + directional anchor arrow |
| `CrossingRenderer` | draws river/road/railway crossing boxes + span labels |

---

## 7. Keyboard shortcuts (owned by `App.tsx`)

`Ctrl/Cmd+S` save · `Ctrl+Z` undo · `Ctrl+Y` / `Ctrl+Shift+Z` redo · `Ctrl+C/V/X/D`
copy/paste/cut/duplicate · `Ctrl+A` select all · `Delete`/`Backspace` delete · `Escape`
clear selection + reset to select tool · `Fit` (`F`) fit-to-screen · `+`/`-` zoom ·
`0` reset zoom · arrow keys nudge (5px, 20px with Shift) · `G` grid · `M` map ·
`?` shortcuts modal. Bare-key tool shortcuts: `V` select, `H` pan, `P` pole,
`L` ACSR 3-wire, `S` LT stay. Handler ignores keystrokes while focus is in
`INPUT`/`TEXTAREA`/`SELECT`.

---

## 8. GIS / Map — `src/components/Canvas/MapUnderlay.tsx`

- Tiles: **OpenStreetMap raster tiles rendered with OpenLayers (`ol`)**, attributed
  on-canvas. In print / PDF export mode, the OSM attribution badge is omitted so engineering
  drawings remain completely clean. No API keys. (Docs mention Esri/CARTO/OpenTopo alternatives — verify in the
  file before assuming; OSM is the wired default.)
- **Overpass API** (`https://overpass-api.de/api/interpreter`, POST; **also**
  `https://maps.mail.ru/osm/tools/overpass/api/interpreter`) fetches vector
  features (roads/rivers/etc.). Results are cached in **IndexedDB** via
  `services/osmFeatureCache.ts` (`readOSMFeatureCache` / `writeOSMFeatureCache`).
 overpass-api.de has been intermittently unreachable from this network; the asset
 generator keeps the mail.ru mirror first as fallback.
- **Geocoding** lives in `utils/locationService.ts`, backed by the offline
  dataset module **`utils/wbGeoPlaces.ts`**. The dataset is the bundled
  **`src/data/westbengal_geo_data.json`** (~34 MB GeoHarvester “places v3”
  database, ~29.7k cleaned records harvested from OpenStreetMap: name,
  category/sub-type, verified lat/lng, street/city, phone, website). It is
  imported with Vite’s `?url` suffix so it ships as a standalone asset (NOT
  inside the JS bundle). **On page open** (`App.tsx` mount effect →
  `prefetchWbGeoPlaces()`), the loader first reads the prebuilt compact index
  from **IndexedDB** (`powerline-designer-db` › `wb-geo-places` › `places`,
  versioned by `DATASET_CACHE_VERSION`). On the very first visit (or after a
  version bump) it downloads + parses the JSON once, builds the index, and
  writes it to IndexedDB ~1.5 s later in the background. Every later page load
  is therefore instant and fully offline — no 34 MB download, no JSON parsing;
  `getWbGeoPlacesSource()` reports `'indexeddb'` vs `'network'` (shown in the
  search footer and map status badge). `src/utils/localPlacesIndex.ts` (and the
  old `public/wb-places.json` asset) is gone — `wbGeoPlaces` replaced it;
  `lat, lng` input is parsed locally and always works offline.
- **Search ranking (`searchWbGeoPlaces`):** one pre-lowercased haystack per
  record (`name city area street sub-type`); tiered scoring — exact name →
  name prefix → word-boundary prefix → name substring → all-tokens-in-name →
  sub-type phrase → mixed → context-only; ±bonus from `origin` proximity and a
  +7 habitation boost (locality records). Results dedupe on name+rounded
  coords. A search over the built index costs ~2–5 ms.
- **Map markers:** `MapFeatureSelection.wbPlaces` (map panel: “WB geo places
  (offline)”, default ON) drives a dedicated OpenLayers vector layer in
  `MapUnderlay.tsx`. `selectPlacesForMapExtent` picks up to 480 markers inside
  the current view ordered by a **view-independent key** (category priority,
  then dataset order) with per-category budgets so streets/shops don’t flood
  the view — panning no longer reshuffles the set. The layer is updated by
  **diffing features by place id** (surviving features keep their identity), so
  OpenLayers’ declutter layout stays put instead of flickering while panning
  or zooming. Dots are category-coloured (`wbGeoCategoryColor`); labels appear
  from zoom ≈15.2 (habitations) / 16.6 (POI) while the `placeNames` toggle is
  on, and the label font grows 13.5 → 17 px as the basemap zoom deepens.
  Clicking a dot opens an OpenLayers-Overlay popup (name · sub-type · address ·
  district · phone/website · coordinates) with a **Place Canvas Here** button
  that recentres the sheet via `onPlaceCanvasHere`. Marker clicks work in both
  lock states: when the map is locked its surface is `pointer-events: none` (the
  drawing SVG receives clicks), so hit-testing runs from a document-level
  capture listener that only intercepts when a dataset marker is actually hit
  (targets must be inside `[data-canvas-surface="true"]`). The map status badge
  shows `WB geo · N of 29,697 places in view`.
- **Place search resilience and local-name coverage:** `searchLocations()` queries
  **Nominatim and Photon in parallel and merges (interleaves) the results** — Nominatim
  excels at administrative/village names, Photon at POIs (shop names, building names,
  schools). The old first-provider-wins logic hid Photon's POI hits whenever Nominatim
  returned anything at all, and Nominatim returns **zero results** for many local village
  names (e.g. "Old Hasimara", "Dalsingpara" near Falakata) — the offline WB dataset now
  answers those instantly. The UI (`LocationSearchBar`) is **two-tier**: offline dataset
  hits render after a 60 ms debounce (no network), and the online-merged list refines
  them after the 550 ms debounce; a red/blue dot badge marks offline hits and the footer
  shows the dataset size. The suggestion menu is rendered with **`createPortal` into
  `<body>`** and `position: fixed` (z-index 4000): the bar lives inside toolbars/panels
  whose `overflow-x-auto`/`overflow-hidden` clipped an absolutely positioned dropdown to
  the toolbar strip (the menu appeared to not open at all). The menu now anchors to the
  input rect, flips above when there is not enough room below, clamps to the viewport and
  follows drag/scroll/resize. Keyboard: Enter selects the highlighted row, ↑/↓ move,
  Esc closes; bare `lat, lng` + Enter jumps directly. An optional `origin` (`GeoOrigin`)
  biases both providers toward
  the drawing's current area: Nominatim gets a weighted (not bounded) `viewbox`
  ±0.35°/±0.5°, Photon gets `lat`/`lon`/`zoom=14` biasing, and Photon finds local
  villages/shops immediately. Both search bars and the setup modal pass
  `getProjectGeoCenter(project)` / parsed `metadata.coordinates` as the origin, and the
  cache key includes the rounded origin. Results are memoized in-memory
  (5 min online / per-call offline), queries shorter than 2 chars are skipped, and the
  UI debounces 550 ms — public geocoders rate-limit hard (Nominatim ≈ 1 req/s) and will
  return **403/429** to a bursty client. A request only errors when **both** online
  providers fail **and** the offline tier returned nothing; otherwise a partial
  result still renders. Error messages distinguish timeout / rate-limit / offline.
- Map can be **underlay** (below vectors) or **overlay** (above vectors, adjustable
  opacity). `mapLocked` toggles whether map interactions are enabled.
- **Printing is opt-in:** `mapSettings.printIncludeMap` defaults to `false`, and the
  export sheet renders `MapUnderlay` only when `printIncludeMap` is true. It is
  independent of canvas map visibility, so a clean canvas can still print a map if
  explicitly requested. Enabling it from the map panel / View menu persists with the
  drawing.
- `MapRoadCandidate`/`MapRoadOutline`: roads discovered from OSM can be selected in the
  TopBar and **committed to the canvas** as vector outlines (stored in
  `project.mapRoadOutlines`, source-deduped by `sourceId`). Both interfaces carry
  optional `lineStyle: 'single' | 'double'` and `roadWidth`; missing values render as a
  single centerline (legacy/OSM outlines). Manually drawn roads default to `double`,
  width 16.
- Network dependency: tiles, geocoding, and Overpass calls require internet; everything
  else works offline.

---

## 9. BOQ + Index engine — `src/utils/boqCalculator.ts`

- `calculateBoq(nodes, edges, stays, customOverrides?)` → `BoqItem[]`. Counts are filtered
  by `status === 'proposed'`. Categories: pole, conductor, stay, transformer, equipment,
  guard, connection, custom. Each item has a stable `id` (e.g. `boq-pcc-8m`) that keys
  the user override map (`project.customBoqOverrides`). Conductor quantities are summed
  `spanMeters`.
- **Poles are classified by the editable `properties.height` attribute first, then the
  tool type** (`getPoleHeight`). So changing an 8M pole to 9M/10M/11M (or back) in the
  Property Inspector immediately moves it to the right row. Supported rows:
  `boq-pcc-8m`, `boq-pcc-9m`, `boq-pcc-10m`, `boq-pcc-11m`. Only `pole_8m`,
  `pole_9m`, `pole_single` count as PCC poles; RSJ/STP keep their own rows and
  DP/4-pole structures are never counted as poles.
- **DTRs are classified by `properties.capacityKva` first, then the tool type**
  (`getDtrCapacity`). Rows: `boq-dtr-16/25/63/100/160/250`. This means a `dtr_25kva`
  node whose capacity is changed to 63/100 moves rows, `dtr_63kva`/`dtr_100kva` are now
  counted at all (they previously were not), and a **4-pole structure with a mounted DTR**
  (`four_pole` + `capacityKva`) contributes both a `boq-4pole` structure row and the
  matching DTR row. `dtr_conversion` is excluded from the capacity rows and counted only
  as `boq-dtr-conv`.
- `generateIndexEntries(...)` → `IndexEntry[]` (the drawing's symbol legend), using the
  same height/capacity helpers and adding `pole_10m`, `pole_11m`, `four_pole` symbol keys.
- **Rows appear only if count > 0 OR an override exists** — so overrides can force a row.
- Custom tools contribute their own BOQ rows.

---

## 10. Export pipeline — `ExportModal.tsx` + `utils/pdfExport.ts`

- `ExportModal` renders an **A4 landscape (297×210 mm) sheet preview** with engineering
  border, **title block**, **symbol index**, and **BOQ schedule**.
- **Map in output is off by default.** The preview/PDF/print sheet includes the map only
  when `printIncludeMap` is true (independent of canvas visibility); the Print options
  block exposes canvas and print map toggles separately, along with a dedicated map print
  opacity slider, preset buttons (25%, 40%, 60%, 80%, 100%), and a floating on-preview
  opacity toolbar. `MapUnderlay` renders at `printMapOpacity` during preview and export.
- `exportToA4Pdf(sheetEl, project, onProgress)` — `html2canvas-pro` at `scale: 2.5`,
  JPEG 0.98, placed full-bleed into a jsPDF landscape A4 doc, with PDF metadata set.
- `exportToSvg` (native SVG serialization, injects namespaces + xml decl),
  `exportToPng` (html2canvas-pro scale 2), `exportToJson` (full project state).
- `html2canvas-pro` + `useCORS` is used because map tiles are cross-origin; PNG/PDF export
  with a live map layer depends on tile CORS behavior. The `-pro` fork is required because
  Tailwind v4 emits `oklch()` colors that `html2canvas` 1.4.1 cannot parse (export crashed
  with "unsupported color function oklch" before the swap).

---

## 11. Current git state & uncommitted work

- Branch tip: `48ea4bd First Trial`. History: `48ea4bd` → `215d33f feat(ui): transition
  to professional light theme` → `e643628 feat: initialize PowerLine Designer
  application` → `505de6d Initial commit`.
- **Uncommitted changes** (14 modified files + `CODEBASE_NOTES.md`) contain five
  independent pieces of work:

  **A) `service_cable` conductor type** (`types/electrical.ts`,
  `utils/boqCalculator.ts`, `ConductorRenderer.tsx`, `DrawingCanvas.tsx`,
  `ExportModal.tsx`, `PropertyInspector.tsx`, `LeftToolbox.tsx`):
  - new `'service_cable'` in `ConductorType` + `ActiveTool`;
  - BOQ row `boq-service-cable` ("Providing Service Cable Connection to Consumer House",
    unit `Mtr`, category `connection`, summed `spanMeters`) + index entry
    `idx-service-cable`;
  - renderer/canvas/inspector/toolbox/export wiring.

  **B) Place-search reliability fix** (`utils/locationService.ts`,
  `Toolbar/LocationSearchBar.tsx`, `public/sw.js`):
  - Nominatim → **Photon fallback**, in-memory result cache, 550 ms debounce, minimum
    query length, friendlier timeout/rate-limit/offline errors;
  - service worker switched from **cache-first to network-first** (cache v3) so a
    deployed fix actually reaches machines that had the old shell cached.

  **C) BOQ attribute-driven classification fix** (`utils/boqCalculator.ts`,
  `Panels/PropertyInspector.tsx`, `Canvas/NodeRenderer.tsx`, `Panels/ExportModal.tsx`):
  - poles now derive their row from `properties.height` (8M/9M/10M/11M) instead of the
    original tool type; 10M/11M rows added;
  - DTRs now derive their row from `properties.capacityKva`; 63/100/160/250 rows added
    (63/100 were previously not counted at all);
  - 4-pole structures can carry a mounted DTR (`capacityKva`) and contribute both rows;
  - index entries and the canvas DTR/4-pole labels follow the same attributes.

  **D) Freeform road: multi-point + 2-line + double-click finish**
  (`types/electrical.ts`, `utils/geometry.ts`, `Canvas/DrawingCanvas.tsx`,
  `Panels/PropertyInspector.tsx`, `Toolbar/LeftToolbox.tsx`):
  - click-to-drop vertices instead of drag-to-draw; live rubber-band preview;
    double-click or Enter commits, Esc cancels;
  - `MapRoadCandidate.lineStyle` (`single`/`double`) + `roadWidth`; two-line roads render
    via `offsetPolyline` with miter joins and a wide transparent selection centerline;
  - floating "Freeform Road" panel to pick 1-line/2-line and width before drawing;
    Property Inspector can change style/width on an existing road;
  - existing/OSM road outlines without `lineStyle` remain single-line.

  **E) Menubar + setup/attributes/output ribbon + print-map opt-out + per-pole GPS**
  (`Toolbar/TopBar.tsx`, `App.tsx`, `Canvas/DrawingCanvas.tsx`, `Canvas/MapUnderlay.tsx`,
  `Panels/ExportModal.tsx`, `types/electrical.ts`, `utils/geoReference.ts`):
  - `TopBar` is a two-row chrome: **File / Edit / View / Insert / Tools / Help** menubar
    (click-open, hover-switch, Escape/outside-close) with quick-access save/undo/redo and
    page-size selector, plus a **single-line ribbon**. On desktop the ribbon is setup/
    settings/attributes/output only: `Edit`, `Page Setup`, `Tool Attributes`, `Settings`,
    `Map`, `Output`; the `File` group (drawer/new/open/save/drawings) is mobile-only.
    It no longer contains drawing tools.
  - The **Tool Attributes** panel shows the active tool, road line-style/width defaults,
    and selected-object attributes. The freeform/straight road tool consumes these shared
    values and they can be changed live while drawing.
  - Drawings are now **georeferenced**. `DrawingProject.geoReference` records the sheet
    centre lat/lng plus OSM zoom and sheet size. `utils/geoReference.ts` converts canvas
    px ↔ GPS with Web-Mercator math. Every placed node gets a `gps` point, recomputed when
    it is created, dragged, readjusted by sheet moves, or when the map centre/page size
    changes. This GPS is shown in the Property Inspector.
  - The canvas map, print map and node GPS share one transform. MapUnderlay no longer
    compensates its zoom from canvas zoom; instead the calibration zoom applies at one
    drawing pixel, while print scaling uses the exact printed-view ratio. In the export
    sheet, when map printing is enabled, the SVG uses the full canvas bounds as its
    viewBox and the map fills exactly the same fitted rect, so vector elements and tile
    features register to the same paper coordinates.
  - The map configuration moved to a header-anchored floating panel. It holds feature
    toggles, street outlines, lock, layer placement, opacity and the print-map toggle.
    `MapSettings.printIncludeMap` is optional and **false by default**; the sheet renders
    the map only when the user opts in, independently of canvas visibility. Export →
    Print options separates "Show map on canvas" from "Include map in PDF / print", and
    the View menu exposes the same print toggle. Legacy projects default clean, map-free.
  - PDF/PNG export uses **html2canvas-pro**, not html2canvas, because Tailwind v4 emits
    `oklch()` colors that html2canvas 1.4.1 cannot parse.

  - Typecheck + build verified green with these changes. PDF export now succeeds with
    html2canvas-pro (tested on a real sheet); printed-map alignment was verified visually
    on the export preview with poles and map features at the same coordinates.


> If you continue this work: it is feature-complete enough to build, but not committed.
> Consider committing it before starting unrelated changes.

---

## 12. Known discrepancies & gotchas

**Docs vs. code (README.md / progress.md claim things that are NOT in the code):**
- ❌ **Authentication / phone+password login / admin approval** (progress Phase 10,
  README §1) — **no login code exists** in `src/`. `pending_approval` is nowhere in the
  tree. `App.tsx` boots straight into the editor.
- ❌ **Supabase cloud persistence** (progress Phase 8, README §2) — **no `supabase` import
  or dependency**; no Cloud Save modal in `TopBar`. Persistence is `localStorage` only.
- ⚠️ **Bundled sample blueprints** (progress Phase 3, Samples 1–6) — not present; the
  template picker only lists **user-saved** templates.
- ✅ **PWA** (README §4) — this one is real: `public/manifest.webmanifest`, `public/sw.js`,
  register in `src/main.tsx` (prod only).
- ✅ **GitHub Pages deploy** — real: `.github/workflows/deploy.yml`, `base: './'`.

**Other gotchas:**
- `package.json` `"name"` is still `"react-example"`, and `@google/genai`, `express`,
  `dotenv` (+ their `@types`) appear **unused** by `src/`. `.env.example` references
  `GEMINI_API_KEY` and Supabase vars that nothing reads. Safe to prune after confirming.
- `src/components/Toolbar/LocationSearchModal.tsx` appears to be **dead code** (no
  importer). `LocationSearchBar.tsx` is the live one used on the canvas.
- **Theming:** components are written with **dark-slate** Tailwind classes, but
  `src/index.css` remaps those to a **light** palette under the `.app-theme-light` root
  class, which `App.tsx` applies. So the app renders light while the JSX still says
  `bg-slate-950`, etc. Keep this in mind when adding UI — follow the existing class
  names so the light-theme override keeps working.
- `getSavedProjectsCatalog()` is called during render in `TopBar` (`savedProjectsCount`)
  — it reads `localStorage` synchronously each render (minor perf smell, not a bug).
  It no longer seeds the catalog with the active project: drawings enter the saved
  catalog only via explicit Save / Import / Duplicate. "New" and template picks write
  only the active-session slot (`powerline_designer_active_project`), so opening a new
  drawing never silently files the previous one away.
- **Service worker stale-cache trap:** `public/sw.js` used to be cache-first, so any PC
  that had loaded an older deployment kept serving the old JS bundle forever (new builds
  never arrived). It is now **network-first with cache fallback** and `CACHE_NAME` is
  `powerline-designer-v4`. Bump that name on any behavior-changing deploy so old caches
  are purged. The SW is only registered in production (`main.tsx`), so `npm run dev`
  never sees it — which is why a bug can be invisible locally but present on another PC.
  The 34 MB WB geo asset is special-cased to **stale-while-revalidate** (served from the
  SW cache immediately, refreshed in the background) because network-first would
  re-download it every session. Independently, the parsed index lives in IndexedDB, so
  normal page loads never fetch the JSON at all after the first visit.
- **`npm run wb-places` (`scripts/generate-wb-places.mjs`) is now unused** by the app —
  it generated the old `public/wb-places.json` asset that no longer exists. The dataset
  of record is `src/data/westbengal_geo_data.json` (GeoHarvester export, ver
  3.0.0, 2026-10-25). Safe to prune the script after confirming.
- **Place search needs the network:** both providers are public internet services. If a
  machine/network blocks `nominatim.openstreetmap.org` *and* `photon.komoot.io`, text
  search cannot work; `lat, lng` input still works offline.
- Build emits two warnings: `__dirname` usage in `vite.config.ts`, and a >500 kB chunk
  (`index-*.js` ≈ 1.38 MB, largely `ol` + `jspdf` + `html2canvas`). Not errors.

---

## 13. Quick verification recipe

```bash
npx tsc --noEmit   # typecheck (this is also `npm run lint`)
npm run build      # production build; expect only the 2 warnings in §12
```
Both currently pass.

---

## 14. If you're about to add a feature, start here

1. **New symbol/tool** → extend `ActiveTool` + `NodeType` (or `ConductorType`) in
   `types/electrical.ts`; add render branch in `NodeRenderer`/`ConductorRenderer`; add the
   palette entry in `LeftToolbox.tsx`; handle it in `DrawingCanvas.handleMouseDown`;
   add a BOQ row in `boqCalculator.ts` if it's a material.
2. **New canvas interaction** → `DrawingCanvas.tsx`, routing writes through
   `onUpdateProject` so undo/autosave work.
3. **New metadata field** → `ProjectMetadata` in `types/electrical.ts`, default it in
   `createBlankDrawing()`, then surface it in `ProjectSetupModal` / `TitleBlockModal` /
   `ExportModal`.
4. **New persistence** → `services/localStorageService.ts` (add a `STORAGE_KEY_*`).
5. **Don't** assume auth/Supabase exist — they don't (§12). If the intent is to build
   them, that is net-new work.