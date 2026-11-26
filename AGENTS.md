# Agent Guidelines for PowerLine Designer

Welcome to the **PowerLine Designer** project workspace.

## ⚡ Core Skills

Whenever working on this codebase or drafting distribution line drawings, consult the two specialized skills:

1. **Electrical Engineering & Scheme Drafting Skill**:
   👉 **`.agents/skills/electrical-distribution-engineer/SKILL.md`**
   Use when drafting, inspecting, or validating power line drawings across:
   - **New Pole Erection & Electrification Schemes**
   - **Maintenance & Renovation Schemes**
   - **Wire Theft Restoration Work Drawings**
   - **Material Damage & Accident Restoration Work**

2. **Feature Development & Architecture Skill**:
   👉 **`.agents/skills/powerline-feature-dev/SKILL.md`**
   Use when adding, inspecting, or modifying CAD code, tools, renderers, inspector properties, or BOQ rules without reading the full codebase.

### Fast File Routing:
- **Adding / Checking Nodes & Symbols**: `src/types/electrical.ts`, `LeftToolbox.tsx`, `DrawingCanvas.tsx` (`nodeTools`), `NodeRenderer.tsx`, `boqCalculator.ts`
- **Adding / Checking Conductors & Lines**: `src/types/electrical.ts`, `LeftToolbox.tsx`, `ConductorRenderer.tsx`, `boqCalculator.ts`
- **Adding / Checking Canvas Tools**: `DrawingCanvas.tsx` (`handleMouseDown`, `handleMouseMove`, `handleCanvasClick`), `LeftToolbox.tsx`
- **Inspector Attributes**: `PropertyInspector.tsx`, `types/electrical.ts`
- **BOQ Schedule & Rates**: `boqCalculator.ts`, `BoqPanel.tsx`
- **Drawing Sheets & Page Sizing**: `constants/pageSizes.ts`, `GridBackground.tsx`
- **GIS Map & Geo-Referencing**: `MapUnderlay.tsx`, `geoReference.ts`, `wbGeoPlaces.ts`
- **State & History**: `src/App.tsx` (`onUpdateProject`, `history`, `activeTool`)
- **.pld File Persistence**: `pldFileService.ts`, `localStorageService.ts`
- **PDF Export & Title Block**: `pdfExport.ts`, `ExportModal.tsx`, `TitleBlockModal.tsx`

---

## 🛡️ Critical Invariants (Never Break These)

1. **Undo / Redo History**: Always call `onUpdateProject(newProject, true)` for user actions. For real-time dragging, update with `pushHistory: false` and commit on mouse up.
2. **Referential Integrity**: Deleting a node MUST cascade to delete attached edges and stays. Moving a node recalculates span meters and GPS coordinates.
3. **Coordinate Systems**: Do not mix screen `clientX/Y` with SVG sheet coordinates. Always convert via SVG matrix transform (`svg.getScreenCTM().inverse()`).
4. **Stateful `.pld` Compatibility**: All new entity properties must be optional (`field?: string`) and have fallback defaults when loaded.
5. **BOQ Accuracy**: Attribute overrides (`height`, `capacityKva`) take precedence over base node types.

---

## 🧪 Verification & Audit Gates

1. **Electrical Engineering Integrity Audit**:
   ```powershell
   npm run audit:engineering
   ```

2. **Fast Feature Integrity Check**:
   ```powershell
   npm run verify:features
   ```

3. **Full Build & Production Bundle Verification**:
   ```powershell
   npm run verify:features:full
   ```
