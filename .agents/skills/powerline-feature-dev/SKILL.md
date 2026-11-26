---
name: powerline-feature-dev
description: >-
  Architectural blueprint, feature recipes, and non-regression verification protocol
  for PowerLine Designer CAD. Use this skill whenever checking, modifying, or adding
  features, tools, symbols, conductors, inspector attributes, BOQ calculation rules,
  or export capabilities without needing to study the full codebase every time.
---

# PowerLine Designer: Feature Development & Verification Skill

This skill enables any agent or developer to inspect, modify, and add features to **PowerLine Designer** with **zero regressions** on existing functions, **without having to re-read the entire codebase**.

---

## 🚀 Fast Subsystem Routing (Read Only What You Need)

Do not read the full codebase. Use this table to jump directly to the 2–3 files that control each subsystem:

| Goal / Subsystem | Primary Files to Inspect & Edit |
| :--- | :--- |
| **New Electrical Node / Symbol** | `src/types/electrical.ts`<br>`src/components/Toolbar/LeftToolbox.tsx`<br>`src/components/Canvas/DrawingCanvas.tsx` (`nodeTools`)<br>`src/components/Canvas/NodeRenderer.tsx`<br>`src/utils/boqCalculator.ts` |
| **New Conductor / Cable Line** | `src/types/electrical.ts`<br>`src/components/Toolbar/LeftToolbox.tsx`<br>`src/components/Canvas/ConductorRenderer.tsx`<br>`src/utils/boqCalculator.ts` |
| **New Tool or Interaction Mode** | `src/types/electrical.ts` (`ActiveTool`)<br>`src/components/Canvas/DrawingCanvas.tsx` (`handleMouseDown`, `handleMouseMove`, `handleCanvasClick`)<br>`src/components/Toolbar/LeftToolbox.tsx` |
| **Inspect / Edit Properties** | `src/components/Panels/PropertyInspector.tsx`<br>`src/types/electrical.ts` (`ElectricalNode['properties']` or `ConductorEdge`) |
| **BOQ Rates & Schedule Rules** | `src/utils/boqCalculator.ts` (`calculateBoq`, `generateIndexEntries`)<br>`src/components/Panels/BoqPanel.tsx` |
| **Drawing Sheets & Page Sizing** | `src/constants/pageSizes.ts`<br>`src/components/Canvas/GridBackground.tsx` |
| **GIS, Map Tiles & Geo-Referencing** | `src/components/Canvas/MapUnderlay.tsx`<br>`src/utils/geoReference.ts`<br>`src/utils/wbGeoPlaces.ts` |
| **State, Undo/Redo, Hotkeys** | `src/App.tsx` (`onUpdateProject`, `history`, `handleKeyDown`) |
| **.pld File Format & Persistence** | `src/services/pldFileService.ts`<br>`src/services/localStorageService.ts` |
| **PDF Export & Title Block** | `src/utils/pdfExport.ts`<br>`src/components/Panels/ExportModal.tsx`<br>`src/components/Panels/TitleBlockModal.tsx` |
| **Desktop / Electron Wrapper** | `electron/main.cjs`<br>`package.json` |

---

## 📋 The 4-Phase Protocol for Adding or Checking Features

### Phase 1: Targeted Reading
1. Identify the feature category from the routing table above.
2. Read **only** the specified touchpoint files. Do not scan unrelated directories or files.
3. Check [feature-recipes.md](./references/feature-recipes.md) for the exact step-by-step checklist.

### Phase 2: Invariants & Safety Check
Before making any changes, review [safety-invariants.md](./references/safety-invariants.md):
- **Undo / Redo**: Ensure changes call `onUpdateProject(newProject, true)`.
- **Cascade Deletes**: Deleting a node must clean up attached edges and stays.
- **Coordinates**: Never mix browser client pixels with SVG sheet coordinates.
- **Serialization**: All new fields must be optional so existing `.pld` files and LocalStorage drawings load without crashing.
- **BOQ Precedence**: Node property overrides (`properties.height`, `properties.capacityKva`) take precedence over tool types.

### Phase 3: Implement Touchpoints
Follow the corresponding recipe from [feature-recipes.md](./references/feature-recipes.md). Complete all mandatory touchpoints across types, toolbox, canvas handlers, renderers, inspector, and BOQ.

### Phase 4: Non-Regression & Verification Gate
Execute the automated verification script:
```powershell
npm run verify:features
```
Or for full build check:
```powershell
npm run verify:features:full
```

The script automatically validates:
1. `tsc --noEmit` typecheck (0 errors required).
2. Cross-subsystem registration: Confirms that every `NodeType` and `ConductorType` defined in `electrical.ts` has a corresponding SVG renderer in `NodeRenderer.tsx` / `ConductorRenderer.tsx`, entry in `LeftToolbox.tsx`, calculation rule in `boqCalculator.ts`, and safe parsing in `pldFileService.ts`.
3. Vite production bundle compilation (`npm run build`).

---

## 📚 Reference Documentation

- [Architecture & Subsystem Map](./references/architecture-map.md) — Comprehensive structural breakdown of the entire CAD system.
- [Feature Recipes](./references/feature-recipes.md) — Concrete, step-by-step checklists for every type of addition.
- [Safety Invariants](./references/safety-invariants.md) — The 7 critical rules that must never be broken.
- [Verification Script](./scripts/verify-feature.mjs) — Automated CLI verification script.
