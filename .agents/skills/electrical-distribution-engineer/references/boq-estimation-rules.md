# Bill of Quantities (BOQ) Schedule of Rates (SOR) Estimation Rules

This reference outlines the quantitative calculation and itemization rules applied by the BOQ engine in PowerLine Designer.

---

## 1. Units of Measurement & Precision

- **Poles & Structures**: Measured in **Nos** (Integer).
- **Conductors & Cables**: Measured in **Kilometers (KM)** rounded to 3 decimal places (`0.040 KM` = 40 meters).
- **Service Cables**: Measured in **Meters (M)** or **Nos** (drops).
- **Stays & Hardware**: Measured in **Sets** (Integer).
- **Switchgear & Transformers**: Measured in **Sets** or **Nos** (Integer).

---

## 2. Schedule Item Mapping

| Subsystem Category | Entity Type | Generated BOQ Item Description | Unit | Rate Category |
| :--- | :--- | :--- | :--- | :--- |
| **New PCC Poles** | `pole_8m` (status = proposed) | Erection of 8 Mtr Long PCC Pole | Nos | Capital Erection |
| **New PCC Poles** | `pole_9m` (status = proposed) | Erection of 9M PCC Single Pole | Nos | Capital Erection |
| **Accident / Broken** | `broken_pole` (height = 8M) | Dismantling / Replacement of Broken 8M PCC Pole | Nos | Maintenance / Damage |
| **Accident / Broken** | `broken_pole` (height = 9M) | Dismantling / Replacement of Broken 9M PCC Pole | Nos | Maintenance / Damage |
| **Hardware** | `box_bracket` (status = proposed) | Supplying & Fixing of Box Bracket Set | Set | Hardware Fitting |
| **Substation Take-Off**| `dp_structure` (status = proposed) | Propose of DP Structure | Nos | Substation Structure |
| **Substation Plinth** | `four_pole` (status = proposed) | Propose of 4-Pole Substation Structure | Nos | Substation Plinth |
| **Distribution Transformer** | `dtr_25kva` (status = proposed) | Propose of 25 KVA DTR on 9M PCC Pole | Nos | Capital Equipment |
| **Distribution Transformer** | `dtr_63kva` (status = proposed) | Propose of 63 KVA DTR | Nos | Capital Equipment |
| **Distribution Transformer** | `dtr_100kva` (status = proposed) | Propose of 100 KVA DTR | Nos | Capital Equipment |
| **DTR Renovation** | `dtr_conversion` | DTR Capacity Conversion 63 KVA to 100 KVA | Nos | System Renovation |
| **ACSR 4-Wire** | `acsr_4wire` (status = proposed) | Drawal of ACSR 50 SQ.MM 3-Phase 4-Wire | KM | Line Drawal |
| **ACSR 3-Wire** | `acsr_3wire` (status = proposed) | Drawal of ACSR 50 SQ.MM 2-Phase 3-Wire Line | KM | Line Drawal |
| **ACSR 2-Wire** | `acsr_2wire` (status = proposed) | Drawal of ACSR 50 SQ.MM 1-Phase 2-Wire Line | KM | Line Drawal |
| **Wire Theft Restoration** | `theft_acsr` | Drawal of ACSR 50 Sq.mm Conductor against Theft Line | KM | Theft Restoration |
| **LT AB Cable 50mm²** | `lt_ab_cable` (gauge = 50 sq.mm)| Drawal of LT AB Cable 3x50 + 1x35 + 1x16 sq.mm | KM | Line Drawal |
| **LT AB Cable 70mm²** | `lt_ab_cable` (gauge = 70 sq.mm)| Drawal of LT AB Cable 3x70 + 1x50 + 1x16 sq.mm | KM | Line Drawal |
| **LT AB Cable 25mm²** | `lt_ab_cable` (gauge = 25 sq.mm)| Drawal of LT AB Cable 3x25 + 1x25 + 1x16 sq.mm | KM | Line Drawal |
| **Phase Conversion** | `phase_conversion` | Phase Conversion 1-Phase to 3-Phase | KM | Maintenance Renovation |
| **Guy Wire / Stay** | `ht_stay` (status = proposed) | Erection of HT Stay Set | Set | Line Strengthening |
| **Guy Wire / Stay** | `lt_stay` (status = proposed) | Erection of LT Stay Set | Set | Line Strengthening |

---

## 3. Override Rules & Priority Precedence

1. **Inspector Attributes Win Over Tool Types**:
   - If an `8m PCC Pole` is changed to `9M` in Property Inspector, BOQ records `Erection of 9M PCC Single Pole`.
   - If a `4-Pole Substation` has `capacityKva: 100`, the BOQ records both the structure AND the 100 kVA DTR.
2. **User Manual Overrides**:
   - User custom values in `customOverrides` take priority over auto-calculated physical tallies.
   - Auto-calculated items retain `isAutoCalculated: true` flag.
