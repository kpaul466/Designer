/**
 * PowerLine Drawing (.pld) File Format & Service
 *
 * Dedicated stateful file extension (.pld) for PowerLine Designer.
 * Preserves complete drawing model, metadata, nodes, edges, stays, crossings,
 * annotations, BOQ custom overrides, geo-reference, and exact canvas viewport
 * state (zoom, panX, panY).
 */

import { DrawingProject } from '../types/electrical';
import { saveProjectToCatalog } from './localStorageService';

export const PLD_FILE_EXTENSION = '.pld';
export const PLD_MIME_TYPE = 'application/x-powerline-designer';
export const APP_VERSION = '2.4.0';

export interface PldViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface PldFilePackage {
  $schema?: string;
  format: 'powerline-drawing';
  extension: '.pld';
  version: '1.0.0';
  generator: string;
  appVersion: string;
  savedAt: string;
  viewport?: PldViewportState;
  project: DrawingProject;
}

/**
 * Sanitizes drawing title for safe filename
 */
export function getSafePldFileName(project: DrawingProject): string {
  const baseTitle = project.metadata?.title?.trim() || project.title?.trim() || 'powerline_drawing';
  const sanitized = baseTitle
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `${sanitized || 'powerline_drawing'}${PLD_FILE_EXTENSION}`;
}

/**
 * Creates a structured .pld package containing full project and viewport state
 */
export function createPldPackage(
  project: DrawingProject,
  viewport?: PldViewportState
): PldFilePackage {
  return {
    $schema: 'https://powerline-designer.app/schema/v1.json',
    format: 'powerline-drawing',
    extension: '.pld',
    version: '1.0.0',
    generator: `PowerLine Designer v${APP_VERSION}`,
    appVersion: APP_VERSION,
    savedAt: new Date().toISOString(),
    viewport: viewport ? { ...viewport } : undefined,
    project: {
      ...project,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Exports drawing project and canvas viewport state as a .pld file.
 * Uses native File System Access API (showSaveFilePicker) if available,
 * Electron native save dialog if in Electron, or standard file download.
 */
export async function exportProjectAsPld(
  project: DrawingProject,
  viewport?: PldViewportState
): Promise<{ success: boolean; filename: string; message: string }> {
  const defaultFilename = getSafePldFileName(project);
  const pldData = createPldPackage(project, viewport);
  const jsonContent = JSON.stringify(pldData, null, 2);

  // Check if running in Electron with electronAPI
  if (typeof window !== 'undefined' && (window as any).electronAPI?.savePldFile) {
    try {
      const result = await (window as any).electronAPI.savePldFile(jsonContent, defaultFilename);
      if (result.success) {
        return {
          success: true,
          filename: result.filePath || defaultFilename,
          message: `Drawing saved as .pld file: ${result.filePath || defaultFilename}`,
        };
      }
      if (result.canceled) {
        return { success: false, filename: defaultFilename, message: 'Save cancelled.' };
      }
    } catch (e: any) {
      console.warn('Electron save failed, falling back to browser download:', e);
    }
  }

  // Modern browser File System Access API (allows picking save location in local drive / cloud drive)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: defaultFilename,
        types: [
          {
            description: 'PowerLine Drawing (*.pld)',
            accept: {
              [PLD_MIME_TYPE]: ['.pld'],
              'application/json': ['.pld', '.json'],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(jsonContent);
      await writable.close();

      return {
        success: true,
        filename: handle.name || defaultFilename,
        message: `Saved "${handle.name || defaultFilename}" to drive with full state.`,
      };
    } catch (err: any) {
      // User cancelled picker
      if (err.name === 'AbortError') {
        return { success: false, filename: defaultFilename, message: 'Save cancelled.' };
      }
      console.warn('showSaveFilePicker failed, falling back to download:', err);
    }
  }

  // Universal browser fallback: Blob download
  try {
    const blob = new Blob([jsonContent], { type: PLD_MIME_TYPE });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      filename: defaultFilename,
      message: `Downloaded "${defaultFilename}". Open it anytime in PowerLine Designer to resume state.`,
    };
  } catch (err: any) {
    return {
      success: false,
      filename: defaultFilename,
      message: `Failed to save .pld file: ${err?.message || 'Unknown error'}`,
    };
  }
}

export interface ParsedPldResult {
  project: DrawingProject;
  viewport?: PldViewportState;
  sourceVersion?: string;
  savedAt?: string;
}

/**
 * Validates and parses raw text or JSON object as a .pld package or legacy .json drawing
 */
export function parsePldContent(content: string): ParsedPldResult {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e: any) {
    throw new Error('File content is not valid JSON/PLD format.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file structure.');
  }

  // Case A: Structured .pld package
  if (parsed.format === 'powerline-drawing' && parsed.project) {
    const proj = parsed.project;
    if (!proj.nodes || !Array.isArray(proj.nodes)) {
      throw new Error('Corrupt .pld file: missing nodes array.');
    }

    const validatedProject: DrawingProject = {
      ...proj,
      id: proj.id || `project-${Date.now()}`,
      title: proj.title || 'PowerLine Drawing',
      metadata: {
        title: proj.metadata?.title || proj.title || 'PowerLine Drawing',
        drawingNo: proj.metadata?.drawingNo || '',
        applicationNo: proj.metadata?.applicationNo || '',
        poNumber: proj.metadata?.poNumber || '',
        agencyName: proj.metadata?.agencyName || '',
        cccName: proj.metadata?.cccName || '',
        divisionName: proj.metadata?.divisionName || '',
        workOrderNo: proj.metadata?.workOrderNo || '',
        projectName: proj.metadata?.projectName || '',
        applicantName: proj.metadata?.applicantName || '',
        applicantAddress: proj.metadata?.applicantAddress || '',
        applicantPhone: proj.metadata?.applicantPhone || '',
        location: proj.metadata?.location || '',
        coordinates: proj.metadata?.coordinates || '',
        subDivision: proj.metadata?.subDivision || '',
        preparedBy: proj.metadata?.preparedBy || '',
        checkedBy: proj.metadata?.checkedBy || '',
        approvedBy: proj.metadata?.approvedBy || '',
        preparedByOffice: proj.metadata?.preparedByOffice || '',
        checkedByOffice: proj.metadata?.checkedByOffice || '',
        approvedByOffice: proj.metadata?.approvedByOffice || '',
        date: proj.metadata?.date || new Date().toLocaleDateString('en-GB'),
        revision: proj.metadata?.revision || '',
        scale: proj.metadata?.scale || '',
        sheetSize: proj.metadata?.sheetSize || 'A4',
        orientation: proj.metadata?.orientation || 'landscape',
        workType: proj.metadata?.workType || 'new_work',
      },
      nodes: Array.isArray(proj.nodes) ? proj.nodes : [],
      edges: Array.isArray(proj.edges) ? proj.edges : [],
      stays: Array.isArray(proj.stays) ? proj.stays : [],
      crossings: Array.isArray(proj.crossings) ? proj.crossings : [],
      annotations: Array.isArray(proj.annotations) ? proj.annotations : [],
      mapRoadOutlines: Array.isArray(proj.mapRoadOutlines) ? proj.mapRoadOutlines : [],
      customBoqOverrides: proj.customBoqOverrides || {},
      updatedAt: new Date().toISOString(),
    };

    saveProjectToCatalog(validatedProject);

    return {
      project: validatedProject,
      viewport: parsed.viewport,
      sourceVersion: parsed.appVersion || parsed.version,
      savedAt: parsed.savedAt,
    };
  }

  // Case B: Direct DrawingProject JSON (legacy / backup format)
  if (parsed.nodes && Array.isArray(parsed.nodes)) {
    const validatedProject: DrawingProject = {
      ...parsed,
      id: parsed.id || `project-${Date.now()}`,
      title: parsed.title || 'PowerLine Drawing',
      metadata: {
        title: parsed.metadata?.title || parsed.title || 'PowerLine Drawing',
        drawingNo: parsed.metadata?.drawingNo || '',
        applicationNo: parsed.metadata?.applicationNo || '',
        poNumber: parsed.metadata?.poNumber || '',
        agencyName: parsed.metadata?.agencyName || '',
        cccName: parsed.metadata?.cccName || '',
        divisionName: parsed.metadata?.divisionName || '',
        workOrderNo: parsed.metadata?.workOrderNo || '',
        projectName: parsed.metadata?.projectName || '',
        applicantName: parsed.metadata?.applicantName || '',
        applicantAddress: parsed.metadata?.applicantAddress || '',
        applicantPhone: parsed.metadata?.applicantPhone || '',
        location: parsed.metadata?.location || '',
        coordinates: parsed.metadata?.coordinates || '',
        subDivision: parsed.metadata?.subDivision || '',
        preparedBy: parsed.metadata?.preparedBy || '',
        checkedBy: parsed.metadata?.checkedBy || '',
        approvedBy: parsed.metadata?.approvedBy || '',
        preparedByOffice: parsed.metadata?.preparedByOffice || '',
        checkedByOffice: parsed.metadata?.checkedByOffice || '',
        approvedByOffice: parsed.metadata?.approvedByOffice || '',
        date: parsed.metadata?.date || new Date().toLocaleDateString('en-GB'),
        revision: parsed.metadata?.revision || '',
        scale: parsed.metadata?.scale || '',
        sheetSize: parsed.metadata?.sheetSize || 'A4',
        orientation: parsed.metadata?.orientation || 'landscape',
        workType: parsed.metadata?.workType || 'new_work',
      },
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      stays: Array.isArray(parsed.stays) ? parsed.stays : [],
      crossings: Array.isArray(parsed.crossings) ? parsed.crossings : [],
      annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
      mapRoadOutlines: Array.isArray(parsed.mapRoadOutlines) ? parsed.mapRoadOutlines : [],
      customBoqOverrides: parsed.customBoqOverrides || {},
      updatedAt: new Date().toISOString(),
    };

    saveProjectToCatalog(validatedProject);

    return {
      project: validatedProject,
      viewport: undefined,
      sourceVersion: 'legacy',
    };
  }

  throw new Error('Selected file does not appear to be a PowerLine Drawing (.pld or .json).');
}

/**
 * Reads a File from disk and returns parsed drawing and viewport
 */
export async function readPldFile(file: File): Promise<ParsedPldResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const res = parsePldContent(text);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsText(file);
  });
}

/**
 * Opens a native file picker dialog for .pld and .json files
 */
export async function promptOpenPldFile(): Promise<ParsedPldResult | null> {
  // Check Electron dialog first
  if (typeof window !== 'undefined' && (window as any).electronAPI?.openPldDialog) {
    try {
      const electronRes = await (window as any).electronAPI.openPldDialog();
      if (electronRes && electronRes.content) {
        return parsePldContent(electronRes.content);
      }
      return null;
    } catch (e) {
      console.warn('Electron open dialog failed, falling back to HTML input:', e);
    }
  }

  // Modern File System Access API
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'PowerLine Drawing Files (*.pld, *.json)',
            accept: {
              [PLD_MIME_TYPE]: ['.pld'],
              'application/json': ['.pld', '.json'],
            },
          },
        ],
        multiple: false,
      });
      if (handle) {
        const file = await handle.getFile();
        return await readPldFile(file);
      }
      return null;
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      console.warn('showOpenFilePicker failed, falling back to input:', err);
    }
  }

  // HTML <input type="file"> fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pld,.json,application/json,application/x-powerline-designer';
    input.style.display = 'none';

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          const res = await readPldFile(file);
          resolve(res);
        } catch (err: any) {
          alert(`Error opening file: ${err.message || 'Invalid format'}`);
          resolve(null);
        }
      } else {
        resolve(null);
      }
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  });
}

