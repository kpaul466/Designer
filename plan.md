# PowerLine Designer — Project Roadmap & Technical Specification

## 1. Project Objectives
Provide an engineering-grade web application for creating, managing, calculating, and exporting electrical distribution line drawings (11 kV HT, LT 3-phase 4-wire, AB cable, DTR installations, phase conversions, resagging, and river/road crossings) adhering strictly to standard utility field blueprints and generating official A4 Landscape PDF sheets with automated Bill of Quantities (BOQ).

## 2. Technical Architecture
- **Framework**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Graphics Engine**: High-Precision Vector SVG Scene Graph with real-time geometric snapping, pan/zoom transformation matrix, and live dimension rendering.
- **GIS / Mapping**: Dual-mode CAD Grid with toggleable Satellite and Road GIS map underlay, transparency slider, and coordinate locking.
- **Export Engine**: Vector-accurate client-side A4 Landscape PDF generation (297mm × 210mm) with engineering border, title block, symbol index, and BOQ schedule via jsPDF + HTML Canvas/SVG rendering.
- **Data Persistence**: LocalStorage auto-save engine, JSON project import/export, and version history snapshots.

## 3. Electrical Symbols & Domain Primitives
- **PCC Poles**: 8m PCC, 9m PCC, Single Pole, DP Structure, 4-Pole Structure (Existing vs. Proposed states).
- **Transformers (DTR)**: 25 kVA, 63 kVA, 100 kVA, DTR capacity conversions (e.g. 63 kVA to 100 kVA).
- **Stays**: HT Stay Set, LT Stay Set, Struts with directional arrows and set counts.
- **Conductors**: ACSR 50 sq.mm 3-wire, ACSR 50 sq.mm 4-wire (with 4-cross phase tick marks), ACSR 2-wire, LT AB Cable, Phase Conversion (1-ph to 3-ph annotation), Resagging lines, Cradle Guard up to 50m.
- **Civil & Geography**: River crossing with width/spans, Road crossing (National Highway / Rural PWD road), Consumer service connections (S/C drops with consumer name, address, phone).

## 4. Phase Breakdown
- Phase 1: Foundation & CAD Canvas Engine
- Phase 2: Electrical Symbol & Conductor Toolsets
- Phase 3: Pre-loaded Real-World Blueprints (Samples 1 to 6) & Template Picker
- Phase 4: Automatic BOQ Generator & Dynamic Symbol Index
- Phase 5: GIS Map Underlay & Coordinate Lock
- Phase 6: A4 Landscape PDF Export & Print Engine
- Phase 7: Verification, Mobile Optimization & Documentation
