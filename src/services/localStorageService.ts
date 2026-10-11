/**
 * Dedicated Local Storage Service for PowerLine Designer
 * 100% Client-Side Persistent Storage:
 * - Active project autosave & instant recovery
 * - Multi-drawing project catalog (create, save, duplicate, delete, switch)
 * - JSON project export & import backup
 * - Custom CAD tool definitions persistence
 */

import { DrawingProject } from '../types/electrical';

export const STORAGE_KEY_ACTIVE = 'powerline_designer_active_project';
export const STORAGE_KEY_CATALOG = 'powerline_designer_saved_projects_catalog';
export const STORAGE_KEY_TEMPLATES = 'powerline_designer_templates';

export function createBlankDrawing(): DrawingProject {
  const now = new Date().toISOString();
  return {
    id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'New Drawing',
    version: 1,
    createdAt: now,
    updatedAt: now,
    metadata: {
      title: '',
      drawingNo: '',
      applicationNo: '',
      poNumber: '',
      agencyName: '',
      cccName: '',
      divisionName: '',
      workOrderNo: '',
      projectName: '',
      applicantName: '',
      applicantAddress: '',
      applicantPhone: '',
      location: '',
      coordinates: '',
      subDivision: '',
      preparedBy: '',
      checkedBy: '',
      approvedBy: '',
      preparedByOffice: '',
      checkedByOffice: '',
      approvedByOffice: '',
      date: new Date().toLocaleDateString('en-GB'),
      revision: '',
      scale: '',
      sheetSize: 'A4',
      orientation: 'landscape',
    },
    nodes: [],
    edges: [],
    stays: [],
    crossings: [],
    annotations: [],
    mapRoadOutlines: [],
    customBoqOverrides: {},
  };
}

export function getSavedTemplates(): DrawingProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((template) => template && typeof template.id === 'string')) {
      return parsed as DrawingProject[];
    }
    throw new Error('Saved template library has an invalid format.');
  } catch (error) {
    console.error('Failed to load saved templates:', error);
    return [];
  }
}

export function saveProjectAsTemplate(project: DrawingProject): { success: boolean; message: string } {
  try {
    const templates = getSavedTemplates();
    const template: DrawingProject = {
      ...project,
      id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify([template, ...templates]));
    return { success: true, message: `Saved "${project.title}" as a template.` };
  } catch (error) {
    console.error('Failed to save drawing as template:', error);
    return { success: false, message: 'Could not save template. Browser storage may be full or unavailable.' };
  }
}

export function deleteSavedTemplate(templateId: string): { success: boolean; message: string } {
  try {
    const templates = getSavedTemplates().filter((template) => template.id !== templateId);
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
    return { success: true, message: 'Template deleted.' };
  } catch (error) {
    console.error('Failed to delete saved template:', error);
    return { success: false, message: 'Could not delete template.' };
  }
}

/**
 * Load the active project from localStorage or return default template
 */
export function loadActiveProject(): DrawingProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.nodes) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load active project from localStorage:', e);
  }
  return createBlankDrawing();
}

/**
 * Save current active project to localStorage
 */
export function saveActiveProject(project: DrawingProject): void {
  try {
    const updated = {
      ...project,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(updated));

    // Also update catalog copy if it exists
    updateProjectInCatalog(updated);
  } catch (e) {
    console.error('Failed to save active project to localStorage:', e);
  }
}

/**
 * Get all drawings stored in the catalog
 */
export function getSavedProjectsCatalog(): DrawingProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOG);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (e) {
    console.error('Failed to load project catalog:', e);
  }

  // If empty, initialize catalog with active project or default template
  const initial = [loadActiveProject()];
  try {
    localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(initial));
  } catch {}
  return initial;
}

/**
 * Save or update project in the saved drawings catalog
 */
export function saveProjectToCatalog(project: DrawingProject): { success: boolean; message: string } {
  try {
    const catalog = getSavedProjectsCatalog();
    const existingIndex = catalog.findIndex((p) => p.id === project.id);

    const updatedProject = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      catalog[existingIndex] = updatedProject;
    } else {
      catalog.unshift(updatedProject);
    }

    localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(catalog));
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(updatedProject));

    return {
      success: true,
      message: `Drawing "${project.title}" saved successfully to Local Storage!`,
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Failed to save to local storage: ${e?.message || 'Storage quota exceeded'}`,
    };
  }
}

/**
 * Internal helper to update catalog
 */
function updateProjectInCatalog(project: DrawingProject): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOG);
    if (!raw) return;
    const catalog: DrawingProject[] = JSON.parse(raw);
    const idx = catalog.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      catalog[idx] = project;
      localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(catalog));
    }
  } catch {}
}

/**
 * Delete a project from catalog
 */
export function deleteProjectFromCatalog(projectId: string): { success: boolean; message: string } {
  try {
    let catalog = getSavedProjectsCatalog();
    catalog = catalog.filter((p) => p.id !== projectId);
    localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(catalog));
    return { success: true, message: 'Drawing removed from local storage.' };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Delete failed.' };
  }
}

/**
 * Duplicate a saved drawing
 */
export function duplicateProjectInCatalog(projectId: string): DrawingProject | null {
  try {
    const catalog = getSavedProjectsCatalog();
    const target = catalog.find((p) => p.id === projectId);
    if (!target) return null;

    const newId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const copy: DrawingProject = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
      metadata: {
        ...target.metadata,
        title: `${target.metadata.title || target.title} (Copy)`,
        drawingNo: `${target.metadata.drawingNo || 'DWG'}-COPY`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    catalog.unshift(copy);
    localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(catalog));
    return copy;
  } catch (e) {
    console.error('Failed to duplicate project:', e);
    return null;
  }
}

/**
 * Export project as a JSON backup file download
 */
export function exportProjectAsJson(project: DrawingProject): void {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safeName = (project.metadata.title || project.title || 'powerline-drawing')
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '_');

  link.href = url;
  link.download = `${safeName}_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import project from a JSON backup file
 */
export function importProjectFromJson(file: File): Promise<DrawingProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed || !parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error('Invalid PowerLine Designer project file format.');
        }

        // Assign unique ID to prevent collisions
        const imported: DrawingProject = {
          ...parsed,
          id: `imported-${Date.now()}`,
          title: parsed.title ? `[Imported] ${parsed.title}` : 'Imported Electrical Drawing',
          updatedAt: new Date().toISOString(),
        };

        saveProjectToCatalog(imported);
        resolve(imported);
      } catch (err: any) {
        reject(new Error(err?.message || 'Could not parse JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsText(file);
  });
}
