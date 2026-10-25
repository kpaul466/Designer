/**
 * Service Cable Utilities
 * Specification helpers, formatting, and presets for single-phase and three-phase
 * service connections (phase, core count, sq.mm, conductor material, and armouring).
 */

import {
  ServiceCableArmour,
  ServiceCableCore,
  ServiceCableMaterial,
  ServiceCablePhase,
  ServiceCableSpec,
  ServiceCableSqmm,
} from '../types/electrical';

export const DEFAULT_SERVICE_CABLE_SPEC: ServiceCableSpec = {
  phase: '1_phase',
  core: '2_core',
  sizeSqmm: '6',
  material: 'Al',
  armour: 'Unarmoured',
};

export const DEFAULT_3PH_SERVICE_CABLE_SPEC: ServiceCableSpec = {
  phase: '3_phase',
  core: '4_core',
  sizeSqmm: '16',
  material: 'Al',
  armour: 'Armoured',
};

export interface ServiceCablePresetItem {
  id: string;
  name: string;
  description: string;
  spec: ServiceCableSpec;
}

export const SERVICE_CABLE_PRESETS: ServiceCablePresetItem[] = [
  {
    id: '1ph-2c-2.5sqmm',
    name: '1-Ph 2C 2.5 mm² Al',
    description: 'Single Phase 2-Core 2.5 sq.mm Aluminium (Light Domestic / Rural)',
    spec: { phase: '1_phase', core: '2_core', sizeSqmm: '2.5', material: 'Al', armour: 'Unarmoured' },
  },
  {
    id: '1ph-2c-4sqmm',
    name: '1-Ph 2C 4 mm² Al',
    description: 'Single Phase 2-Core 4 sq.mm Aluminium (Standard Domestic 2-4 kW)',
    spec: { phase: '1_phase', core: '2_core', sizeSqmm: '4', material: 'Al', armour: 'Unarmoured' },
  },
  {
    id: '1ph-2c-6sqmm',
    name: '1-Ph 2C 6 mm² Al (WBSEDCL Std)',
    description: 'Single Phase 2-Core 6 sq.mm Aluminium (WBSEDCL Standard Consumer Drop)',
    spec: { phase: '1_phase', core: '2_core', sizeSqmm: '6', material: 'Al', armour: 'Unarmoured' },
  },
  {
    id: '1ph-2c-10sqmm',
    name: '1-Ph 2C 10 mm² Al',
    description: 'Single Phase 2-Core 10 sq.mm Aluminium (Heavy Domestic / AC Load 5-8 kW)',
    spec: { phase: '1_phase', core: '2_core', sizeSqmm: '10', material: 'Al', armour: 'Unarmoured' },
  },
  {
    id: '1ph-2c-4sqmm-cu',
    name: '1-Ph 2C 4 mm² Copper',
    description: 'Single Phase 2-Core 4 sq.mm Copper (Urban / High Reliability)',
    spec: { phase: '1_phase', core: '2_core', sizeSqmm: '4', material: 'Cu', armour: 'Unarmoured' },
  },
  {
    id: '3ph-4c-6sqmm',
    name: '3-Ph 4C 6 mm² Al Armoured',
    description: 'Three Phase 4-Core 6 sq.mm Aluminium Armoured (Small 3-Ph Commercial)',
    spec: { phase: '3_phase', core: '4_core', sizeSqmm: '6', material: 'Al', armour: 'Armoured' },
  },
  {
    id: '3ph-4c-10sqmm',
    name: '3-Ph 4C 10 mm² Al Armoured',
    description: 'Three Phase 4-Core 10 sq.mm Aluminium Armoured (Commercial Establishment)',
    spec: { phase: '3_phase', core: '4_core', sizeSqmm: '10', material: 'Al', armour: 'Armoured' },
  },
  {
    id: '3ph-4c-16sqmm',
    name: '3-Ph 4C 16 mm² Al Armoured (Std 3-Ph)',
    description: 'Three Phase 4-Core 16 sq.mm Aluminium Armoured (Standard 3-Ph Industrial 10-25 kW)',
    spec: { phase: '3_phase', core: '4_core', sizeSqmm: '16', material: 'Al', armour: 'Armoured' },
  },
  {
    id: '3ph-4c-25sqmm',
    name: '3-Ph 4C 25 mm² Al Armoured (Agri Pump)',
    description: 'Three Phase 4-Core 25 sq.mm Aluminium Armoured (Submersible / Agri Pump / Medium Ind.)',
    spec: { phase: '3_phase', core: '4_core', sizeSqmm: '25', material: 'Al', armour: 'Armoured' },
  },
  {
    id: '3ph-4c-35sqmm',
    name: '3-Ph 4C 35 mm² Al Armoured',
    description: 'Three Phase 4-Core 35 sq.mm Aluminium Armoured (Industrial Load 40-60 kW)',
    spec: { phase: '3_phase', core: '4_core', sizeSqmm: '35', material: 'Al', armour: 'Armoured' },
  },
  {
    id: '3ph-4c-50sqmm',
    name: '3-Ph 4C 50 mm² Al Armoured (Bulk)',
    description: 'Three Phase 4-Core 50 sq.mm Aluminium Armoured (Bulk Industrial Consumer Supply)',
    spec: { phase: '3_phase', core: '4_core', sizeSqmm: '50', material: 'Al', armour: 'Armoured' },
  },
];

/**
 * Returns a compact label for drawing canvas & badges (e.g. "1-Ph 2C 6mm²" or "3-Ph 4C 16mm² Arm")
 */
export function formatServiceCableShort(spec?: ServiceCableSpec): string {
  if (!spec) return '1-Ph 2C 6mm²';
  const ph = spec.phase === '3_phase' ? '3-Ph' : '1-Ph';
  const cr = spec.core === '4_core' ? '4C' : spec.core === '3.5_core' ? '3.5C' : '2C';
  const sz = `${spec.sizeSqmm || '6'}mm²`;
  const cu = spec.material === 'Cu' ? ' Cu' : '';
  const arm = spec.armour === 'Armoured' ? ' Arm' : '';
  return `${ph} ${cr} ${sz}${cu}${arm}`;
}

/**
 * Returns an engineering description for BOQ and Title Block
 */
export function formatServiceCableFull(spec?: ServiceCableSpec): string {
  if (!spec) return 'Single Phase 2-Core 6 sq.mm Aluminium PVC Service Cable';
  const ph = spec.phase === '3_phase' ? 'Three Phase' : 'Single Phase';
  const cr = spec.core === '4_core' ? '4-Core' : spec.core === '3.5_core' ? '3.5-Core' : '2-Core';
  const sz = `${spec.sizeSqmm || '6'} sq.mm`;
  const mat = spec.material === 'Cu' ? 'Copper' : 'Aluminium';
  const arm = spec.armour === 'Armoured' ? 'Armoured' : 'Unarmoured';
  const ins = spec.armour === 'Armoured' ? 'XLPE' : 'PVC';
  return `${ph} ${cr} ${sz} ${mat} ${ins} ${arm} Service Cable`;
}

/**
 * Safe normalizer ensuring valid spec object
 */
export function normalizeServiceCableSpec(spec?: Partial<ServiceCableSpec>): ServiceCableSpec {
  const phase: ServiceCablePhase = spec?.phase === '3_phase' ? '3_phase' : '1_phase';
  const core: ServiceCableCore =
    phase === '3_phase'
      ? (spec?.core === '3.5_core' ? '3.5_core' : '4_core')
      : '2_core';

  const validSqmm: ServiceCableSqmm[] = ['2.5', '4', '6', '10', '16', '25', '35', '50'];
  const sizeSqmm: ServiceCableSqmm = validSqmm.includes(spec?.sizeSqmm as any)
    ? (spec!.sizeSqmm as ServiceCableSqmm)
    : (phase === '3_phase' ? '16' : '6');

  const material: ServiceCableMaterial = spec?.material === 'Cu' ? 'Cu' : 'Al';
  const armour: ServiceCableArmour =
    spec?.armour || (phase === '3_phase' ? 'Armoured' : 'Unarmoured');

  return {
    phase,
    core,
    sizeSqmm,
    material,
    armour,
    customSpec: spec?.customSpec,
  };
}

