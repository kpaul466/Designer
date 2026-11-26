# Safety Invariants & Non-Regression Rules

PowerLine Designer is a professional CAD drafting and stateful engineering system. Whenever modifying or adding features, you **MUST preserve these 7 golden invariants**. Violating any of them causes regressions in drafting, data loss, or corrupt drawings.

---

## Invariant 1: Undo / Redo History Stack Integrity

- **Rule**: Every user-initiated modification that mutates the drawing model must call `onUpdateProject(newProject, true)` (pushing onto the history stack).
- **Transient Actions**: Real-time mouse drags (moving a pole, dragging canvas bounds) must call `onUpdateProject(newProject, false)` while the mouse is moving, and then call `pushHistory(newProject)` **only on mouse up**.
- **Stack Limit**: `App.tsx` enforces a max history depth of 30 steps. Never mutate the `history` array directly in child components.
- **Verification**: After adding a feature, perform the action, press `Ctrl+Z` (Undo), then `Ctrl+Y` (Redo). The state must revert and restore perfectly.

---

## Invariant 2: Cascading Referential Integrity

- **Rule**: Deleting a node MUST automatically delete all attached entities.
  - When a node is deleted:
    - Filter out all `edges` where `edge.fromNodeId === node.id || edge.toNodeId === node.id`.
    - Filter out all `stays` where `stay.poleId === node.id`.
  - When a node is moved:
    - Attached conductor endpoints move automatically because lines reference `node.id`.
    - Conductor `spanMeters` must be recalculated based on new Euclidean distance: `pixelDistanceToSpanMeters(distance(n1, n2))`.
    - The moved node's `gps` coordinates must be updated via `canvasPointToGps(x, y, canvasBounds, geoReference)`.
- **Never Leave Orphaned References**: An edge referencing a non-existent `nodeId` will cause `ConductorRenderer` to throw null pointer errors.

---

## Invariant 3: Coordinate System Isolation

There are 4 distinct coordinate systems in PowerLine Designer:
1. **Browser Screen Pixels** (`e.clientX`, `e.clientY`): Used only for UI modals and context menus.
2. **CAD Sheet Coordinates** (`x`, `y` in SVG units):
   - Always convert screen coordinates to CAD sheet coordinates using the SVG transformation matrix:
     ```ts
     const svg = svgRef.current;
     const pt = svg.createSVGPoint();
     pt.x = e.clientX;
     pt.y = e.clientY;
     const canvasPt = pt.matrixTransform(svg.getScreenCTM().inverse());
     ```
   - All nodes, lines, stays, crossings, and roads are stored in this coordinate space.
3. **OpenStreetMap GIS Coordinates** (EPSG:3857 / WGS84 Lat, Lng):
   - Mapped to CAD sheet coordinates via `src/utils/geoReference.ts`.
4. **Sheet Bounds Offset**:
   - The sheet boundary has origin `(canvasBounds.x, canvasBounds.y)` and dimensions `(width, height)`.

*Never mix screen mouse coordinates directly with CAD node coordinates.*

---

## Invariant 4: Backward-Compatible `.pld` & LocalStorage Persistence

- **Rule**: All drawings are serialized to LocalStorage and exported as `.pld` JSON files (`src/services/pldFileService.ts`).
- **Guidelines**:
  1. Any new field added to `DrawingProject`, `ElectricalNode`, `ConductorEdge`, or `StayItem` **must be optional** (`field?: string`).
  2. In `pldFileService.ts` and `localStorageService.ts`, always use fallback defaults when reading projects (e.g. `project.customTools || []`, `project.roadOutlines || []`).
  3. Never change existing field names or remove types without a migration step.

---

## Invariant 5: BOQ Zero-Drift Synchronization

- **Rule**: The Bill of Quantities must always match the physical entities drawn on the canvas.
- **Precedence**:
  - For poles: Editable attribute `properties.height` takes precedence over `node.type` (e.g. an 8m pole changed to 9M in PropertyInspector must be counted as a 9M pole in BOQ).
  - For transformers: Editable attribute `properties.capacityKva` takes precedence over `node.type`.
- **Automatic vs Manual**: Auto-calculated items have `isAutoCalculated: true`. Custom manual items entered by the user must never be deleted when recalculating BOQ.

---

## Invariant 6: High-Contrast Renderers (Dark & Light Canvas)

- **Rule**: The application supports both Light and Dark CAD canvas modes (`isDarkCanvas`).
- **Rendering Standards**:
  - Proposed infrastructure: Always vibrant red (`#dc2626`).
  - Existing infrastructure: Dark slate (`#1e293b`) on light canvas, light slate (`#cbd5e1`) on dark canvas.
  - Selection glows: Vibrant blue (`#3b82f6`) with pulsing dashed stroke.
  - Text labels: Must include background pill or high-contrast fill so they remain readable over OSM map tiles and dark backgrounds.

---

## Invariant 7: Sheet-to-Page Fixed Bounds

- **Rule**: Page size and canvas sheet size are strictly identical 1:1 (`PAGE_SIZE_DEFINITIONS`).
- Changing page size (e.g. A4 -> A3) resizes `canvasBounds.width` and `canvasBounds.height` according to `pageSizes.ts`.
- Content must not be clipped; minZoom ensures the canvas can always be fitted completely inside the viewport.
