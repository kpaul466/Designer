# Electrical Distribution Engineering Standards & Code Rules

This reference documents utility-standard electrical engineering rules (CEA, REC, and WBSEDCL practices) implemented and enforced in PowerLine Designer.

---

## 1. Support Structures (Poles & Substation Gantry)

| Structure Type | Standard Symbol | Height / Spec | Typical Application | Working Load |
| :--- | :--- | :--- | :--- | :--- |
| **8M PCC Pole** | Red concentric ring with cross-arm (`pole_8m`) | 8.0 Meters | Low Tension (415V/230V) distribution, consumer branch lines | 140 kg |
| **9M PCC Pole** | Red double ring with cross-arm (`pole_9m`) | 9.0 Meters | 11kV High Tension lines, road crossing supports, single-pole 25kVA DTR | 200 kg / 300 kg |
| **Broken PCC Pole** | Green dashed ring with jagged break crack (`broken_pole`) | 8M or 9M | Accident, vehicle crash, storm damage, or cracked poles requiring dismantling/replacement | Damaged |
| **DP Structure** | H-Frame double pole with cross-bracing (`dp_structure`) | 9.0M / 11.0M | Angle poles (> 30° deviation), 11kV sectionalizing points, terminal take-off | Dual Pole |
| **4-Pole Structure** | Quad pole plinth with equipment deck (`four_pole`) | Plinth mount | Substation plinth, 63kVA/100kVA transformer mounting with switchgear deck | Quad Pole |
| **RSJ / Rail Pole** | I-Beam girder cross section (`pole_rsj`) | 150x150 mm | Heavy angle points, sharp turns, rail/highway corridors | High Tensile |
| **Steel Tubular (STP)** | Telescopic concentric tubular rings (`pole_stp`) | 3-stage swaged | Urban narrow lanes, river banks, flood-prone locations | High Flexibility |

---

## 2. Span Dimensions & Electrical Clearances

- **Standard LT Spans (415V / 230V)**:
  - Normal rural/semi-urban span: **40 meters to 45 meters**.
  - Maximum allowable span without intermediate support: **50 meters**.
  - Minimum ground clearance:
    - Along streets: **5.5 meters (18 ft)**.
    - Across streets: **5.8 meters (19 ft)**.
    - In open countryside: **4.6 meters (15 ft)**.
- **Standard 11kV HT Spans**:
  - Normal span: **50 meters to 60 meters**.
  - Maximum span: **70 meters**.
  - Road / Railway crossings: Always guarded with **Cradle Guard** (`cradle_guard`).
  - Minimum ground clearance: **6.1 meters (20 ft)** across streets.

---

## 3. Conductor & Cable Systems

- **ACSR Conductors (Aluminium Conductor Steel Reinforced)**:
  - **ACSR 4-Wire (3-Ph 4-W)**: 3 Phase (R, Y, B) + 1 Neutral for main 3-phase LT distribution.
  - **ACSR 3-Wire (2-Ph 3-W)**: 2 Phase + 1 Neutral for branch rural electrification.
  - **ACSR 2-Wire (1-Ph 2-W)**: 1 Phase + 1 Neutral for single-phase street and hamlet electrification.
  - **Theft ACSR Line (Green)**: Stolen/theft line marked in green (`#16a34a`) for surveyed re-stringing.
- **LT Aerial Bunched (AB) Cables**:
  - Sizes: `3x50 + 1x35 + 1x16 sq.mm`, `3x70 + 1x50 + 1x16 sq.mm`, `3x25 + 1x25 + 1x16 sq.mm`.
  - Used for zero-theft, insulated safety along congested corridors and tree-lined routes.
- **Service Connection Drop Cables**:
  - Single-Phase: 2-Core PVC/XLPE Aluminium Armoured/Unarmoured (6 sq.mm / 10 sq.mm).
  - Three-Phase: 4-Core PVC/XLPE Aluminium Armoured (16 sq.mm / 25 sq.mm).

---

## 4. Guy Wire & Stay Set Rules

- **HT Stay Set**: 3/8" Galvanized Steel wire with 16mm stay rod and strain insulator.
- **LT Stay Set**: 7/14 SWG GI wire with 12mm stay rod and egg insulator.
- **Mandatory Locations**:
  - Every dead-end terminal pole.
  - Every angle pole where line deviation exceeds 10°.
  - Every tee-off junction pole (opposing the resultant pull).
  - Both sides of long river/road crossing spans.
