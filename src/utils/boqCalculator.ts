/**
 * Automated Bill of Quantities (BOQ) calculation & Symbol Index engine
 */

import { BoqItem, ConductorEdge, ElectricalNode, IndexEntry, StayItem } from '../types/electrical';

export function calculateBoq(
  nodes: ElectricalNode[],
  edges: ConductorEdge[],
  stays: StayItem[],
  customOverrides?: Record<string, string>
): BoqItem[] {
  const items: BoqItem[] = [];
  let itemNum = 1;

  // 1. Proposed 8M PCC Poles
  const pcc8mProposed = nodes.filter(
    (n) => n.status === 'proposed' && (n.type === 'pole_8m' || n.properties.height === '8M')
  ).length;
  if (pcc8mProposed > 0 || customOverrides?.['boq-pcc-8m']) {
    items.push({
      id: 'boq-pcc-8m',
      itemNumber: itemNum++,
      description: 'Erection of 8 Mtr Long PCC Pole',
      quantity: customOverrides?.['boq-pcc-8m'] ?? `${pcc8mProposed}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'pole',
    });
  }

  // 2. Proposed 9M PCC Single Poles
  const pcc9mProposed = nodes.filter(
    (n) =>
      n.status === 'proposed' &&
      (n.type === 'pole_9m' || (n.properties.height === '9M' && n.type === 'pole_single'))
  ).length;
  if (pcc9mProposed > 0 || customOverrides?.['boq-pcc-9m']) {
    items.push({
      id: 'boq-pcc-9m',
      itemNumber: itemNum++,
      description: 'Erection of 9M PCC Single Pole',
      quantity: customOverrides?.['boq-pcc-9m'] ?? `${pcc9mProposed}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'pole',
    });
  }

  // 3. Proposed DP Structures
  const dpProposed = nodes.filter((n) => n.status === 'proposed' && n.type === 'dp_structure').length;
  if (dpProposed > 0 || customOverrides?.['boq-dp']) {
    items.push({
      id: 'boq-dp',
      itemNumber: itemNum++,
      description: 'Propose of DP Structure',
      quantity: customOverrides?.['boq-dp'] ?? `${dpProposed}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'pole',
    });
  }

  // 4. Proposed 4-Pole Structures
  const fourPoleProposed = nodes.filter((n) => n.status === 'proposed' && n.type === 'four_pole').length;
  if (fourPoleProposed > 0 || customOverrides?.['boq-4pole']) {
    items.push({
      id: 'boq-4pole',
      itemNumber: itemNum++,
      description: 'Propose of 4-Pole Substation Structure',
      quantity: customOverrides?.['boq-4pole'] ?? `${fourPoleProposed}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'pole',
    });
  }

  // 5. Transformers
  const dtr25 = nodes.filter((n) => n.status === 'proposed' && n.type === 'dtr_25kva').length;
  if (dtr25 > 0 || customOverrides?.['boq-dtr-25']) {
    items.push({
      id: 'boq-dtr-25',
      itemNumber: itemNum++,
      description: 'Propose of 25 KVA DTR on 9M PCC Pole',
      quantity: customOverrides?.['boq-dtr-25'] ?? `${dtr25}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'transformer',
    });
  }

  const dtrConversion = nodes.filter((n) => n.type === 'dtr_conversion').length;
  if (dtrConversion > 0 || customOverrides?.['boq-dtr-conv']) {
    items.push({
      id: 'boq-dtr-conv',
      itemNumber: itemNum++,
      description: 'DTR Capacity Conversion 63 KVA to 100 KVA',
      quantity: customOverrides?.['boq-dtr-conv'] ?? `${dtrConversion}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'transformer',
    });
  }

  // 6. Stays
  const htStays = stays
    .filter((s) => s.type === 'ht_stay' && s.status === 'proposed')
    .reduce((sum, s) => sum + s.count, 0);
  if (htStays > 0 || customOverrides?.['boq-ht-stay']) {
    items.push({
      id: 'boq-ht-stay',
      itemNumber: itemNum++,
      description: 'Erection of HT Stay Set',
      quantity: customOverrides?.['boq-ht-stay'] ?? `${htStays}`,
      unit: 'Set',
      isAutoCalculated: true,
      category: 'stay',
    });
  }

  const ltStays = stays
    .filter((s) => s.type === 'lt_stay' && s.status === 'proposed')
    .reduce((sum, s) => sum + s.count, 0);
  if (ltStays > 0 || customOverrides?.['boq-lt-stay']) {
    items.push({
      id: 'boq-lt-stay',
      itemNumber: itemNum++,
      description: 'Erection of LT Stay Set',
      quantity: customOverrides?.['boq-lt-stay'] ?? `${ltStays}`,
      unit: 'Set',
      isAutoCalculated: true,
      category: 'stay',
    });
  }

  // 7. Conductors (Calculated in Kilometers)
  const calcKm = (type: string, status: string = 'proposed') => {
    const totalMeters = edges
      .filter((e) => e.type === type && e.status === status)
      .reduce((sum, e) => sum + (e.spanMeters || 0), 0);
    return (totalMeters / 1000).toFixed(3);
  };

  const acsr3wKm = calcKm('acsr_3wire');
  if (parseFloat(acsr3wKm) > 0 || customOverrides?.['boq-acsr-3w']) {
    items.push({
      id: 'boq-acsr-3w',
      itemNumber: itemNum++,
      description: 'Drawal of ACSR 50 SQ.MM 3 Wire',
      quantity: customOverrides?.['boq-acsr-3w'] ?? `${acsr3wKm}`,
      unit: 'KM',
      isAutoCalculated: true,
      category: 'conductor',
    });
  }

  const acsr4wKm = calcKm('acsr_4wire');
  if (parseFloat(acsr4wKm) > 0 || customOverrides?.['boq-acsr-4w']) {
    items.push({
      id: 'boq-acsr-4w',
      itemNumber: itemNum++,
      description: 'Drawal of ACSR 50 SQ.MM 3-Phase 4-Wire',
      quantity: customOverrides?.['boq-acsr-4w'] ?? `${acsr4wKm}`,
      unit: 'KM',
      isAutoCalculated: true,
      category: 'conductor',
    });
  }

  const acsr2wKm = calcKm('acsr_2wire');
  if (parseFloat(acsr2wKm) > 0 || customOverrides?.['boq-acsr-2w']) {
    items.push({
      id: 'boq-acsr-2w',
      itemNumber: itemNum++,
      description: 'Drawal of ACSR 50 SQ.MM 2 Wire',
      quantity: customOverrides?.['boq-acsr-2w'] ?? `${acsr2wKm}`,
      unit: 'KM',
      isAutoCalculated: true,
      category: 'conductor',
    });
  }

  const phaseConvKm = calcKm('phase_conversion');
  if (parseFloat(phaseConvKm) > 0 || customOverrides?.['boq-phase-conv']) {
    items.push({
      id: 'boq-phase-conv',
      itemNumber: itemNum++,
      description: 'Phase Conversion 1-Phase to 3-Phase',
      quantity: customOverrides?.['boq-phase-conv'] ?? `${phaseConvKm}`,
      unit: 'KM',
      isAutoCalculated: true,
      category: 'conductor',
    });
  }

  const abCableKm = calcKm('lt_ab_cable');
  if (parseFloat(abCableKm) > 0 || customOverrides?.['boq-ab-cable']) {
    items.push({
      id: 'boq-ab-cable',
      itemNumber: itemNum++,
      description: 'Drawal of LT AB Cable',
      quantity: customOverrides?.['boq-ab-cable'] ?? `${abCableKm}`,
      unit: 'KM',
      isAutoCalculated: true,
      category: 'conductor',
    });
  }

  const cradleGuards = edges.filter((e) => e.type === 'cradle_guard').length;
  if (cradleGuards > 0 || customOverrides?.['boq-cradle-guard']) {
    items.push({
      id: 'boq-cradle-guard',
      itemNumber: itemNum++,
      description: 'Drawal of Cradle Guard upto 50Mtr',
      quantity: customOverrides?.['boq-cradle-guard'] ?? `${cradleGuards}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'guard',
    });
  }

  // 8. Specialized Poles (RSJ / STP)
  const rsjCount = nodes.filter((n) => n.status === 'proposed' && n.type === 'pole_rsj').length;
  if (rsjCount > 0 || customOverrides?.['boq-rsj']) {
    items.push({
      id: 'boq-rsj',
      itemNumber: itemNum++,
      description: 'Erection of RSJ / Rail Pole (152x152mm)',
      quantity: customOverrides?.['boq-rsj'] ?? `${rsjCount}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'pole',
    });
  }

  const stpCount = nodes.filter((n) => n.status === 'proposed' && n.type === 'pole_stp').length;
  if (stpCount > 0 || customOverrides?.['boq-stp']) {
    items.push({
      id: 'boq-stp',
      itemNumber: itemNum++,
      description: 'Erection of Steel Tubular Pole (STP)',
      quantity: customOverrides?.['boq-stp'] ?? `${stpCount}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'pole',
    });
  }

  // 9. Switchgear & Protection
  const abSwitchCount = nodes.filter((n) => n.status === 'proposed' && n.type === 'ab_switch').length;
  if (abSwitchCount > 0 || customOverrides?.['boq-ab-switch']) {
    items.push({
      id: 'boq-ab-switch',
      itemNumber: itemNum++,
      description: 'Installation of 11kV 200A Air Break (AB) Switch',
      quantity: customOverrides?.['boq-ab-switch'] ?? `${abSwitchCount}`,
      unit: 'Set',
      isAutoCalculated: true,
      category: 'equipment',
    });
  }

  const hgFuseCount = nodes.filter((n) => n.status === 'proposed' && n.type === 'hg_fuse').length;
  if (hgFuseCount > 0 || customOverrides?.['boq-hg-fuse']) {
    items.push({
      id: 'boq-hg-fuse',
      itemNumber: itemNum++,
      description: 'Installation of 11kV Horn Gap (HG) Fuse Set',
      quantity: customOverrides?.['boq-hg-fuse'] ?? `${hgFuseCount}`,
      unit: 'Set',
      isAutoCalculated: true,
      category: 'equipment',
    });
  }

  const ltBoxCount = nodes.filter((n) => n.status === 'proposed' && n.type === 'lt_distribution_box').length;
  if (ltBoxCount > 0 || customOverrides?.['boq-lt-box']) {
    items.push({
      id: 'boq-lt-box',
      itemNumber: itemNum++,
      description: 'Installation of LT Distribution Kiosk / Pillar Box',
      quantity: customOverrides?.['boq-lt-box'] ?? `${ltBoxCount}`,
      unit: 'Nos',
      isAutoCalculated: true,
      category: 'equipment',
    });
  }

  const laCount = nodes.filter((n) => n.status === 'proposed' && n.type === 'lightning_arrester').length;
  if (laCount > 0 || customOverrides?.['boq-la']) {
    items.push({
      id: 'boq-la',
      itemNumber: itemNum++,
      description: 'Installation of 9kV 5kA Lightning Arrester (LA) Set',
      quantity: customOverrides?.['boq-la'] ?? `${laCount}`,
      unit: 'Set',
      isAutoCalculated: true,
      category: 'equipment',
    });
  }

  // 10. Additional Conductors & Earth Wire
  const htOhKm = calcKm('ht_ug_cable');
  if (parseFloat(htOhKm) > 0 || customOverrides?.['boq-ht-oh']) {
    items.push({
      id: 'boq-ht-oh',
      itemNumber: itemNum++,
      description: 'Drawal of 11kV HT-OH Line Conductor',
      quantity: customOverrides?.['boq-ht-oh'] ?? `${htOhKm}`,
      unit: 'KM',
      isAutoCalculated: true,
      category: 'conductor',
    });
  }

  const earthWireKm = calcKm('earth_wire');
  if (parseFloat(earthWireKm) > 0 || customOverrides?.['boq-earth-wire']) {
    items.push({
      id: 'boq-earth-wire',
      itemNumber: itemNum++,
      description: 'Drawal of 6 SWG G.I. Continuous Earth Wire',
      quantity: customOverrides?.['boq-earth-wire'] ?? `${earthWireKm}`,
      unit: 'KM',
      isAutoCalculated: true,
      category: 'conductor',
    });
  }

  // 11. Custom Tool Symbols on Canvas
  const customNodes = nodes.filter((n) => n.type === 'custom_symbol');
  const customGroups: Record<string, { count: number; name: string; desc: string; unit: string }> = {};

  customNodes.forEach((n) => {
    const key = n.customToolId || n.properties.customName || 'custom';
    if (!customGroups[key]) {
      customGroups[key] = {
        count: 0,
        name: n.properties.customName || 'Custom Item',
        desc: n.properties.notes || n.properties.customName || 'Custom Engineering Item',
        unit: 'Nos',
      };
    }
    customGroups[key].count += 1;
  });

  Object.entries(customGroups).forEach(([key, info]) => {
    const overrideKey = `boq-${key}`;
    items.push({
      id: overrideKey,
      itemNumber: itemNum++,
      description: info.desc,
      quantity: customOverrides?.[overrideKey] ?? `${info.count}`,
      unit: info.unit,
      isAutoCalculated: true,
      category: 'custom',
    });
  });

  return items;
}

/**
 * Generate dynamic drawing index (Legend) based on symbols present in drawing
 */
export function generateIndexEntries(
  nodes: ElectricalNode[],
  edges: ConductorEdge[],
  stays: StayItem[]
): IndexEntry[] {
  const entries: IndexEntry[] = [];
  let num = 1;

  if (nodes.some((n) => n.status === 'existing')) {
    entries.push({
      id: 'idx-exist-pole',
      number: num++,
      description: 'Existing Line / Pole',
      symbolKey: 'exist_pole',
      status: 'existing',
    });
  }

  if (nodes.some((n) => n.status === 'proposed' && (n.type === 'pole_8m' || n.properties.height === '8M'))) {
    entries.push({
      id: 'idx-pcc-8m',
      number: num++,
      description: 'Erection of 8 Mtr Long PCC Pole',
      symbolKey: 'pole_8m',
      status: 'proposed',
    });
  }

  if (nodes.some((n) => n.status === 'proposed' && (n.type === 'pole_9m' || n.properties.height === '9M'))) {
    entries.push({
      id: 'idx-pcc-9m',
      number: num++,
      description: 'Erection of 9M PCC Single Pole',
      symbolKey: 'pole_9m',
      status: 'proposed',
    });
  }

  if (nodes.some((n) => n.type === 'dp_structure')) {
    entries.push({
      id: 'idx-dp',
      number: num++,
      description: 'Proposed DP Structure',
      symbolKey: 'dp_structure',
      status: 'proposed',
    });
  }

  if (nodes.some((n) => n.type === 'dtr_25kva' || n.type === 'dtr_conversion')) {
    entries.push({
      id: 'idx-dtr',
      number: num++,
      description: 'Proposed 25 KVA DTR / Conversion',
      symbolKey: 'dtr',
      status: 'proposed',
    });
  }

  if (stays.some((s) => s.type === 'ht_stay')) {
    entries.push({
      id: 'idx-ht-stay',
      number: num++,
      description: 'Fixing of HT Stay Set',
      symbolKey: 'ht_stay',
      status: 'proposed',
    });
  }

  if (stays.some((s) => s.type === 'lt_stay')) {
    entries.push({
      id: 'idx-lt-stay',
      number: num++,
      description: 'Fixing of LT Stay Set',
      symbolKey: 'lt_stay',
      status: 'proposed',
    });
  }

  if (edges.some((e) => e.type === 'acsr_4wire')) {
    entries.push({
      id: 'idx-acsr-4w',
      number: num++,
      description: 'Drawal of ACSR 50 Sq.mm 3 Phase 4 Wire',
      symbolKey: 'acsr_4wire',
      status: 'proposed',
    });
  }

  if (edges.some((e) => e.type === 'acsr_3wire')) {
    entries.push({
      id: 'idx-acsr-3w',
      number: num++,
      description: 'Drawal of ACSR 50 Sq.mm 3 Wire',
      symbolKey: 'acsr_3wire',
      status: 'proposed',
    });
  }

  if (edges.some((e) => e.type === 'lt_ab_cable')) {
    entries.push({
      id: 'idx-ab-cable',
      number: num++,
      description: 'Drawal of LT AB Cable',
      symbolKey: 'lt_ab_cable',
      status: 'proposed',
    });
  }

  if (edges.some((e) => e.type === 'phase_conversion')) {
    entries.push({
      id: 'idx-phase-conv',
      number: num++,
      description: 'Phase Conversion 1-ph to 3-Phase',
      symbolKey: 'phase_conversion',
      status: 'proposed',
    });
  }

  if (edges.some((e) => e.type === 'cradle_guard')) {
    entries.push({
      id: 'idx-cradle-guard',
      number: num++,
      description: 'Drawal of Cradle Guard upto 50Mtr',
      symbolKey: 'cradle_guard',
      status: 'proposed',
    });
  }

  return entries;
}
