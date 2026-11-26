# Scheme-Specific Drafting Protocols & Workflows

Follow these engineering protocols when preparing official distribution drawings in PowerLine Designer.

---

## 🏗️ 1. New Pole Erection & Electrification Scheme

### Objective:
Draft a complete blueprint for new line erection, rural electrification, or line extension schemes from an existing source to consumer clusters.

### Step-by-Step Drafting Protocol:
1. **Project Classification**:
   - Open **Project Setup** (`Ctrl+Shift+P` or Ribbon > *Page Setup*).
   - Set **Work Type** to **`New Work`**.
   - Fill in CCC Name, Division, Sub-Division, Work Order No, and PO/Application No.
2. **Anchor the Source**:
   - Place a **Substation Tap** (`substation_tap`) or **DP Structure** (`dp_structure`) at the existing tapping point.
   - Set status to `existing` for the source pole, and place an **AB Switch** (`ab_switch`) as the sectionalizer.
3. **Route Plotting (Poles)**:
   - Select **8m PCC Pole** (`pole_8m`) for LT distribution or **9m PCC Pole** (`pole_9m`) for 11kV lines.
   - Click canvas to place poles at 40m–45m intervals.
   - At sharp bends (> 15° deviation), use **DP Structure** or **RSJ Pole** with stay sets.
4. **Drawing Conductors**:
   - Select **ACSR 4-Wire** (`acsr_4wire`) or **LT AB Cable** (`lt_ab_cable`).
   - Click consecutive poles to link them; verify span dimensions appear automatically (e.g. `40 M`, `45 M`).
5. **Guy Wire / Stay Reinforcement**:
   - Select **HT Stay Set** (`ht_stay`) or **LT Stay Set** (`lt_stay`).
   - Click each angle and terminal pole to attach stay sets pointing opposing the resultant mechanical tension.
6. **Substation & Distribution Transformer**:
   - Place a **4-Pole Substation** (`four_pole`) or DTR pole (`dtr_63kva` / `dtr_100kva`).
   - Equip with **HG Fuse Set** (`hg_fuse`), **Lightning Arrester** (`lightning_arrester`), and **LT Distribution Box** (`lt_distribution_box`).
7. **Consumer Drops**:
   - Place **Consumer Drop (S/C)** (`consumer_house`) near dwelling clusters.
   - Connect from the nearest PCC pole using **1-Ph Service Cable** (`service_cable`).
8. **Verification**:
   - Open **BOQ Panel** to check auto-calculated quantities (Poles, Conductors in KM, Stays in Sets, Transformers in Nos).
   - Open **Export Preview** (`Export A4 PDF`) to verify drawing index, title block, and engineering sign-off fields.

---

## 🔧 2. Maintenance & Renovation Work Schemes

### Objective:
Document existing lines, record renovations, upgrade conductor gauges, enhance transformer ratings, and balance load.

### Step-by-Step Drafting Protocol:
1. **Project Classification**:
   - Set **Work Type** to **`Maintenance Work`**.
2. **Draft Existing Baseline**:
   - Place baseline poles and lines with status set to **`existing`** (rendered in solid slate `#1e293b`).
3. **Re-Sagging / Reconductoring**:
   - For loose or aged spans, select the edge in **Property Inspector** and toggle **Re-Sagging** or update conductor status.
4. **Phase Conversion (1-Phase to 3-Phase)**:
   - Select **Phase Conversion** (`phase_conversion`) tool.
   - Link existing single-phase poles to indicate the addition of 2 phases to relieve overloaded lines.
5. **DTR Capacity Conversion**:
   - Place **63 to 100k Conv.** (`dtr_conversion`) at the transformer plinth.
   - The symbol displays an enhancement coil diagram (`63 kVA → 100 kVA`) and logs conversion in the BOQ.

---

## ⚡ 3. Wire Theft Restoration Work Schemes

### Objective:
Accurately record spans where ACSR conductors were cut and stolen by miscreants, determine theft conductor kilometerage, and issue replacement re-stringing estimates.

### Step-by-Step Drafting Protocol:
1. **Document Incident Location**:
   - Identify existing line route poles between which wire theft occurred.
   - Poles remain marked as `existing` (PCC poles intact).
2. **Drafting Theft Spans**:
   - Select **Theft ACSR (Green)** (`theft_acsr`) from *Lines & Conductors*.
   - Click the start pole and end pole across all affected spans.
   - The line renders in **Green (`#16a34a`)** with dashed survey marks, warning cross ticks, and a green badge: `40 M (THEFT)`.
3. **Wire Specification**:
   - In **Property Inspector**, verify conductor wire gauge (defaults to `50 sq.mm Weasel / Rabbit`).
4. **BOQ Auto-Tally**:
   - The BOQ schedule automatically aggregates total theft span length in KM:
     *Item: "Drawal of ACSR 50 Sq.mm Conductor against Theft Line" (Unit: KM)*.
5. **Scheme Documentation**:
   - In Title Block notes, enter FIR / General Diary (GD) number and date for official utility records.

---

## 💥 4. Material Damage & Accident Restoration Schemes

### Objective:
Survey and estimate repairs following vehicular collision, storm damage, tree falls, or structural collapse.

### Step-by-Step Drafting Protocol:
1. **Mark Damaged / Broken Poles**:
   - Select **Broken Pole (Green)** (`broken_pole`) from *Poles & Structures*.
   - Click canvas at the accident location.
   - Renders a high-contrast Green cracked pole symbol with diagonal jagged break lines and `"BROKEN 8M"` / `"BROKEN 9M"` badge.
2. **Configure Height & Pole ID**:
   - In **Property Inspector**, select whether the snapped pole was an **`8M`** or **`9M`** PCC pole.
   - Enter original pole number (e.g. `P-14`).
3. **Hardware & Fitting Replacement**:
   - If cable clamps or brackets were sheared off, place **Box Bracket [o]** (`box_bracket`).
   - If guy wires snapped, place replacement **LT Stay** or **HT Stay** sets.
4. **Line Restoration**:
   - If conductor was severed during the crash, draw the replacement span with proposed ACSR or LT AB cable.
5. **BOQ Verification**:
   - Check the BOQ schedule:
     - Automatically logs *"Dismantling / Replacement of Broken 8M PCC Pole"* (Nos).
     - Automatically logs *"Dismantling / Replacement of Broken 9M PCC Pole"* (Nos).
     - Automatically logs *"Supplying & Fixing of Box Bracket Set"* (Set).
