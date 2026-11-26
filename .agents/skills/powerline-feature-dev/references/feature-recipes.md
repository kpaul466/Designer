# Step-by-Step Feature Recipes

Follow these step-by-step recipes when extending PowerLine Designer. Every recipe lists the **exact touchpoint files** so you don't need to read the whole codebase.

---

## Recipe 1: Adding a New Electrical Node / Equipment / Structure Symbol

### Mandatory Touchpoints:
1. **Define Type**: `src/types/electrical.ts`
   - Add the new key to `NodeType` union (e.g. `'substation_tap'` or `'gang_isolator'`).
   - If it has custom properties, add them to `ElectricalNode['properties']`.
2. **Add to Toolbox**: `src/components/Toolbar/LeftToolbox.tsx`
   - Add tool item in appropriate category:
     ```tsx
     { id: 'gang_isolator' as ActiveTool, label: 'Gang Isolator', badge: 'GI', icon: SlidersHorizontal }
     ```
3. **Register Canvas Placement**: `src/components/Canvas/DrawingCanvas.tsx`
   - In `handleCanvasClick`, add the type string to the `nodeTools` array (around line 860-880).
4. **Implement SVG Symbol**: `src/components/Canvas/NodeRenderer.tsx`
   - Add rendering branch:
     ```tsx
     {node.type === 'gang_isolator' && (
       <g>
         {/* SVG symbol elements, using primaryColor / secondaryColor / fillColor */}
       </g>
     )}
     ```
   - Ensure it respects `isProposed` (red) vs `existing` (slate) colors.
5. **Configure Inspector (if attributes exist)**: `src/components/Panels/PropertyInspector.tsx`
   - Add controls under node section to view/edit custom attributes.
6. **Integrate with BOQ & Legend**: `src/utils/boqCalculator.ts`
   - If chargeable: In `calculateBoq()`, count occurrences and add a `BoqItem`.
   - In `generateIndexEntries()`: Add entry to symbol legend if it appears in drawings.
7. **Verification**:
   - Run `npm run verify:features`

---

## Recipe 2: Adding a New Conductor / Cable / Line Type

### Mandatory Touchpoints:
1. **Define Type**: `src/types/electrical.ts`
   - Add key to `ConductorType` union (e.g. `'ht_33kv_oh'`).
2. **Add to Toolbox**: `src/components/Toolbar/LeftToolbox.tsx`
   - Add to `Lines & Conductors` tool group:
     ```tsx
     { id: 'ht_33kv_oh' as ActiveTool, label: '33kV HT Overhead Line', badge: '33k', icon: Spline }
     ```
3. **Implement Line Styling**: `src/components/Canvas/ConductorRenderer.tsx`
   - Set stroke color, width, dash array, and intermediate tick marks:
     ```tsx
     const is33kv = edge.type === 'ht_33kv_oh';
     // Configure stroke, dash, or custom SVG ticks along midpoint
     ```
4. **Configure Inspector**: `src/components/Panels/PropertyInspector.tsx`
   - Add conductor options (gauge, phase, span override).
5. **Integrate with BOQ**: `src/utils/boqCalculator.ts`
   - In `calculateBoq()`: Add aggregation loop summing `edge.spanMeters` for this type and appending to `BoqItem[]`.
   - In `generateIndexEntries()`: Add symbol legend item.
6. **Verification**:
   - Run `npm run verify:features`

---

## Recipe 3: Adding a New Canvas Tool or Interaction Mode

### Mandatory Touchpoints:
1. **Define Tool ID**: `src/types/electrical.ts`
   - Add tool name to `ActiveTool` union.
2. **Add Tool Button**: `src/components/Toolbar/LeftToolbox.tsx` or `TopBar.tsx`.
3. **Handle Canvas Events**: `src/components/Canvas/DrawingCanvas.tsx`
   - `handleMouseDown`: Initialize action state (start point, draft shape).
   - `handleMouseMove`: Update temporary ghost preview coordinates.
   - `handleMouseUp` / `handleCanvasClick`: Finalize entity and call `onUpdateProject(newProject, true)`.
   - Render interactive ghost overlay inside `<svg>` when `activeTool === 'my_tool'`.
4. **Keyboard Shortcut**: `src/App.tsx` (in `handleKeyDown` hook) to assign a quick shortcut key.
5. **Update Shortcuts Modal**: `src/components/Panels/KeyboardShortcutsModal.tsx`.

---

## Recipe 4: Adding a Property or Spec to an Existing Entity

### Mandatory Touchpoints:
1. **Update Interface**: `src/types/electrical.ts`
   - Add optional field to `ElectricalNode['properties']`, `ConductorEdge`, or `DrawingProject`.
   - *Crucial*: Always make new properties optional (`field?: string`) to maintain backwards compatibility with existing `.pld` files and LocalStorage projects.
2. **Add UI Control**: `src/components/Panels/PropertyInspector.tsx`
   - Render input, select, or toggle in the active selection section.
   - Dispatch update using `onUpdateNode` or `onUpdateEdge`.
3. **Sync with Rendering / BOQ**:
   - If property affects appearance: Update `NodeRenderer.tsx` or `ConductorRenderer.tsx`.
   - If property affects quantities: Update `boqCalculator.ts` getter logic (e.g. `getPoleHeight` or `getDtrCapacity`).
4. **Verification**:
   - Run `npm run verify:features`

---

## Recipe 5: Modifying or Adding BOQ Calculations & Rates

### Mandatory Touchpoints:
1. **Calculation Engine**: `src/utils/boqCalculator.ts`
   - Modify `calculateBoq(nodes, edges, stays, customTools)`.
   - Append or update items in `boqItems` array.
   - Set `isAutoCalculated: true` for automatic items, or handle manual user items.
2. **Legend Generator**: `generateIndexEntries()` in `boqCalculator.ts`
   - Ensure any new symbol key maps to a clean description in the drawing index.
3. **Inspect Output**:
   - Open `BoqPanel.tsx` in UI to verify tabulated counts.
   - Verify `src/utils/pdfExport.ts` renders table properly without overflow.

---

## Recipe 6: Adding a New Modal, Panel, or Dialog

### Mandatory Touchpoints:
1. **Create Modal Component**: `src/components/Panels/MyFeatureModal.tsx`
   - Structure with backdrop, close button (`X`), header, scrollable body, and action buttons.
2. **Register State in App**: `src/App.tsx`
   - `const [isMyModalOpen, setIsMyModalOpen] = useState(false);`
3. **Add Trigger in Toolbar**:
   - `src/components/Toolbar/TopBar.tsx` for file/view actions, or `StatusBar.tsx` for indicators.
4. **Render in App**:
   - Add `<MyFeatureModal isOpen={isMyModalOpen} onClose={() => setIsMyModalOpen(false)} ... />` near bottom of `App.tsx`.
