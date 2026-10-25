/**
 * PowerLine Designer — Main Application Component
 * 100% Client-Side Offline CAD Architecture:
 * - LocalStorage Persistence & Multi-Drawing Project Catalog (Open, Save, Duplicate, Delete, Import/Export JSON)
 * - GIS Map Underlay & Overlay (OpenStreetMap)
 * - Flexible Canvas Sheet Placement on Map (Resizable bounds, Drag anywhere on map, Snap to searched location)
 * - Precision CAD Vector Engine & Full Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+C, Ctrl+V, Del, etc.)
 * - Automated Electrical Bill of Quantities (BOQ) Schedule with Schedule of Rates (SOR)
 * - Engineering Title Block & ISO 216 A4 Landscape PDF Export
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Wrench, X } from 'lucide-react';
import {
  ActiveTool,
  CustomToolDefinition,
  DrawingProject,
  MapFeatureSelection,
  MapRoadCandidate,
  MapSettings,
  ProjectMetadata,
  RoadLineStyle,
  SelectedItem,
  SheetSizeType,
} from './types/electrical';
import {
  ALL_PAGE_SIZES,
  PAGE_SIZE_DEFINITIONS,
  getCanvasBoundsForPageSize,
} from './constants/pageSizes';
import { DrawingCanvas } from './components/Canvas/DrawingCanvas';
import { LeftToolbox } from './components/Toolbar/LeftToolbox';
import { StatusBar } from './components/Toolbar/StatusBar';
import { TopBar } from './components/Toolbar/TopBar';
import { BoqPanel } from './components/Panels/BoqPanel';
import { CustomToolModal } from './components/Panels/CustomToolModal';
import { ExportModal } from './components/Panels/ExportModal';
import { KeyboardShortcutsModal } from './components/Panels/KeyboardShortcutsModal';
import { ProjectSetupModal } from './components/Panels/ProjectSetupModal';
import { PropertyInspector } from './components/Panels/PropertyInspector';
import { TemplatePickerModal } from './components/Panels/TemplatePickerModal';
import { TitleBlockModal } from './components/Panels/TitleBlockModal';
import { SavedProjectsModal } from './components/Panels/SavedProjectsModal';
import { NewDrawingModal } from './components/Panels/NewDrawingModal';
import { AboutDeveloperModal } from './components/Panels/AboutDeveloperModal';
import { AppVersionModal } from './components/Panels/AppVersionModal';
import { UpdateNotificationBanner } from './components/Toolbar/UpdateNotificationBanner';
import {
  createBlankDrawing,
  deleteProjectFromCatalog,
  deleteSavedTemplate,
  getSavedTemplates,
  loadActiveProject,
  saveActiveProject,
  saveProjectToCatalog,
  getSavedProjectsCatalog,
} from './services/localStorageService';
import {
  exportProjectAsPld,
  promptOpenPldFile,
  parsePldContent,
  readPldFile,
} from './services/pldFileService';
import { prefetchWbGeoPlaces } from './utils/wbGeoPlaces';

interface ClipboardData {
  nodes: DrawingProject['nodes'];
  edges: DrawingProject['edges'];
  stays: DrawingProject['stays'];
  crossings: DrawingProject['crossings'];
}

export default function App() {
  // Load saved project from browser LocalStorage
  const [project, setProject] = useState<DrawingProject>(() => loadActiveProject());

  // History Stack for Undo / Redo
  const [history, setHistory] = useState<DrawingProject[]>([project]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active Tool & Multi-Selection
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedEntities, setSelectedEntities] = useState<SelectedItem[]>([]);

  // Clipboard for Copy / Paste / Duplicate / Cut
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  // Viewport transformation
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(100);
  const [panY, setPanY] = useState<number>(50);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // CAD Grid & Snap settings
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [gridType, setGridType] = useState<'dots' | 'lines'>('lines');
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [isDarkCanvas, setIsDarkCanvas] = useState<boolean>(false);

  // Tool attribute defaults (shared by the ribbon and the canvas road tools)
  const [roadLineStyle, setRoadLineStyle] = useState<RoadLineStyle>('double');
  const [roadWidth, setRoadWidth] = useState<number>(16);

  // GIS Map Layer
  const [showMap, setShowMap] = useState<boolean>(project.mapSettings?.visible ?? false);
  const [mapOpacity, setMapOpacity] = useState<number>(project.mapSettings?.opacity ?? 100);
  const [mapLocked, setMapLocked] = useState<boolean>(project.mapSettings?.isLocked ?? true);
  const [mapLayerPosition, setMapLayerPosition] = useState<'underlay' | 'overlay'>(
    project.mapSettings?.layerPosition ?? 'underlay'
  );
  const [printIncludeMap, setPrintIncludeMap] = useState<boolean>(
    project.mapSettings?.printIncludeMap ?? false
  );
  const [printMapOpacity, setPrintMapOpacity] = useState<number>(
    project.mapSettings?.printMapOpacity ?? project.mapSettings?.opacity ?? 100
  );
  const [mapFeatures, setMapFeatures] = useState<MapFeatureSelection>({
    roads: true,
    rivers: true,
    streetNames: true,
    placeNames: true,
    crossings: true,
    wbPlaces: true,
    ...project.mapSettings?.features,
  });
  const [availableMapRoads, setAvailableMapRoads] = useState<MapRoadCandidate[]>([]);
  const [selectedMapRoads, setSelectedMapRoads] = useState<MapRoadCandidate[]>([]);
  useEffect(() => {
    setShowMap(project.mapSettings?.visible ?? false);
    setMapOpacity(project.mapSettings?.opacity ?? 100);
    setMapLocked(project.mapSettings?.isLocked ?? true);
    setMapLayerPosition(project.mapSettings?.layerPosition ?? 'underlay');
    setPrintIncludeMap(project.mapSettings?.printIncludeMap ?? false);
    setPrintMapOpacity(project.mapSettings?.printMapOpacity ?? project.mapSettings?.opacity ?? 100);
    setMapFeatures({
      roads: true,
      rivers: true,
      streetNames: true,
      placeNames: true,
      crossings: true,
      wbPlaces: true,
      ...project.mapSettings?.features,
    });
  }, [project.id, project.mapSettings]);
  useEffect(() => {
    setAvailableMapRoads([]);
    setSelectedMapRoads([]);
  }, [project.id]);

  // Mobile / tablet CAD tool drawer.
  const [isToolDrawerOpen, setIsToolDrawerOpen] = useState<boolean>(false);

  // The CAD tool drawer is only used below the desktop breakpoint.
  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const handleBreakpointChange = () => {
      if (desktopQuery.matches) setIsToolDrawerOpen(false);
    };
    desktopQuery.addEventListener('change', handleBreakpointChange);
    return () => desktopQuery.removeEventListener('change', handleBreakpointChange);
  }, []);

  // Modals & Panels
  const [isBoqOpen, setIsBoqOpen] = useState<boolean>(true);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isProjectSetupOpen, setIsProjectSetupOpen] = useState<boolean>(false);
  const [isTitleBlockOpen, setIsTitleBlockOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [openOutputSettings, setOpenOutputSettings] = useState<boolean>(false);
  const [isCustomToolModalOpen, setIsCustomToolModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isSavedProjectsOpen, setIsSavedProjectsOpen] = useState<boolean>(false);
  const [isNewDrawingPromptOpen, setIsNewDrawingPromptOpen] = useState<boolean>(false);
  const [isAboutDeveloperOpen, setIsAboutDeveloperOpen] = useState<boolean>(false);
  const [isAppVersionOpen, setIsAppVersionOpen] = useState<boolean>(false);
  const [isDraggingFileOver, setIsDraggingFileOver] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Warm the West Bengal land database as soon as the app opens: the first
  // visit downloads + indexes it once and stores it in IndexedDB; every later
  // page load reads the search index straight from IndexedDB.
  useEffect(() => {
    prefetchWbGeoPlaces();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleMapLock = () => {
    const nextLocked = !mapLocked;
    setMapLocked(nextLocked);
    updateSavedMapSettings({ isLocked: nextLocked });
    showToast(nextLocked ? 'Map view locked to this drawing' : 'Map view unlocked for editing');
  };

  // Push new project state to history and persist to LocalStorage
  const handleUpdateProject = useCallback(
    (newProject: DrawingProject, pushHistory: boolean = true) => {
      setProject(newProject);
      saveActiveProject(newProject);

      if (pushHistory) {
        setHistory((prev) => {
          const updated = prev.slice(0, historyIndex + 1);
          return [...updated, newProject];
        });
        setHistoryIndex((prev) => prev + 1);
      }
    },
    [historyIndex]
  );

  const handleOpenNewDrawingPrompt = () => {
    setIsSavedProjectsOpen(false);
    setIsTemplatesOpen(false);
    setIsNewDrawingPromptOpen(true);
  };

  const initNewDrawing = () => {
    const newProject = createBlankDrawing();
    saveActiveProject(newProject);
    setProject(newProject);
    setHistory([newProject]);
    setHistoryIndex(0);
    setSelectedEntities([]);
    setClipboard(null);
    setActiveTool('select');
    setZoom(1);
    setPanX(100);
    setPanY(50);
    setIsSavedProjectsOpen(false);
    setIsTemplatesOpen(false);
    setIsNewDrawingPromptOpen(false);
    setIsProjectSetupOpen(true);
  };

  const handleSaveAndCreateNew = () => {
    saveProjectToCatalog(project);
    initNewDrawing();
    showToast('Saved current drawing to catalog. Opening project setup for new drawing.');
  };

  const handleDiscardAndCreateNew = () => {
    initNewDrawing();
    showToast('Previous changes discarded. Opening project setup for new drawing.');
  };

  const handleDeleteAndCreateNew = () => {
    deleteProjectFromCatalog(project.id);
    initNewDrawing();
    showToast('Previous drawing deleted from catalog. Opening project setup for new drawing.');
  };

  const handleLoadProjectWithState = useCallback(
    (loadedProject: DrawingProject, viewport?: { zoom: number; panX: number; panY: number }) => {
      saveActiveProject(loadedProject);
      setProject(loadedProject);
      setHistory([loadedProject]);
      setHistoryIndex(0);
      setSelectedEntities([]);
      setClipboard(null);
      if (viewport) {
        if (typeof viewport.zoom === 'number') setZoom(viewport.zoom);
        if (typeof viewport.panX === 'number') setPanX(viewport.panX);
        if (typeof viewport.panY === 'number') setPanY(viewport.panY);
      }
      showToast(`Loaded: ${loadedProject.title}`);
    },
    []
  );

  const handleSavePldFile = useCallback(async () => {
    try {
      const res = await exportProjectAsPld(project, { zoom, panX, panY });
      if (res.success) {
        showToast(res.message);
      }
    } catch (err: any) {
      showToast(`Save failed: ${err?.message || 'Error'}`);
    }
  }, [project, zoom, panX, panY]);

  const handleOpenPldFile = useCallback(async () => {
    try {
      const res = await promptOpenPldFile();
      if (res) {
        handleLoadProjectWithState(res.project, res.viewport);
      }
    } catch (err: any) {
      showToast(`Open failed: ${err?.message || 'Error'}`);
    }
  }, [handleLoadProjectWithState]);

  const handleLoadTemplate = (template: DrawingProject) => {
    const now = new Date().toISOString();
    const newProject: DrawingProject = {
      ...JSON.parse(JSON.stringify(template)) as DrawingProject,
      id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    // Session-active only until the user presses "Save" — same rule as the
    // blank "New" drawing, so templates don't silently fill the catalog.
    saveActiveProject(newProject);
    setProject(newProject);
    setHistory([newProject]);
    setHistoryIndex(0);
    setSelectedEntities([]);
    setClipboard(null);
    setActiveTool('select');
    setIsTemplatesOpen(false);
    showToast(`Created drawing from template: ${newProject.title}`);
  };

  const updateSavedMapSettings = (changes: Partial<MapSettings>) => {
    const mapSettings: MapSettings = {
      visible: showMap,
      opacity: mapOpacity,
      mapType: 'osm',
      zoomLevel: project.mapSettings?.zoomLevel ?? 16,
      scale: project.mapSettings?.scale ?? 1,
      sizeMode: project.mapSettings?.sizeMode ?? 'canvas_fit',
      isLocked: mapLocked,
      layerPosition: mapLayerPosition,
      printIncludeMap,
      printMapOpacity,
      features: mapFeatures,
      pinnedPlaces: project.mapSettings?.pinnedPlaces,
      activePlace: project.mapSettings?.activePlace ?? null,
      ...changes,
    };
    handleUpdateProject({
      ...project,
      mapSettings,
      updatedAt: new Date().toISOString(),
    }, false);
  };

  const handleToggleMap = () => {
    const visible = !showMap;
    setShowMap(visible);
    updateSavedMapSettings({ visible });
  };

  const handleMapVisibilityChange = (visible: boolean) => {
    setShowMap(visible);
    updateSavedMapSettings({ visible });
  };

  const handleMapOpacityChange = (opacity: number) => {
    setMapOpacity(opacity);
    updateSavedMapSettings({ opacity });
  };

  const handleMapFeatureChange = (key: keyof MapFeatureSelection, enabled: boolean) => {
    const features = { ...mapFeatures, [key]: enabled };
    setMapFeatures(features);
    updateSavedMapSettings({ features });
  };

  const handleToggleMapLayerPosition = () => {
    const layerPosition = mapLayerPosition === 'underlay' ? 'overlay' : 'underlay';
    setMapLayerPosition(layerPosition);
    updateSavedMapSettings({ layerPosition });
  };

  const handlePrintIncludeMapChange = (include: boolean) => {
    setPrintIncludeMap(include);
    updateSavedMapSettings({ printIncludeMap: include });
    showToast(
      include
        ? 'Map will be included in PDF and printed sheets'
        : 'Map hidden from PDF and printed sheets'
    );
  };

  const handlePrintMapOpacityChange = (opacity: number) => {
    const clamped = Math.min(100, Math.max(10, Math.round(opacity)));
    setPrintMapOpacity(clamped);
    updateSavedMapSettings({ printMapOpacity: clamped });
  };

  const handleToggleMapRoadSelection = (road: MapRoadCandidate) => {
    setSelectedMapRoads((current) =>
      current.some((selected) => selected.id === road.id)
        ? current.filter((selected) => selected.id !== road.id)
        : [...current, road]
    );
  };

  const handleAddSelectedMapRoads = () => {
    const existingSources = new Set((project.mapRoadOutlines || []).map((road) => road.sourceId));
    const selectedRoadsToAdd = selectedMapRoads.filter((road) => !existingSources.has(road.id));
    if (selectedRoadsToAdd.length === 0) {
      showToast('Selected streets are already on the canvas');
      return;
    }
    const roadOutlines = selectedRoadsToAdd.map((road) => ({
      ...road,
      id: `map-road-${road.id}`,
      sourceId: road.id,
      name: road.name,
      points: road.points.map((point) => ({ ...point })),
    }));
    handleUpdateProject({
      ...project,
      mapRoadOutlines: [
        ...(project.mapRoadOutlines || []),
        ...roadOutlines,
      ],
      updatedAt: new Date().toISOString(),
    });
    setSelectedEntities(roadOutlines.map(({ id }) => ({ type: 'mapRoad', id })));
    setSelectedMapRoads([]);
    showToast(`Added ${selectedRoadsToAdd.length} street outline(s) to the canvas`);
  };

  // Add Custom Tool definition
  const handleAddCustomTool = useCallback(
    (newTool: CustomToolDefinition) => {
      const updatedCustom = [...(project.customTools || []), newTool];
      handleUpdateProject({
        ...project,
        customTools: updatedCustom,
        updatedAt: new Date().toISOString(),
      });
      setActiveTool(newTool.id as ActiveTool);
      showToast(`Custom tool '${newTool.name}' created and activated!`);
    },
    [project, handleUpdateProject]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevProject = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setProject(prevProject);
      saveActiveProject(prevProject);
      setSelectedEntities([]);
      showToast('Undo');
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextProject = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setProject(nextProject);
      saveActiveProject(nextProject);
      setSelectedEntities([]);
      showToast('Redo');
    }
  }, [historyIndex, history]);

  // Delete all selected entities
  const handleDeleteSelected = useCallback(() => {
    if (selectedEntities.length === 0) return;

    const selectedIds = new Set(selectedEntities.map((e) => e.id));

    const updatedNodes = project.nodes.filter((n) => !selectedIds.has(n.id));
    const remainingNodeIds = new Set(updatedNodes.map((n) => n.id));

    // Remove edges that were either selected or whose endpoints were deleted
    const updatedEdges = project.edges.filter(
      (e) =>
        !selectedIds.has(e.id) &&
        remainingNodeIds.has(e.fromNodeId) &&
        remainingNodeIds.has(e.toNodeId)
    );

    // Remove stays that were either selected or whose pole was deleted
    const updatedStays = project.stays.filter(
      (s) => !selectedIds.has(s.id) && remainingNodeIds.has(s.poleId)
    );

    const updatedCrossings = project.crossings.filter((c) => !selectedIds.has(c.id));
    const updatedAnnotations = project.annotations.filter((a) => !selectedIds.has(a.id));
    const updatedMapRoadOutlines = (project.mapRoadOutlines || []).filter((road) => !selectedIds.has(road.id));

    handleUpdateProject({
      ...project,
      nodes: updatedNodes,
      edges: updatedEdges,
      stays: updatedStays,
      crossings: updatedCrossings,
      annotations: updatedAnnotations,
      mapRoadOutlines: updatedMapRoadOutlines,
      updatedAt: new Date().toISOString(),
    });

    showToast(`Deleted ${selectedEntities.length} item(s)`);
    setSelectedEntities([]);
  }, [selectedEntities, project, handleUpdateProject]);

  // Copy selected entities to clipboard
  const handleCopy = useCallback(() => {
    if (selectedEntities.length === 0) return;
    const selectedIds = new Set(selectedEntities.map((e) => e.id));

    const copiedNodes = project.nodes.filter((n) => selectedIds.has(n.id));
    const copiedCrossings = project.crossings.filter((c) => selectedIds.has(c.id));

    const copiedNodeIds = new Set(copiedNodes.map((n) => n.id));
    const copiedEdges = project.edges.filter(
      (e) => selectedIds.has(e.id) || (copiedNodeIds.has(e.fromNodeId) && copiedNodeIds.has(e.toNodeId))
    );

    const copiedStays = project.stays.filter(
      (s) => selectedIds.has(s.id) || copiedNodeIds.has(s.poleId)
    );

    setClipboard({
      nodes: JSON.parse(JSON.stringify(copiedNodes)),
      edges: JSON.parse(JSON.stringify(copiedEdges)),
      stays: JSON.parse(JSON.stringify(copiedStays)),
      crossings: JSON.parse(JSON.stringify(copiedCrossings)),
    });

    showToast(`Copied ${selectedEntities.length} item(s)`);
  }, [selectedEntities, project]);

  // Paste entities from clipboard
  const handlePaste = useCallback(() => {
    if (!clipboard || (clipboard.nodes.length === 0 && clipboard.crossings.length === 0)) return;

    const offset = 40;
    const idMap: { [oldId: string]: string } = {};

    const newNodes = clipboard.nodes.map((node) => {
      const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      idMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        x: node.x + offset,
        y: node.y + offset,
      };
    });

    const newEdges = clipboard.edges
      .filter((e) => idMap[e.fromNodeId] && idMap[e.toNodeId])
      .map((edge) => ({
        ...edge,
        id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        fromNodeId: idMap[edge.fromNodeId],
        toNodeId: idMap[edge.toNodeId],
      }));

    const newStays = clipboard.stays
      .filter((s) => idMap[s.poleId])
      .map((stay) => ({
        ...stay,
        id: `stay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        poleId: idMap[stay.poleId],
      }));

    const newCrossings = clipboard.crossings.map((crossing) => ({
      ...crossing,
      id: `crossing-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      x: crossing.x + offset,
      y: crossing.y + offset,
    }));

    handleUpdateProject({
      ...project,
      nodes: [...project.nodes, ...newNodes],
      edges: [...project.edges, ...newEdges],
      stays: [...project.stays, ...newStays],
      crossings: [...project.crossings, ...newCrossings],
      updatedAt: new Date().toISOString(),
    });

    // Select the newly pasted elements
    const newSelected: SelectedItem[] = [
      ...newNodes.map((n) => ({ type: 'node' as const, id: n.id })),
      ...newCrossings.map((c) => ({ type: 'crossing' as const, id: c.id })),
    ];
    setSelectedEntities(newSelected);
    showToast(`Pasted ${newSelected.length} item(s)`);
  }, [clipboard, project, handleUpdateProject]);

  // Cut
  const handleCut = useCallback(() => {
    handleCopy();
    handleDeleteSelected();
  }, [handleCopy, handleDeleteSelected]);

  // Duplicate selected entities in-place
  const handleDuplicate = useCallback(() => {
    handleCopy();
    setTimeout(() => {
      handlePaste();
    }, 10);
  }, [handleCopy, handlePaste]);

  // Select All entities
  const handleSelectAll = useCallback(() => {
    const allItems: SelectedItem[] = [
      ...project.nodes.map((n) => ({ type: 'node' as const, id: n.id })),
      ...project.edges.map((e) => ({ type: 'edge' as const, id: e.id })),
      ...project.stays.map((s) => ({ type: 'stay' as const, id: s.id })),
      ...project.crossings.map((c) => ({ type: 'crossing' as const, id: c.id })),
    ];
    setSelectedEntities(allItems);
    showToast(`Selected all (${allItems.length}) items`);
  }, [project]);

  // Zoom & Pan: Fit drawing to screen
  const handleFitToScreen = useCallback(() => {
    const allX = [
      ...project.nodes.map((n) => n.x),
      ...project.crossings.map((c) => c.x),
    ];
    const allY = [
      ...project.nodes.map((n) => n.y),
      ...project.crossings.map((c) => c.y),
    ];

    if (allX.length === 0) {
      setZoom(1);
      setPanX(100);
      setPanY(50);
      return;
    }

    const minX = Math.min(...allX) - 80;
    const maxX = Math.max(...allX) + 80;
    const minY = Math.min(...allY) - 80;
    const maxY = Math.max(...allY) + 80;

    const width = maxX - minX;
    const height = maxY - minY;

    const viewportWidth = window.innerWidth - 300; // exclude toolbars
    const viewportHeight = window.innerHeight - 140; // menu bar + ribbon + status bar

    const fitZoom = Math.min(
      Math.max(Math.min(viewportWidth / width, viewportHeight / height), 0.25),
      2.5
    );

    setZoom(fitZoom);
    setPanX((viewportWidth - width * fitZoom) / 2 + 100 - minX * fitZoom);
    setPanY((viewportHeight - height * fitZoom) / 2 + 20 - minY * fitZoom);
    showToast('Fit drawing to viewport');
  }, [project]);

  // Nudge selected items with Arrow keys
  const handleNudge = useCallback(
    (dx: number, dy: number) => {
      if (selectedEntities.length === 0) return;
      const selectedIds = new Set(selectedEntities.map((e) => e.id));

      const updatedNodes = project.nodes.map((n) =>
        selectedIds.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n
      );
      const updatedCrossings = project.crossings.map((c) =>
        selectedIds.has(c.id) ? { ...c, x: c.x + dx, y: c.y + dy } : c
      );

      handleUpdateProject({
        ...project,
        nodes: updatedNodes,
        crossings: updatedCrossings,
        updatedAt: new Date().toISOString(),
      });
    },
    [selectedEntities, project, handleUpdateProject]
  );

  // Save Project to Local Storage Catalog & Active Slot
  const handleSave = () => {
    setIsSaving(true);
    try {
      const res = saveProjectToCatalog(project);
      saveActiveProject(project);
      showToast(res.message || 'Saved to Local Storage (100% Offline)');
    } catch (e) {
      console.error(e);
      showToast('Error saving drawing to local storage');
    } finally {
      setTimeout(() => setIsSaving(false), 350);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea or select
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmd = isMac ? e.metaKey : e.ctrlKey;

      if (cmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (cmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (cmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (cmd && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (cmd && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (cmd && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      } else if (cmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicate();
      } else if (cmd && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        if (isToolDrawerOpen) {
          setIsToolDrawerOpen(false);
          return;
        }
        setSelectedEntities([]);
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('pan');
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('pole_single');
      } else if (e.key.toLowerCase() === 'l') {
        setActiveTool('acsr_3wire');
      } else if (e.key.toLowerCase() === 's' && !cmd) {
        setActiveTool('lt_stay');
      } else if (e.key.toLowerCase() === 'g') {
        setShowGrid((prev) => !prev);
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleMap();
      } else if (e.key.toLowerCase() === 'f') {
        handleFitToScreen();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setIsShortcutsOpen(true);
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(prev * 1.2, 5));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((prev) => Math.max(prev * 0.8, 0.2));
      } else if (e.key === '0') {
        setZoom(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNudge(0, e.shiftKey ? -20 : -5);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNudge(0, e.shiftKey ? 20 : 5);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNudge(e.shiftKey ? -20 : -5, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNudge(e.shiftKey ? 20 : 5, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleSave,
    handleDeleteSelected,
    handleCopy,
    handlePaste,
    handleCut,
    handleDuplicate,
    handleSelectAll,
    handleFitToScreen,
    handleNudge,
    handleToggleMap,
    showGrid,
    showMap,
    isToolDrawerOpen,
  ]);

  // Deep linking, Electron IPC, PWA File Handling & Window Drag-and-Drop for .pld files
  useEffect(() => {
    // 1. Electron Desktop IPC Listeners
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      const unbindOpenFile = api.onOpenPldFile?.((data: { content: string; filePath?: string }) => {
        try {
          const res = parsePldContent(data.content);
          handleLoadProjectWithState(res.project, res.viewport);
          showToast(`Opened: ${res.project.title}`);
        } catch (e: any) {
          showToast(`Failed to open desktop file: ${e?.message || 'Error'}`);
        }
      });
      const unbindSave = api.onTriggerSavePld?.(() => {
        handleSavePldFile();
      });
      const unbindAbout = api.onOpenAboutDeveloper?.(() => {
        setIsAboutDeveloperOpen(true);
      });
      const unbindVersion = api.onOpenAppVersion?.(() => {
        setIsAppVersionOpen(true);
      });

      return () => {
        unbindOpenFile?.();
        unbindSave?.();
        unbindAbout?.();
        unbindVersion?.();
      };
    }

    // 2. Web File Handling API (PWA file association)
    if (typeof window !== 'undefined' && 'launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files || launchParams.files.length === 0) return;
        for (const fileHandle of launchParams.files) {
          try {
            const file = await fileHandle.getFile();
            const res = await readPldFile(file);
            handleLoadProjectWithState(res.project, res.viewport);
            showToast(`Opened: ${res.project.title}`);
          } catch (e: any) {
            showToast(`Failed to open file: ${e?.message || 'Error'}`);
          }
        }
      });
    }

    // 3. Window Drag & Drop for .pld and .json drawing files
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDraggingFileOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDraggingFileOver(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFileOver(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.pld') || file.name.endsWith('.json')) {
          try {
            const res = await readPldFile(file);
            handleLoadProjectWithState(res.project, res.viewport);
            showToast(`Opened: ${res.project.title}`);
          } catch (err: any) {
            showToast(`Could not open dropped file: ${err?.message || 'Error'}`);
          }
        } else {
          showToast('Please drop a .pld or .json PowerLine Drawing file.');
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleLoadProjectWithState, handleSavePldFile]);

  // Handle page size changes while preserving the fixed 1:1 drawing sheet.
  const handleSelectPageSize = useCallback(
    (size: SheetSizeType) => {
      const newBounds = getCanvasBoundsForPageSize(size, project.canvasBounds);
      handleUpdateProject({
        ...project,
        metadata: {
          ...project.metadata,
          sheetSize: size,
        },
        canvasBounds: newBounds,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Page & Canvas Size set to ${PAGE_SIZE_DEFINITIONS[size].label} (1:1 Locked)`);
    },
    [project, handleUpdateProject]
  );

  return (
    <div className="app-theme-light w-full h-dvh min-h-0 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Real-time Update Notification Alert (triggers when update is pushed) */}
      <UpdateNotificationBanner />

      {/* Top CAD Navigation Bar */}
      <TopBar
        project={project}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        selectedEntities={selectedEntities}
        roadLineStyle={roadLineStyle}
        roadWidth={roadWidth}
        onRoadLineStyleChange={setRoadLineStyle}
        onRoadWidthChange={setRoadWidth}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onCut={handleCut}
        onDuplicate={handleDuplicate}
        onSelectAll={handleSelectAll}
        onDeleteSelected={handleDeleteSelected}
        hasSelection={selectedEntities.length > 0}
        onFitToScreen={handleFitToScreen}
        onZoomIn={() => setZoom((prev) => Math.min(prev * 1.2, 5))}
        onZoomOut={() => setZoom((prev) => Math.max(prev * 0.8, 0.2))}
        onResetZoom={() => {
          setZoom(1);
          setPanX(100);
          setPanY(50);
        }}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        gridType={gridType}
        onToggleGridType={() => setGridType((prev) => (prev === 'dots' ? 'lines' : 'dots'))}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        isDarkCanvas={isDarkCanvas}
        onToggleDarkCanvas={() => setIsDarkCanvas(!isDarkCanvas)}
        showMap={showMap}
        onToggleMap={handleToggleMap}
        mapOpacity={mapOpacity}
        onMapOpacityChange={handleMapOpacityChange}
        mapFeatures={mapFeatures}
        onMapFeatureChange={handleMapFeatureChange}
        availableMapRoads={availableMapRoads}
        selectedMapRoadIds={selectedMapRoads.map((road) => road.id)}
        onToggleMapRoadSelection={handleToggleMapRoadSelection}
        onAddSelectedMapRoads={handleAddSelectedMapRoads}
        mapLocked={mapLocked}
        onToggleMapLock={handleToggleMapLock}
        mapLayerPosition={mapLayerPosition}
        onToggleMapLayerPosition={handleToggleMapLayerPosition}
        printIncludeMap={printIncludeMap}
        printMapOpacity={printMapOpacity}
        onPrintMapOpacityChange={handlePrintMapOpacityChange}
        onTogglePrintMap={() => handlePrintIncludeMapChange(!printIncludeMap)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onCreateDrawing={handleOpenNewDrawingPrompt}
        onOpenProjectSetup={() => setIsProjectSetupOpen(true)}
        onOpenTitleBlock={() => setIsTitleBlockOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenOutputSettings={() => {
          setIsExportOpen(true);
          setOpenOutputSettings(true);
        }}
        onOpenCustomToolModal={() => setIsCustomToolModalOpen(true)}
        onOpenToolDrawer={() => setIsToolDrawerOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onSave={handleSave}
        isSaving={isSaving}
        onSavePld={handleSavePldFile}
        onOpenPld={handleOpenPldFile}
        onOpenAboutDeveloper={() => setIsAboutDeveloperOpen(true)}
        onOpenAppVersion={() => setIsAppVersionOpen(true)}
        onOpenSavedProjects={() => setIsSavedProjectsOpen(true)}
        savedProjectsCount={getSavedProjectsCatalog().length}
        onSelectPageSize={handleSelectPageSize}
      />

      {/* Main Workspace Area (Left Toolbox + Center Drawing Canvas + Right Panels) */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Desktop CAD Tool Palette */}
        <div className="hidden h-full shrink-0 lg:flex">
          <LeftToolbox
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            customTools={project.customTools || []}
            onOpenCustomToolModal={() => setIsCustomToolModalOpen(true)}
          />
        </div>

        {/* Mobile / tablet CAD Tool Drawer */}
        {isToolDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              onClick={() => setIsToolDrawerOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-[1px]"
              aria-label="Close CAD tools"
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="CAD tools"
              className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] max-w-full flex-col bg-white shadow-2xl animate-in slide-in-from-left"
            >
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Wrench className="h-4 w-4 text-red-600" />
                  CAD Tools
                </div>
                <button
                  type="button"
                  onClick={() => setIsToolDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close CAD tools"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <LeftToolbox
                  variant="drawer"
                  activeTool={activeTool}
                  onSelectTool={(tool) => {
                    setActiveTool(tool);
                    setIsToolDrawerOpen(false);
                  }}
                  customTools={project.customTools || []}
                  onOpenCustomToolModal={() => {
                    setIsToolDrawerOpen(false);
                    setIsCustomToolModalOpen(true);
                  }}
                />
              </div>
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Center SVG CAD Canvas & Flexible Map */}
          <main className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
            <DrawingCanvas
              project={project}
              activeTool={activeTool}
              roadLineStyle={roadLineStyle}
              roadWidth={roadWidth}
              onRoadLineStyleChange={setRoadLineStyle}
              onRoadWidthChange={setRoadWidth}
              showGrid={showGrid}
              snapEnabled={snapEnabled}
              gridType={gridType}
              isDarkCanvas={isDarkCanvas}
              selectedEntities={selectedEntities}
              onSelectEntities={setSelectedEntities}
              onUpdateProject={handleUpdateProject}
              showMap={showMap}
              mapOpacity={mapOpacity}
              mapLocked={mapLocked}
              mapFeatures={mapFeatures}
              onRoadFeaturesChange={setAvailableMapRoads}
              mapLayerPosition={mapLayerPosition}
              onMapOpacityChange={handleMapOpacityChange}
              onToggleMap={handleToggleMap}
              onToggleMapLock={handleToggleMapLock}
              onMapCenterChange={(lat, lng) => {
                const location = project.geoLocation;
                handleUpdateProject({
                  ...project,
                  geoLocation: {
                    name: location?.name ?? project.metadata.location ?? 'Map center',
                    lat,
                    lng,
                    district: location?.district,
                    state: location?.state,
                    description: location?.description,
                    category: location?.category,
                  },
                  mapSettings: {
                    visible: showMap,
                    opacity: mapOpacity,
                    mapType: 'osm',
                    zoomLevel: project.mapSettings?.zoomLevel ?? 16,
                    scale: project.mapSettings?.scale ?? 1,
                    sizeMode: project.mapSettings?.sizeMode ?? 'canvas_fit',
                    isLocked: mapLocked,
                    layerPosition: mapLayerPosition,
                    printIncludeMap,
                    printMapOpacity,
                    features: mapFeatures,
                    pinnedPlaces: project.mapSettings?.pinnedPlaces,
                    activePlace: project.mapSettings?.activePlace ?? null,
                  },
                }, false);
              }}
              onSelectLocation={(loc) => {
                handleUpdateProject({
                  ...project,
                  metadata: {
                    ...project.metadata,
                    location: loc.name,
                  },
                  geoLocation: loc,
                });
                showToast(`Navigated to: ${loc.name}`);
              }}
              onCursorMove={(x, y) => setCursorCoords({ x, y })}
              zoom={zoom}
              panX={panX}
              panY={panY}
              onZoomChange={setZoom}
              onPanChange={(x, y) => {
                setPanX(x);
                setPanY(y);
              }}
              onSelectTool={setActiveTool}
            />
          </main>

          <PropertyInspector
            selectedEntities={selectedEntities}
            project={project}
            onUpdateProject={handleUpdateProject}
            onClose={() => setSelectedEntities([])}
          />

          <BoqPanel
            project={project}
            onUpdateOverrides={(overrides) =>
              handleUpdateProject({ ...project, customBoqOverrides: overrides })
            }
            isOpen={isBoqOpen}
            onToggleOpen={() => setIsBoqOpen(!isBoqOpen)}
          />
        </div>
      </div>

      {/* Bottom CAD Status Bar */}
      <StatusBar
        cursorX={cursorCoords.x}
        cursorY={cursorCoords.y}
        activeTool={activeTool}
        zoom={zoom}
        nodeCount={project.nodes.length}
        edgeCount={project.edges.length}
        stayCount={project.stays.length}
        selectedCount={selectedEntities.length}
        snapEnabled={snapEnabled}
        onResetZoom={() => {
          setZoom(1);
          setPanX(100);
          setPanY(50);
        }}
      />

      {/* New Drawing Prompt Modal (Save / Discard / Delete previous drawing) */}
      <NewDrawingModal
        isOpen={isNewDrawingPromptOpen}
        currentProject={project}
        onSaveAndCreate={handleSaveAndCreateNew}
        onDiscardAndCreate={handleDiscardAndCreateNew}
        onDeleteAndCreate={handleDeleteAndCreateNew}
        onClose={() => setIsNewDrawingPromptOpen(false)}
      />

      {/* Local Storage Saved Projects & Blueprints Manager Modal */}
      <SavedProjectsModal
        isOpen={isSavedProjectsOpen}
        activeProjectId={project.id}
        onOpenProject={(selected) => {
          setProject(selected);
          saveActiveProject(selected);
          setHistory([selected]);
          setHistoryIndex(0);
          setSelectedEntities([]);
          showToast(`Loaded: ${selected.title}`);
        }}
        onCreateNewDrawing={handleOpenNewDrawingPrompt}
        onClose={() => setIsSavedProjectsOpen(false)}
      />

      {/* User-saved Drawing Templates */}
      <TemplatePickerModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        templates={getSavedTemplates()}
        onSelectProject={handleLoadTemplate}
        onDeleteTemplate={(templateId) => {
          const result = deleteSavedTemplate(templateId);
          showToast(result.message);
          return result.success;
        }}
        onCreateNewDrawing={handleOpenNewDrawingPrompt}
      />

      {/* Project Setup & Configuration Modal */}
      <ProjectSetupModal
        isOpen={isProjectSetupOpen}
        metadata={project.metadata}
        onSave={(updatedMeta: ProjectMetadata) => {
          const newBounds = getCanvasBoundsForPageSize(updatedMeta.sheetSize || 'A4', project.canvasBounds);
          handleUpdateProject({
            ...project,
            title: updatedMeta.title || project.title,
            metadata: updatedMeta,
            canvasBounds: newBounds,
            updatedAt: new Date().toISOString(),
          });
          showToast(`Project Setup saved: ${PAGE_SIZE_DEFINITIONS[updatedMeta.sheetSize || 'A4'].label} (1:1 Locked)`);
        }}
        onClose={() => setIsProjectSetupOpen(false)}
      />

      {/* Engineering Title Block Editor Modal */}
      <TitleBlockModal
        isOpen={isTitleBlockOpen}
        metadata={project.metadata}
        onSave={(updatedMeta: ProjectMetadata) => {
          handleUpdateProject({
            ...project,
            metadata: updatedMeta,
            updatedAt: new Date().toISOString(),
          });
          showToast('Updated Title Block information');
        }}
        onClose={() => setIsTitleBlockOpen(false)}
      />

      {/* A4 Landscape PDF Export & Print Modal */}
      <ExportModal
        isOpen={isExportOpen}
        openSettings={openOutputSettings}
        project={project}
        mapFeatures={mapFeatures}
        showMap={showMap}
        mapOpacity={mapOpacity}
        mapLayerPosition={mapLayerPosition}
        printIncludeMap={printIncludeMap}
        printMapOpacity={printMapOpacity}
        onPrintMapOpacityChange={handlePrintMapOpacityChange}
        onMapVisibilityChange={handleMapVisibilityChange}
        onPrintIncludeMapChange={handlePrintIncludeMapChange}
        onClose={() => {
          setIsExportOpen(false);
          setOpenOutputSettings(false);
        }}
      />

      {/* Custom Tool Creator Modal */}
      <CustomToolModal
        isOpen={isCustomToolModalOpen}
        onAddCustomTool={handleAddCustomTool}
        onClose={() => setIsCustomToolModalOpen(false)}
      />

      {/* CAD Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* About Developer Modal */}
      <AboutDeveloperModal
        isOpen={isAboutDeveloperOpen}
        onClose={() => setIsAboutDeveloperOpen(false)}
        onOpenVersionModal={() => setIsAppVersionOpen(true)}
      />

      {/* App Version & Cross-Platform Installers Modal */}
      <AppVersionModal
        isOpen={isAppVersionOpen}
        onClose={() => setIsAppVersionOpen(false)}
        onOpenAboutDeveloper={() => setIsAboutDeveloperOpen(true)}
      />

      {/* Drag & Drop Overlay for .PLD and .JSON Drawing Files */}
      {isDraggingFileOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md border-4 border-dashed border-red-500 m-4 rounded-3xl pointer-events-none animate-in fade-in duration-150">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-white shadow-2xl shadow-red-950 mb-3 animate-bounce">
            <FolderOpen className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Drop .PLD Drawing Here</h2>
          <p className="mt-1 text-sm text-slate-300">
            Release to open and restore drawing state automatically
          </p>
          <span className="mt-3 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 font-mono text-xs text-red-300">
            Supports *.pld &amp; *.json files
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white border border-slate-700 px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
