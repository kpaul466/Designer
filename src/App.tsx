/**
 * PowerLine Designer — Main Application Component
 * 100% Client-Side Offline CAD Architecture:
 * - LocalStorage Persistence & Multi-Drawing Project Catalog (Open, Save, Duplicate, Delete, Import/Export JSON)
 * - GIS Map Underlay & Overlay (Satellite, OpenStreetMap, Road Map, Topo Terrain)
 * - Flexible Canvas Sheet Placement on Map (Resizable bounds, Drag anywhere on map, Snap to searched location)
 * - Precision CAD Vector Engine & Full Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+C, Ctrl+V, Del, etc.)
 * - Automated Electrical Bill of Quantities (BOQ) Schedule with Schedule of Rates (SOR)
 * - Engineering Title Block & ISO 216 A4 Landscape PDF Export
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActiveTool,
  CustomToolDefinition,
  DrawingProject,
  ProjectMetadata,
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
import {
  loadActiveProject,
  saveActiveProject,
  saveProjectToCatalog,
  getSavedProjectsCatalog,
} from './services/localStorageService';

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

  // GIS Map Layer
  const [showMap, setShowMap] = useState<boolean>(false);
  const [mapOpacity, setMapOpacity] = useState<number>(55);
  const [mapType, setMapType] = useState<'satellite' | 'roadmap' | 'terrain' | 'osm'>('roadmap');
  const [mapLocked, setMapLocked] = useState<boolean>(true);
  const [mapLayerPosition, setMapLayerPosition] = useState<'underlay' | 'overlay'>('underlay');

  // Modals & Panels
  const [isBoqOpen, setIsBoqOpen] = useState<boolean>(true);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isProjectSetupOpen, setIsProjectSetupOpen] = useState<boolean>(false);
  const [isTitleBlockOpen, setIsTitleBlockOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isCustomToolModalOpen, setIsCustomToolModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isSavedProjectsOpen, setIsSavedProjectsOpen] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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

    handleUpdateProject({
      ...project,
      nodes: updatedNodes,
      edges: updatedEdges,
      stays: updatedStays,
      crossings: updatedCrossings,
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
    const viewportHeight = window.innerHeight - 100;

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
        setShowMap((prev) => !prev);
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
    showGrid,
    showMap,
  ]);

  // Handle Page Size Change (Locks canvasBounds and map size 1:1)
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
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top CAD Navigation Bar */}
      <TopBar
        project={project}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDeleteSelected={handleDeleteSelected}
        hasSelection={selectedEntities.length > 0}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        gridType={gridType}
        onToggleGridType={() => setGridType((prev) => (prev === 'dots' ? 'lines' : 'dots'))}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        isDarkCanvas={isDarkCanvas}
        onToggleDarkCanvas={() => setIsDarkCanvas(!isDarkCanvas)}
        showMap={showMap}
        onToggleMap={() => setShowMap(!showMap)}
        mapOpacity={mapOpacity}
        onMapOpacityChange={setMapOpacity}
        mapType={mapType}
        onMapTypeChange={setMapType}
        mapLayerPosition={mapLayerPosition}
        onToggleMapLayerPosition={() =>
          setMapLayerPosition((prev) => (prev === 'underlay' ? 'overlay' : 'underlay'))
        }
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenProjectSetup={() => setIsProjectSetupOpen(true)}
        onOpenTitleBlock={() => setIsTitleBlockOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onSave={handleSave}
        isSaving={isSaving}
        onOpenSavedProjects={() => setIsSavedProjectsOpen(true)}
        savedProjectsCount={getSavedProjectsCatalog().length}
        onSelectPageSize={handleSelectPageSize}
      />

      {/* Main Workspace Area (Left Toolbox + Center Drawing Canvas + Right Property Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left CAD Tool Palette */}
        <LeftToolbox
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          customTools={project.customTools || []}
          onOpenCustomToolModal={() => setIsCustomToolModalOpen(true)}
        />

        {/* Center SVG CAD Canvas & Flexible Map */}
        <main className="flex-1 h-full relative overflow-hidden">
          <DrawingCanvas
            project={project}
            activeTool={activeTool}
            showGrid={showGrid}
            snapEnabled={snapEnabled}
            gridType={gridType}
            isDarkCanvas={isDarkCanvas}
            selectedEntities={selectedEntities}
            onSelectEntities={setSelectedEntities}
            onUpdateProject={handleUpdateProject}
            showMap={showMap}
            mapOpacity={mapOpacity}
            mapType={mapType}
            mapLocked={mapLocked}
            mapLayerPosition={mapLayerPosition}
            onMapTypeChange={setMapType}
            onMapOpacityChange={setMapOpacity}
            onToggleMap={() => setShowMap(!showMap)}
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

          {/* Floating BOQ Schedule Table */}
          <BoqPanel
            project={project}
            onUpdateOverrides={(overrides) =>
              handleUpdateProject({ ...project, customBoqOverrides: overrides })
            }
            isOpen={isBoqOpen}
            onToggleOpen={() => setIsBoqOpen(!isBoqOpen)}
          />
        </main>

        {/* Right Property Inspector Dock */}
        <PropertyInspector
          selectedEntities={selectedEntities}
          project={project}
          onUpdateProject={handleUpdateProject}
          onClose={() => setSelectedEntities([])}
        />
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
        onClose={() => setIsSavedProjectsOpen(false)}
      />

      {/* Template & Sample Blueprint Picker Modal */}
      <TemplatePickerModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectProject={(selected) => {
          setProject(selected);
          saveActiveProject(selected);
          setHistory([selected]);
          setHistoryIndex(0);
          setSelectedEntities([]);
          showToast(`Template loaded: ${selected.title}`);
        }}
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
        project={project}
        onClose={() => setIsExportOpen(false)}
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
