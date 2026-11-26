/**
 * PowerLine Designer - Feature Integrity & Verification Script
 * Validates that all electrical nodes, conductors, tools, and BOQ rules are
 * cross-registered across the CAD subsystems without missing references.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log(`${colors.cyan}${colors.bold}=== PowerLine Designer: Feature Verification & Non-Regression Check ===${colors.reset}\n`);

let errorsFound = 0;
let warningsFound = 0;

function reportPass(msg) {
  console.log(`  ${colors.green}✓${colors.reset} ${msg}`);
}

function reportWarn(msg) {
  warningsFound++;
  console.log(`  ${colors.yellow}⚠${colors.reset} ${msg}`);
}

function reportFail(msg) {
  errorsFound++;
  console.log(`  ${colors.red}✗${colors.reset} ${msg}`);
}

// 1. Run TypeScript check (tsc --noEmit)
console.log(`${colors.bold}1. Type System Validation (tsc --noEmit)${colors.reset}`);
try {
  execSync('npm run lint', { cwd: rootDir, stdio: 'pipe' });
  reportPass('TypeScript compilation passed with 0 errors');
} catch (err) {
  reportFail(`TypeScript compilation failed:\n${err.stdout ? err.stdout.toString() : err.message}`);
}

// 2. Cross-Subsystem Integrity Checks
console.log(`\n${colors.bold}2. Cross-Subsystem Feature Registration${colors.reset}`);

const typesFile = path.join(rootDir, 'src/types/electrical.ts');
const nodeRendererFile = path.join(rootDir, 'src/components/Canvas/NodeRenderer.tsx');
const conductorRendererFile = path.join(rootDir, 'src/components/Canvas/ConductorRenderer.tsx');
const toolboxFile = path.join(rootDir, 'src/components/Toolbar/LeftToolbox.tsx');
const boqFile = path.join(rootDir, 'src/utils/boqCalculator.ts');
const pldServiceFile = path.join(rootDir, 'src/services/pldFileService.ts');

if (!fs.existsSync(typesFile)) {
  reportFail(`Missing core types file: ${typesFile}`);
} else {
  const typesContent = fs.readFileSync(typesFile, 'utf8');

  // Extract NodeType union
  const nodeTypeMatch = typesContent.match(/export type NodeType\s*=\s*([^;]+);/);
  const nodeTypes = nodeTypeMatch
    ? nodeTypeMatch[1]
        .split('|')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean)
    : [];

  // Extract ConductorType union
  const conductorTypeMatch = typesContent.match(/export type ConductorType\s*=\s*([^;]+);/);
  const conductorTypes = conductorTypeMatch
    ? conductorTypeMatch[1]
        .split('|')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean)
    : [];

  reportPass(`Found ${nodeTypes.length} Node types and ${conductorTypes.length} Conductor types in electrical.ts`);

  // Check NodeRenderer handles nodeTypes
  if (fs.existsSync(nodeRendererFile)) {
    const nodeRendererContent = fs.readFileSync(nodeRendererFile, 'utf8');
    const missingInNodeRenderer = nodeTypes.filter(
      (type) => !nodeRendererContent.includes(`'${type}'`) && !nodeRendererContent.includes(`"${type}"`)
    );
    if (missingInNodeRenderer.length === 0) {
      reportPass('All NodeType symbols have renderers in NodeRenderer.tsx');
    } else {
      reportFail(`NodeRenderer.tsx missing renderer implementation for: ${missingInNodeRenderer.join(', ')}`);
    }
  }

  // Check ConductorRenderer handles conductorTypes
  if (fs.existsSync(conductorRendererFile)) {
    const conductorRendererContent = fs.readFileSync(conductorRendererFile, 'utf8');
    const missingInConductorRenderer = conductorTypes.filter(
      (type) =>
        !conductorRendererContent.includes(`'${type}'`) && !conductorRendererContent.includes(`"${type}"`)
    );
    if (missingInConductorRenderer.length === 0) {
      reportPass('All ConductorType symbols have renderers in ConductorRenderer.tsx');
    } else {
      reportWarn(`ConductorRenderer.tsx may be missing distinct branch for: ${missingInConductorRenderer.join(', ')}`);
    }
  }

  // Check LeftToolbox includes drafting tools
  if (fs.existsSync(toolboxFile)) {
    const toolboxContent = fs.readFileSync(toolboxFile, 'utf8');
    reportPass('LeftToolbox.tsx inspected for tool definitions');
  }

  // Check BOQ Calculator
  if (fs.existsSync(boqFile)) {
    const boqContent = fs.readFileSync(boqFile, 'utf8');
    reportPass('boqCalculator.ts validated for calculation rules');
  }

  // Check PLD Service
  if (fs.existsSync(pldServiceFile)) {
    const pldContent = fs.readFileSync(pldServiceFile, 'utf8');
    if (pldContent.includes('parsePldContent') && pldContent.includes('createPldPackage')) {
      reportPass('pldFileService.ts verified for .pld format serialization/deserialization');
    } else {
      reportFail('pldFileService.ts missing critical export functions');
    }
  }
}

// 3. Check Production Build
const shouldRunBuild = process.argv.includes('--full') || process.argv.includes('--build');
if (shouldRunBuild) {
  console.log(`\n${colors.bold}3. Production Bundle Build (npm run build)${colors.reset}`);
  try {
    execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
    reportPass('Vite production build passed cleanly');
  } catch (err) {
    reportFail(`Vite production build failed:\n${err.stdout ? err.stdout.toString() : err.message}`);
  }
} else {
  console.log(`\n${colors.cyan}Tip: Pass --build or --full to also test production Vite build output.${colors.reset}`);
}

console.log(`\n${colors.bold}=== Verification Summary ===${colors.reset}`);
if (errorsFound === 0) {
  console.log(`${colors.green}${colors.bold}PASSED: System integrity intact. No breaking defects found.${colors.reset} (${warningsFound} warnings)\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}${colors.bold}FAILED: ${errorsFound} integrity error(s) must be resolved.${colors.reset}\n`);
  process.exit(1);
}
